package com.prism.functions;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prism.config.AppConfig;
import com.prism.dsl.MockDslEngine;
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
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

// Feature: flink-processor, Property 12: Action invocation emits correct trigger outputs
// **Validates: Requirements 11.1, 11.2**
class TriggerEvalActionPropertyTest {

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
     * Property 12: Action invocation emits correct trigger outputs.
     *
     * For any TriggerRule with N enabled actions that matches an event,
     * the TriggerEvalFunction SHALL emit exactly N TriggerOutput records,
     * each containing the correct rule_id, event_id, profile_id, project_id,
     * action type, and a rendered payload.
     *
     * Validates: Requirements 11.1, 11.2
     */
    @Property(tries = 100)
    void actionInvocationEmitsCorrectTriggerOutputs(
            @ForAll("triggerTestCases") TriggerTestCase testCase) throws Exception {

        MockDslEngine mockDslEngine = new MockDslEngine();
        // MockDslEngine defaults to returning true for unconfigured formulas,
        // so DSL expressions will pass by default.

        AppConfig config = new AppConfig();
        String baseUrl = server.url("/").toString().replaceAll("/$", "");
        config.setBackendApiUrl(baseUrl);

        // Configure MockWebServer to serve the generated rule
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

        TriggerEvalFunction function = new TriggerEvalFunction(mockDslEngine, config);
        KeyedOneInputStreamOperatorTestHarness<String, EnrichedEvent, TriggerOutput> harness =
                new KeyedOneInputStreamOperatorTestHarness<>(
                        new KeyedProcessOperator<>(function),
                        EnrichedEvent::getProfileId,
                        Types.STRING
                );

        try {
            harness.open();
            harness.processElement(new StreamRecord<>(testCase.enrichedEvent));

            // Extract main outputs
            List<TriggerOutput> outputs = new ArrayList<>();
            for (Object record : harness.getOutput()) {
                if (record instanceof StreamRecord) {
                    @SuppressWarnings("unchecked")
                    StreamRecord<TriggerOutput> sr = (StreamRecord<TriggerOutput>) record;
                    outputs.add(sr.getValue());
                }
            }

            // Count enabled actions
            List<TriggerAction> enabledActions = testCase.rule.getEnabledActions();
            int expectedCount = enabledActions.size();

            assertEquals(expectedCount, outputs.size(),
                    "Should emit exactly N outputs for N enabled actions. " +
                    "Total actions=" + testCase.rule.getActions().size() +
                    ", enabled=" + expectedCount);

            // Verify each output has correct fields
            PrismEvent event = testCase.enrichedEvent.getEvent();
            String expectedRuleId = testCase.rule.getRuleId();
            String expectedEventId = event.getEventId();
            String expectedProfileId = event.getProfileId();
            String expectedProjectId = event.getProjectId();

            for (int i = 0; i < outputs.size(); i++) {
                TriggerOutput output = outputs.get(i);
                TriggerAction expectedAction = enabledActions.get(i);

                assertEquals(expectedRuleId, output.getRuleId(),
                        "Output[" + i + "] rule_id mismatch");
                assertEquals(expectedEventId, output.getEventId(),
                        "Output[" + i + "] event_id mismatch");
                assertEquals(expectedProfileId, output.getProfileId(),
                        "Output[" + i + "] profile_id mismatch");
                assertEquals(expectedProjectId, output.getProjectId(),
                        "Output[" + i + "] project_id mismatch");
                assertEquals(expectedAction.getType(), output.getActionType(),
                        "Output[" + i + "] action_type mismatch");
                assertNotNull(output.getRenderedPayload(),
                        "Output[" + i + "] rendered_payload should not be null");
                assertTrue(output.getTriggeredAt() > 0,
                        "Output[" + i + "] triggered_at should be positive");
            }
        } finally {
            harness.close();
        }
    }

