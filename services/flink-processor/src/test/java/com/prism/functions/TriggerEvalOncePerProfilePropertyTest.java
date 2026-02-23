package com.prism.functions;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prism.config.AppConfig;
import com.prism.dsl.AviatorDslEngine;
import com.prism.dsl.DslEngine;
import com.prism.models.*;
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

import static org.junit.jupiter.api.Assertions.*;

// Feature: flink-processor, Property 17: once_per_profile frequency fires at most once
// **Validates: Requirements 14.2, 14.3**
class TriggerEvalOncePerProfilePropertyTest {

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
     * Property 17: once_per_profile frequency fires at most once.
     *
     * For any TriggerRule with frequency ONCE_PER_PROFILE and any sequence of N
     * matching events (N >= 1) for the same profile, the trigger SHALL fire exactly
     * once (on the first matching event) and skip all subsequent matches.
     *
     * Validates: Requirements 14.2, 14.3
     */
    @Property(tries = 100)
    void oncePerProfileFrequencyFiresAtMostOnce(
            @ForAll("oncePerProfileTestCases") OncePerProfileTestCase testCase) throws Exception {

        AviatorDslEngine dslEngine = new AviatorDslEngine();
        dslEngine.init();

        AppConfig config = new AppConfig();
        String baseUrl = server.url("/").toString().replaceAll("/$", "");
        config.setBackendApiUrl(baseUrl);

        // Configure dispatcher to always return the rule for every request
        List<TriggerRule> rules = List.of(testCase.rule);
        server.setDispatcher(new Dispatcher() {
            @Override
            public MockResponse dispatch(RecordedRequest request) {
                String path = request.getPath();
                if (path != null && path.contains("/trigger-rules")) {
                    try {
                        return new MockResponse()
                                .setBody(mapper.writeValueAsString(rules))
                                .addHeader("Content-Type", "application/json");
                    } catch (Exception e) {
                        return new MockResponse().setResponseCode(500);
                    }
                }
                return new MockResponse().setResponseCode(404);
            }
        });

        TriggerEvalFunction function = new TriggerEvalFunction(dslEngine, config);
        KeyedOneInputStreamOperatorTestHarness<String, EnrichedEvent, TriggerOutput> harness =
                new KeyedOneInputStreamOperatorTestHarness<>(
                        new KeyedProcessOperator<>(function),
                        EnrichedEvent::getProfileId,
                        Types.STRING
                );

        try {
            harness.open();

            // Process all N events through the harness
            for (EnrichedEvent event : testCase.events) {
                harness.processElement(new StreamRecord<>(event));
            }

            // Extract main outputs
            List<TriggerOutput> outputs = new ArrayList<>();
            for (Object record : harness.getOutput()) {
                if (record instanceof StreamRecord) {
                    @SuppressWarnings("unchecked")
                    StreamRecord<TriggerOutput> sr = (StreamRecord<TriggerOutput>) record;
                    outputs.add(sr.getValue());
                }
            }

            int n = testCase.events.size();

            // With ONCE_PER_PROFILE frequency, exactly 1 output regardless of N events
            assertEquals(1, outputs.size(),
                    "ONCE_PER_PROFILE trigger should fire exactly once for " + n +
                    " matching events, actual=" + outputs.size());

            // Verify the single output corresponds to the first event
            TriggerOutput output = outputs.get(0);
            EnrichedEvent firstEvent = testCase.events.get(0);

            assertEquals(testCase.rule.getRuleId(), output.getRuleId(),
                    "Output rule_id should match the trigger rule");
            assertEquals(firstEvent.getEvent().getEventId(), output.getEventId(),
                    "Output event_id should match the first event");
            assertEquals(firstEvent.getEvent().getProfileId(), output.getProfileId(),
                    "Output profile_id should match the profile");
            assertEquals(firstEvent.getEvent().getProjectId(), output.getProjectId(),
                    "Output project_id should match the project");
            assertTrue(output.getTriggeredAt() > 0,
                    "triggered_at should be positive");
        } finally {
            harness.close();
        }
    }

    static class OncePerProfileTestCase {
        final TriggerRule rule;
        final List<EnrichedEvent> events;

        OncePerProfileTestCase(TriggerRule rule, List<EnrichedEvent> events) {
            this.rule = rule;
            this.events = events;
        }

        @Override
        public String toString() {
            return "OncePerProfileTestCase{ruleId=" + rule.getRuleId()
                    + ", eventCount=" + events.size() + "}";
        }
    }

    @Provide
    Arbitrary<OncePerProfileTestCase> oncePerProfileTestCases() {
        Arbitrary<String> ruleIds = Arbitraries.strings()
                .alpha().numeric().ofMinLength(3).ofMaxLength(10)
                .map(s -> "rule_" + s.toLowerCase());

        Arbitrary<String> profileIds = Arbitraries.strings()
                .alpha().numeric().ofMinLength(3).ofMaxLength(10)
                .map(s -> "user_" + s.toLowerCase());

        Arbitrary<String> projectIds = Arbitraries.strings()
                .alpha().numeric().ofMinLength(3).ofMaxLength(10)
                .map(s -> "proj_" + s.toLowerCase());

        // N between 2 and 10 — need at least 2 events to verify "skip subsequent"
        Arbitrary<Integer> eventCounts = Arbitraries.integers().between(2, 10);

        return Combinators.combine(ruleIds, profileIds, projectIds, eventCounts)
                .as((ruleId, profileId, projectId, n) -> {
                    // Build rule with ONCE_PER_PROFILE frequency and 1 enabled action
                    TriggerRule rule = new TriggerRule();
                    rule.setRuleId(ruleId);
                    rule.setProjectId(projectId);
                    rule.setName("OncePerProfile Rule " + ruleId);
                    rule.setStatus("active");
                    rule.setFrequency(TriggerFrequency.ONCE_PER_PROFILE);
                    rule.setActions(List.of(
                            new TriggerAction("webhook", true, null, null, null, "{\"fired\": true}")
                    ));
                    // No constraints, no DSL, no timeframe — always matches

                    // Build N matching events for the same profile
                    List<EnrichedEvent> events = new ArrayList<>();
                    ProfileState profile = new ProfileState(
                            profileId, projectId,
                            System.currentTimeMillis(), System.currentTimeMillis(),
                            new HashMap<>()
                    );
                    for (int i = 0; i < n; i++) {
                        PrismEvent event = new PrismEvent(
                                "evt_" + UUID.randomUUID().toString().substring(0, 8),
                                projectId,
                                "test_event",
                                System.currentTimeMillis(),
                                System.currentTimeMillis(),
                                profileId,
                                new HashMap<>(),
                                new HashMap<>()
                        );
                        events.add(new EnrichedEvent(event, profile));
                    }

                    return new OncePerProfileTestCase(rule, events);
                });
    }
}
