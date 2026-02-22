package com.prism.functions;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prism.config.AppConfig;
import com.prism.dsl.MockDslEngine;
import com.prism.models.AttributeDefinition;
import com.prism.models.EnrichedEvent;
import com.prism.models.PrismEvent;
import com.prism.models.ProfileState;
import net.jqwik.api.*;
import net.jqwik.api.lifecycle.AfterProperty;
import net.jqwik.api.lifecycle.BeforeProperty;
import okhttp3.mockwebserver.Dispatcher;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.apache.flink.api.common.typeinfo.Types;
import org.apache.flink.streaming.api.operators.KeyedProcessOperator;
import org.apache.flink.streaming.runtime.streamrecord.StreamRecord;
import org.apache.flink.streaming.util.KeyedOneInputStreamOperatorTestHarness;

import java.util.*;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

// Feature: flink-processor, Property 5: Computed attributes applied to event and profile
// Validates: Requirements 4.1, 4.2, 5.1, 5.2
class ComputedAttributePropertyTest {

    private MockWebServer server;
    private final ObjectMapper mapper = new ObjectMapper();

    @BeforeProperty
    void setUp() throws Exception {
        server = new MockWebServer();
        server.start();
    }

    @AfterProperty
    void tearDown() throws Exception {
        if (server != null) {
            server.shutdown();
        }
    }

    /**
     * For any event with computed attribute definitions where the DslEngine returns
     * successful results, the output event's props SHALL contain all event-level
     * computed attributes, and the ProfileState props SHALL contain all profile-level
     * computed attributes with the values returned by the DslEngine.
     *
     * Validates: Requirements 4.1, 4.2, 5.1, 5.2
     */
    @Property(tries = 100)
    void computedAttributesAppliedToEventAndProfile(
            @ForAll("attributeSets") AttributeTestCase testCase) throws Exception {

        String projectId = testCase.projectId;
        List<AttributeDefinition> allAttrs = testCase.allAttributes;
        Map<String, Object> formulaResults = testCase.formulaResults;

        // Configure MockWebServer to serve attribute definitions
        server.setDispatcher(new Dispatcher() {
            @Override
            public MockResponse dispatch(RecordedRequest request) {
                String path = request.getPath();
                String prefix = "/api/v1/config/projects/";
                String suffix = "/attributes";
                if (path != null && path.startsWith(prefix) && path.endsWith(suffix)) {
                    try {
                        return new MockResponse()
                                .setBody(mapper.writeValueAsString(allAttrs))
                                .addHeader("Content-Type", "application/json");
                    } catch (Exception e) {
                        return new MockResponse().setResponseCode(500);
                    }
                }
                return new MockResponse().setResponseCode(404);
            }
        });

        // Configure MockDslEngine with expected results for each formula
        MockDslEngine mockDslEngine = new MockDslEngine();
        for (Map.Entry<String, Object> entry : formulaResults.entrySet()) {
            mockDslEngine.setResult(entry.getKey(), entry.getValue());
        }

        // Set up AppConfig pointing at MockWebServer
        AppConfig config = new AppConfig();
        String baseUrl = server.url("/").toString().replaceAll("/$", "");
        config.setBackendApiUrl(baseUrl);

        // Create Flink harness
        ComputedAttributeFunction function = new ComputedAttributeFunction(mockDslEngine, config);
        KeyedOneInputStreamOperatorTestHarness<String, EnrichedEvent, EnrichedEvent> harness =
                new KeyedOneInputStreamOperatorTestHarness<>(
                        new KeyedProcessOperator<>(function),
                        EnrichedEvent::getProfileId,
                        Types.STRING
                );

        try {
            harness.open();

            // Create an enriched event
            String profileId = "profile_" + testCase.profileSuffix;
            PrismEvent event = new PrismEvent(
                    "evt_" + System.nanoTime(),
                    projectId,
                    "test_event",
                    System.currentTimeMillis(),
                    System.currentTimeMillis(),
                    profileId,
                    new HashMap<>(),
                    new HashMap<>()
            );
            ProfileState profile = new ProfileState(
                    profileId, projectId,
                    System.currentTimeMillis(), System.currentTimeMillis(),
                    new HashMap<>()
            );
            EnrichedEvent enriched = new EnrichedEvent(event, profile);

            harness.processElement(new StreamRecord<>(enriched));

            // Extract output
            List<EnrichedEvent> output = new ArrayList<>();
            for (Object record : harness.getOutput()) {
                if (record instanceof StreamRecord) {
                    @SuppressWarnings("unchecked")
                    StreamRecord<EnrichedEvent> sr = (StreamRecord<EnrichedEvent>) record;
                    output.add(sr.getValue());
                }
            }

            assertEquals(1, output.size(), "Should emit exactly one enriched event");
            EnrichedEvent result = output.get(0);

            // Verify event-level computed attributes are in event props
            List<AttributeDefinition> eventAttrs = allAttrs.stream()
                    .filter(AttributeDefinition::isEventComputed)
                    .toList();
            for (AttributeDefinition attr : eventAttrs) {
                Object expectedValue = formulaResults.get(attr.getFormula());
                assertTrue(result.getEvent().getProps().containsKey(attr.getName()),
                        "Event props should contain computed attribute: " + attr.getName());
                assertEquals(expectedValue, result.getEvent().getProps().get(attr.getName()),
                        "Event computed attribute '" + attr.getName()
                                + "' should have value from DslEngine");
            }

            // Verify profile-level computed attributes are in profile props
            List<AttributeDefinition> profileAttrs = allAttrs.stream()
                    .filter(AttributeDefinition::isProfileComputed)
                    .toList();
            for (AttributeDefinition attr : profileAttrs) {
                Object expectedValue = formulaResults.get(attr.getFormula());
                assertTrue(result.getProfile().getProps().containsKey(attr.getName()),
                        "Profile props should contain computed attribute: " + attr.getName());
                assertEquals(expectedValue, result.getProfile().getProps().get(attr.getName()),
                        "Profile computed attribute '" + attr.getName()
                                + "' should have value from DslEngine");
            }

        } finally {
            harness.close();
        }
    }