    /**
     * Test case bundling a TriggerRule with varying enabled/disabled actions
     * and a matching EnrichedEvent.
     */
    static class TriggerTestCase {
        final TriggerRule rule;
        final EnrichedEvent enrichedEvent;

        TriggerTestCase(TriggerRule rule, EnrichedEvent enrichedEvent) {
            this.rule = rule;
            this.enrichedEvent = enrichedEvent;
        }

        @Override
        public String toString() {
            int total = rule.getActions() != null ? rule.getActions().size() : 0;
            int enabled = rule.getEnabledActions().size();
            return "TriggerTestCase{ruleId=" + rule.getRuleId()
                    + ", totalActions=" + total
                    + ", enabledActions=" + enabled + "}";
        }
    }

    @Provide
    Arbitrary<TriggerTestCase> triggerTestCases() {
        return Combinators.combine(
                ruleArbitrary(),
                enrichedEventArbitrary()
        ).as((rule, enriched) -> {
            // Ensure rule's projectId matches the event's projectId
            rule.setProjectId(enriched.getEvent().getProjectId());
            return new TriggerTestCase(rule, enriched);
        });
    }

    private Arbitrary<TriggerRule> ruleArbitrary() {
        Arbitrary<String> ruleIds = Arbitraries.strings()
                .alpha().numeric().ofMinLength(3).ofMaxLength(10)
                .map(s -> "rule_" + s.toLowerCase());

        // Generate 1-8 actions with a mix of enabled and disabled
        Arbitrary<List<TriggerAction>> actionsArb = actionArbitrary()
                .list().ofMinSize(1).ofMaxSize(8);

        return Combinators.combine(ruleIds, actionsArb).as((ruleId, actions) -> {
            TriggerRule rule = new TriggerRule();
            rule.setRuleId(ruleId);
            rule.setName("Test Rule " + ruleId);
            rule.setStatus("active");
            rule.setFrequency(TriggerFrequency.EVERY_TIME);
            rule.setActions(actions);
            // No constraints, no DSL, no timeframe, no event selection
            // so the rule always matches
            return rule;
        });
    }

    private Arbitrary<TriggerAction> actionArbitrary() {
        Arbitrary<String> types = Arbitraries.of(
                "webhook", "kafka_publish", "notification", "tag_profile", "update_attribute");
        Arbitrary<Boolean> enabledArb = Arbitraries.of(true, false);
        Arbitrary<String> templates = Arbitraries.of(
                "{\"action\": \"fired\"}",
                "{\"data\": \"test\"}",
                "{}",
                "{\"key\": \"value\"}"
        );

        return Combinators.combine(types, enabledArb, templates)
                .as((type, enabled, template) ->
                        new TriggerAction(type, enabled, null, null, null, template));
    }

    private Arbitrary<EnrichedEvent> enrichedEventArbitrary() {
        Arbitrary<String> profileIds = Arbitraries.strings()
                .alpha().numeric().ofMinLength(3).ofMaxLength(10)
                .map(s -> "user_" + s.toLowerCase());
        Arbitrary<String> projectIds = Arbitraries.strings()
                .alpha().numeric().ofMinLength(3).ofMaxLength(10)
                .map(s -> "proj_" + s.toLowerCase());
        Arbitrary<String> eventNames = Arbitraries.of(
                "purchase", "signup", "page_view", "checkout", "login");

        return Combinators.combine(profileIds, projectIds, eventNames)
                .as((profileId, projectId, eventName) -> {
                    PrismEvent event = new PrismEvent(
                            "evt_" + UUID.randomUUID().toString().substring(0, 8),
                            projectId, eventName,
                            System.currentTimeMillis(), System.currentTimeMillis(),
                            profileId, new HashMap<>(), new HashMap<>()
                    );
                    ProfileState profile = new ProfileState(
                            profileId, projectId,
                            System.currentTimeMillis(), System.currentTimeMillis(),
                            new HashMap<>()
                    );
                    return new EnrichedEvent(event, profile);
                });
    }
}