    /**
     * Test case record bundling all generated data for a single property run.
     */
    static class AttributeTestCase {
        final String projectId;
        final String profileSuffix;
        final List<AttributeDefinition> allAttributes;
        final Map<String, Object> formulaResults;

        AttributeTestCase(String projectId, String profileSuffix,
                          List<AttributeDefinition> allAttributes,
                          Map<String, Object> formulaResults) {
            this.projectId = projectId;
            this.profileSuffix = profileSuffix;
            this.allAttributes = allAttributes;
            this.formulaResults = formulaResults;
        }

        @Override
        public String toString() {
            long eventCount = allAttributes.stream()
                    .filter(AttributeDefinition::isEventComputed).count();
            long profileCount = allAttributes.stream()
                    .filter(AttributeDefinition::isProfileComputed).count();
            return "AttributeTestCase{project=" + projectId
                    + ", eventAttrs=" + eventCount
                    + ", profileAttrs=" + profileCount + "}";
        }
    }

    @Provide
    Arbitrary<AttributeTestCase> attributeSets() {
        Arbitrary<String> projectIds = Arbitraries.strings()
                .alpha().ofMinLength(3).ofMaxLength(10)
                .map(s -> "proj_" + s.toLowerCase());

        Arbitrary<String> profileSuffixes = Arbitraries.strings()
                .alpha().numeric().ofMinLength(3).ofMaxLength(10);

        return Combinators.combine(projectIds, profileSuffixes)
                .flatAs((projectId, profileSuffix) ->
                        attributeListWithResults().map(pair ->
                                new AttributeTestCase(projectId, profileSuffix,
                                        pair.first(), pair.second())
                        )
                );
    }

    /**
     * Generate a list of computed attribute definitions (mix of event and profile)
     * along with a map of formula -> expected result value.
     * Each attribute gets a unique formula and a unique name.
     */
    private Arbitrary<Pair<List<AttributeDefinition>, Map<String, Object>>> attributeListWithResults() {
        // Generate 1-6 event computed attrs and 1-6 profile computed attrs
        return Combinators.combine(
                Arbitraries.integers().between(1, 6),
                Arbitraries.integers().between(1, 6)
        ).flatAs((eventCount, profileCount) -> {
            int total = eventCount + profileCount;
            // Generate unique attribute names
            Arbitrary<List<String>> namesArb = Arbitraries.strings()
                    .alpha().ofMinLength(3).ofMaxLength(12)
                    .map(String::toLowerCase)
                    .list().ofSize(total).uniqueElements();

            // Generate result values for each formula
            Arbitrary<List<Object>> valuesArb = resultValues()
                    .list().ofSize(total);

            return Combinators.combine(namesArb, valuesArb).as((names, values) -> {
                List<AttributeDefinition> attrs = new ArrayList<>();
                Map<String, Object> formulaResults = new HashMap<>();

                for (int i = 0; i < total; i++) {
                    String name = names.get(i);
                    String entityType = i < eventCount ? "event" : "profile";
                    String formula = entityType + "_formula_" + name;
                    Object value = values.get(i);

                    attrs.add(new AttributeDefinition(
                            name, "string", entityType,
                            false, true, formula
                    ));
                    formulaResults.put(formula, value);
                }

                return new Pair<>(attrs, formulaResults);
            });
        });
    }

    private Arbitrary<Object> resultValues() {
        return Arbitraries.oneOf(
                Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(20).map(s -> (Object) s),
                Arbitraries.integers().between(-10000, 10000).map(i -> (Object) i),
                Arbitraries.doubles().between(-1000.0, 1000.0)
                        .filter(d -> !d.isNaN() && !d.isInfinite())
                        .map(d -> (Object) d),
                Arbitraries.of(true, false).map(b -> (Object) b)
        );
    }

    /** Simple pair record for bundling two values. */
    record Pair<A, B>(A first, B second) {}
}
