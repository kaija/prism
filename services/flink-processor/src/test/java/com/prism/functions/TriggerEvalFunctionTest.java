package com.prism.functions;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prism.config.AppConfig;
import com.prism.dsl.AviatorDslEngine;
import com.prism.dsl.DslEngine;
import com.prism.models.*;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.apache.flink.api.common.typeinfo.Types;
import org.apache.flink.streaming.api.operators.KeyedProcessOperator;
import org.apache.flink.streaming.runtime.streamrecord.StreamRecord;
import org.apache.flink.streaming.util.KeyedOneInputStreamOperatorTestHarness;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for TriggerEvalFunction using Flink's KeyedOneInputStreamOperatorTestHarness,
 * AviatorDslEngine, and MockWebServer.
 */
class TriggerEvalFunctionTest {

    private KeyedOneInputStreamOperatorTestHarness<String, EnrichedEvent, TriggerOutput> harness;
    private DslEngine dslEngine;
    private MockWebServer mockWebServer;
    private AppConfig config;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() throws Exception {
        mockWebServer = new MockWebServer();
        mockWebServer.start();

        config = new AppConfig();
        config.setBackendApiUrl(mockWebServer.url("/").toString().replaceAll("/$", ""));

        AviatorDslEngine aviatorEngine = new AviatorDslEngine();
        aviatorEngine.init();
        dslEngine = aviatorEngine;
        objectMapper = new ObjectMapper()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

        TriggerEvalFunction function = new TriggerEvalFunction(dslEngine, config);
        harness = new KeyedOneInputStreamOperatorTestHarness<>(
                new KeyedProcessOperator<>(function),
                EnrichedEvent::getProfileId,
                Types.STRING
        );
        harness.open();
    }

    @AfterEach
    void tearDown() throws Exception {
        if (harness != null) harness.close();
        if (mockWebServer != null) mockWebServer.shutdown();
    }

    // --- Helper methods ---

    private PrismEvent createEvent(String profileId, String projectId, String eventName) {
        return new PrismEvent(
                "evt_" + UUID.randomUUID().toString().substring(0, 8),
                projectId, eventName,
                System.currentTimeMillis(), System.currentTimeMillis(),
                profileId, new HashMap<>(), new HashMap<>()
        );
    }

    private EnrichedEvent createEnrichedEvent(String profileId, String projectId, String eventName) {
        PrismEvent event = createEvent(profileId, projectId, eventName);
        ProfileState profile = new ProfileState(profileId, projectId,
                System.currentTimeMillis(), System.currentTimeMillis(), new HashMap<>());
        return new EnrichedEvent(event, profile);
    }

    private TriggerRule createActiveRule(String ruleId, String projectId,
                                         TriggerFrequency frequency,
                                         List<TriggerAction> actions) {
        TriggerRule rule = new TriggerRule();
        rule.setRuleId(ruleId);
        rule.setProjectId(projectId);
        rule.setName("Test Rule " + ruleId);
        rule.setStatus("active");
        rule.setFrequency(frequency);
        rule.setActions(actions);
        return rule;
    }

    private TriggerAction createEnabledAction(String type, String payloadTemplate) {
        return new TriggerAction(type, true, null, null, null, payloadTemplate);
    }

    private void enqueueRulesResponse(List<TriggerRule> rules) throws Exception {
        String json = objectMapper.writeValueAsString(rules);
        mockWebServer.enqueue(new MockResponse()
                .setBody(json)
                .addHeader("Content-Type", "application/json"));
    }

    private List<TriggerOutput> extractMainOutput() {
        List<TriggerOutput> result = new ArrayList<>();
        for (Object record : harness.getOutput()) {
            if (record instanceof StreamRecord) {
                @SuppressWarnings("unchecked")
                StreamRecord<TriggerOutput> sr = (StreamRecord<TriggerOutput>) record;
                result.add(sr.getValue());
            }
        }
        return result;
    }

    private List<EnrichedEvent> extractSideOutput() {
        List<EnrichedEvent> result = new ArrayList<>();
        var sideOutput = harness.getSideOutput(TriggerEvalFunction.ENRICHED_OUTPUT);
        if (sideOutput != null) {
            for (Object record : sideOutput) {
                if (record instanceof StreamRecord) {
                    @SuppressWarnings("unchecked")
                    StreamRecord<EnrichedEvent> sr = (StreamRecord<EnrichedEvent>) record;
                    result.add(sr.getValue());
                }
            }
        }
        return result;
    }

    // --- Tests ---

    @Test
    void processElement_emitsEnrichedEventToSideOutput() throws Exception {
        // No rules → no trigger outputs, but enriched event should go to side output
        enqueueRulesResponse(List.of());

        EnrichedEvent enriched = createEnrichedEvent("user1", "proj1", "page_view");
        harness.processElement(new StreamRecord<>(enriched));

        List<TriggerOutput> mainOutput = extractMainOutput();
        assertTrue(mainOutput.isEmpty(), "No trigger outputs expected when no rules");

        List<EnrichedEvent> sideOutput = extractSideOutput();
        assertEquals(1, sideOutput.size());
        assertEquals("user1", sideOutput.get(0).getProfileId());
    }

    @Test
    void processElement_emitsTriggerOutput_forMatchingActiveRule() throws Exception {
        TriggerAction action = createEnabledAction("webhook", "{\"user\": \"{{event.profile_id}}\"}");
        TriggerRule rule = createActiveRule("rule1", "proj1", TriggerFrequency.EVERY_TIME, List.of(action));

        enqueueRulesResponse(List.of(rule));

        EnrichedEvent enriched = createEnrichedEvent("user1", "proj1", "purchase");
        harness.processElement(new StreamRecord<>(enriched));

        List<TriggerOutput> mainOutput = extractMainOutput();
        assertEquals(1, mainOutput.size());

        TriggerOutput output = mainOutput.get(0);
        assertEquals("rule1", output.getRuleId());
        assertEquals("user1", output.getProfileId());
        assertEquals("proj1", output.getProjectId());
        assertEquals("webhook", output.getActionType());
        assertTrue(output.getRenderedPayload().contains("user1"));
    }

    @Test
    void processElement_skipsInactiveRules() throws Exception {
        TriggerAction action = createEnabledAction("webhook", "{}");
        TriggerRule rule = createActiveRule("rule1", "proj1", TriggerFrequency.EVERY_TIME, List.of(action));
        rule.setStatus("inactive");

        enqueueRulesResponse(List.of(rule));

        EnrichedEvent enriched = createEnrichedEvent("user1", "proj1", "purchase");
        harness.processElement(new StreamRecord<>(enriched));

        List<TriggerOutput> mainOutput = extractMainOutput();
        assertTrue(mainOutput.isEmpty(), "Inactive rules should not produce output");
    }

    @Test
    void processElement_skipsDisabledActions() throws Exception {
        TriggerAction enabledAction = createEnabledAction("webhook", "{\"type\": \"webhook\"}");
        TriggerAction disabledAction = new TriggerAction("notification", false, null, null, null, "{\"type\": \"notification\"}");
        TriggerRule rule = createActiveRule("rule1", "proj1", TriggerFrequency.EVERY_TIME,
                List.of(enabledAction, disabledAction));

        enqueueRulesResponse(List.of(rule));

        EnrichedEvent enriched = createEnrichedEvent("user1", "proj1", "purchase");
        harness.processElement(new StreamRecord<>(enriched));

        List<TriggerOutput> mainOutput = extractMainOutput();
        assertEquals(1, mainOutput.size());
        assertEquals("webhook", mainOutput.get(0).getActionType());
    }

    @Test
    void processElement_emitsMultipleOutputs_forMultipleEnabledActions() throws Exception {
        TriggerAction action1 = createEnabledAction("webhook", "{}");
        TriggerAction action2 = createEnabledAction("kafka_publish", "{}");
        TriggerAction action3 = createEnabledAction("notification", "{}");
        TriggerRule rule = createActiveRule("rule1", "proj1", TriggerFrequency.EVERY_TIME,
                List.of(action1, action2, action3));

        enqueueRulesResponse(List.of(rule));

        EnrichedEvent enriched = createEnrichedEvent("user1", "proj1", "purchase");
        harness.processElement(new StreamRecord<>(enriched));

        List<TriggerOutput> mainOutput = extractMainOutput();
        assertEquals(3, mainOutput.size());
        assertEquals("webhook", mainOutput.get(0).getActionType());
        assertEquals("kafka_publish", mainOutput.get(1).getActionType());
        assertEquals("notification", mainOutput.get(2).getActionType());
    }

    @Test
    void processElement_ruleWithNoActions_producesNoOutput() throws Exception {
        TriggerRule rule = createActiveRule("rule1", "proj1", TriggerFrequency.EVERY_TIME, List.of());
        enqueueRulesResponse(List.of(rule));

        EnrichedEvent enriched = createEnrichedEvent("user1", "proj1", "purchase");
        harness.processElement(new StreamRecord<>(enriched));

        List<TriggerOutput> mainOutput = extractMainOutput();
        assertTrue(mainOutput.isEmpty());
    }

    @Test
    void processElement_eventSelectionFilter_skipsNonMatchingEvents() throws Exception {
        TriggerAction action = createEnabledAction("webhook", "{}");
        TriggerRule rule = createActiveRule("rule1", "proj1", TriggerFrequency.EVERY_TIME, List.of(action));
        rule.setSelectedEventNames(List.of("purchase", "checkout"));

        enqueueRulesResponse(List.of(rule));

        EnrichedEvent enriched = createEnrichedEvent("user1", "proj1", "page_view");
        harness.processElement(new StreamRecord<>(enriched));

        List<TriggerOutput> mainOutput = extractMainOutput();
        assertTrue(mainOutput.isEmpty(), "Event name 'page_view' should not match filter");
    }

    @Test
    void processElement_eventSelectionFilter_matchesSelectedEvent() throws Exception {
        TriggerAction action = createEnabledAction("webhook", "{}");
        TriggerRule rule = createActiveRule("rule1", "proj1", TriggerFrequency.EVERY_TIME, List.of(action));
        rule.setSelectedEventNames(List.of("purchase", "checkout"));

        enqueueRulesResponse(List.of(rule));

        EnrichedEvent enriched = createEnrichedEvent("user1", "proj1", "purchase");
        harness.processElement(new StreamRecord<>(enriched));

        List<TriggerOutput> mainOutput = extractMainOutput();
        assertEquals(1, mainOutput.size());
    }

    @Test
    void processElement_constraintEvaluation_skipsWhenConstraintsFail() throws Exception {
        TriggerAction action = createEnabledAction("webhook", "{}");
        TriggerRule rule = createActiveRule("rule1", "proj1", TriggerFrequency.EVERY_TIME, List.of(action));

        // Constraint: event.props.amount > 100
        Condition condition = new Condition("event.props.amount", "larger", "100");
        rule.setConstraints(new ConstraintGroup(Logic.AND, List.of(condition)));

        enqueueRulesResponse(List.of(rule));

        // Event with amount = 50 (should NOT match)
        EnrichedEvent enriched = createEnrichedEvent("user1", "proj1", "purchase");
        enriched.getEvent().getProps().put("amount", 50);
        harness.processElement(new StreamRecord<>(enriched));

        List<TriggerOutput> mainOutput = extractMainOutput();
        assertTrue(mainOutput.isEmpty(), "Constraint should fail for amount=50");
    }

    @Test
    void processElement_constraintEvaluation_matchesWhenConstraintsPass() throws Exception {
        TriggerAction action = createEnabledAction("webhook", "{}");
        TriggerRule rule = createActiveRule("rule1", "proj1", TriggerFrequency.EVERY_TIME, List.of(action));

        Condition condition = new Condition("event.props.amount", "larger", "100");
        rule.setConstraints(new ConstraintGroup(Logic.AND, List.of(condition)));

        enqueueRulesResponse(List.of(rule));

        EnrichedEvent enriched = createEnrichedEvent("user1", "proj1", "purchase");
        enriched.getEvent().getProps().put("amount", 200);
        harness.processElement(new StreamRecord<>(enriched));

        List<TriggerOutput> mainOutput = extractMainOutput();
        assertEquals(1, mainOutput.size());
    }

    @Test
    void processElement_dslExpression_skipsWhenDslReturnsFalse() throws Exception {
        TriggerAction action = createEnabledAction("webhook", "{}");
        TriggerRule rule = createActiveRule("rule1", "proj1", TriggerFrequency.EVERY_TIME, List.of(action));
        rule.setDsl("EQ(1, 2)");

        enqueueRulesResponse(List.of(rule));

        EnrichedEvent enriched = createEnrichedEvent("user1", "proj1", "purchase");
        harness.processElement(new StreamRecord<>(enriched));

        List<TriggerOutput> mainOutput = extractMainOutput();
        assertTrue(mainOutput.isEmpty(), "DSL returning false should skip rule");
    }

    @Test
    void processElement_dslExpression_matchesWhenDslReturnsTrue() throws Exception {
        TriggerAction action = createEnabledAction("webhook", "{}");
        TriggerRule rule = createActiveRule("rule1", "proj1", TriggerFrequency.EVERY_TIME, List.of(action));
        rule.setDsl("EQ(1, 1)");

        enqueueRulesResponse(List.of(rule));

        EnrichedEvent enriched = createEnrichedEvent("user1", "proj1", "purchase");
        harness.processElement(new StreamRecord<>(enriched));

        List<TriggerOutput> mainOutput = extractMainOutput();
        assertEquals(1, mainOutput.size());
    }

    @Test
    void processElement_oncePerProfile_firesOnlyOnce() throws Exception {
        TriggerAction action = createEnabledAction("webhook", "{}");
        TriggerRule rule = createActiveRule("rule1", "proj1", TriggerFrequency.ONCE_PER_PROFILE, List.of(action));

        // Enqueue rules response for both events
        enqueueRulesResponse(List.of(rule));
        enqueueRulesResponse(List.of(rule));

        EnrichedEvent enriched1 = createEnrichedEvent("user1", "proj1", "purchase");
        harness.processElement(new StreamRecord<>(enriched1));

        EnrichedEvent enriched2 = createEnrichedEvent("user1", "proj1", "purchase");
        harness.processElement(new StreamRecord<>(enriched2));

        List<TriggerOutput> mainOutput = extractMainOutput();
        assertEquals(1, mainOutput.size(), "ONCE_PER_PROFILE should fire only once");
    }

    @Test
    void processElement_everyTime_firesOnEveryMatch() throws Exception {
        TriggerAction action = createEnabledAction("webhook", "{}");
        TriggerRule rule = createActiveRule("rule1", "proj1", TriggerFrequency.EVERY_TIME, List.of(action));

        enqueueRulesResponse(List.of(rule));
        enqueueRulesResponse(List.of(rule));

        EnrichedEvent enriched1 = createEnrichedEvent("user1", "proj1", "purchase");
        harness.processElement(new StreamRecord<>(enriched1));

        EnrichedEvent enriched2 = createEnrichedEvent("user1", "proj1", "purchase");
        harness.processElement(new StreamRecord<>(enriched2));

        List<TriggerOutput> mainOutput = extractMainOutput();
        assertEquals(2, mainOutput.size(), "EVERY_TIME should fire on every match");
    }

    @Test
    void processElement_payloadTemplateRendering() throws Exception {
        TriggerAction action = createEnabledAction("webhook",
                "{\"user\": \"{{event.profile_id}}\", \"event\": \"{{event.event_name}}\"}");
        TriggerRule rule = createActiveRule("rule1", "proj1", TriggerFrequency.EVERY_TIME, List.of(action));

        enqueueRulesResponse(List.of(rule));

        EnrichedEvent enriched = createEnrichedEvent("user1", "proj1", "purchase");
        harness.processElement(new StreamRecord<>(enriched));

        List<TriggerOutput> mainOutput = extractMainOutput();
        assertEquals(1, mainOutput.size());
        String payload = mainOutput.get(0).getRenderedPayload();
        assertTrue(payload.contains("user1"));
        assertTrue(payload.contains("purchase"));
    }

    @Test
    void processElement_multipleRules_evaluatedIndependently() throws Exception {
        TriggerAction action1 = createEnabledAction("webhook", "{}");
        TriggerRule rule1 = createActiveRule("rule1", "proj1", TriggerFrequency.EVERY_TIME, List.of(action1));

        TriggerAction action2 = createEnabledAction("notification", "{}");
        TriggerRule rule2 = createActiveRule("rule2", "proj1", TriggerFrequency.EVERY_TIME, List.of(action2));

        enqueueRulesResponse(List.of(rule1, rule2));

        EnrichedEvent enriched = createEnrichedEvent("user1", "proj1", "purchase");
        harness.processElement(new StreamRecord<>(enriched));

        List<TriggerOutput> mainOutput = extractMainOutput();
        assertEquals(2, mainOutput.size());
        assertEquals("rule1", mainOutput.get(0).getRuleId());
        assertEquals("rule2", mainOutput.get(1).getRuleId());
    }

    @Test
    void processElement_triggerOutputContainsCorrectFields() throws Exception {
        TriggerAction action = createEnabledAction("kafka_publish", "{\"data\": \"test\"}");
        TriggerRule rule = createActiveRule("rule_abc", "proj_xyz", TriggerFrequency.EVERY_TIME, List.of(action));

        enqueueRulesResponse(List.of(rule));

        EnrichedEvent enriched = createEnrichedEvent("user_123", "proj_xyz", "signup");
        harness.processElement(new StreamRecord<>(enriched));

        List<TriggerOutput> mainOutput = extractMainOutput();
        assertEquals(1, mainOutput.size());

        TriggerOutput output = mainOutput.get(0);
        assertEquals("rule_abc", output.getRuleId());
        assertEquals(enriched.getEvent().getEventId(), output.getEventId());
        assertEquals("user_123", output.getProfileId());
        assertEquals("proj_xyz", output.getProjectId());
        assertEquals("kafka_publish", output.getActionType());
        assertEquals("{\"data\": \"test\"}", output.getRenderedPayload());
        assertTrue(output.getTriggeredAt() > 0);
    }

    @SuppressWarnings("unchecked")
    @Test
    void buildConstraintContext_flattensEventAndProfileFields() {
        PrismEvent event = new PrismEvent("evt1", "proj1", "purchase",
                1000L, 2000L, "user1", new HashMap<>(), new HashMap<>());
        event.getProps().put("amount", 5999);
        event.getCtx().put("ip", "1.2.3.4");

        ProfileState profile = new ProfileState("user1", "proj1", 500L, 1000L, new HashMap<>());
        profile.getProps().put("vip_level", "gold");

        EnrichedEvent enriched = new EnrichedEvent(event, profile);
        Map<String, Object> context = TriggerEvalFunction.buildConstraintContext(enriched);

        // Verify nested event structure
        Map<String, Object> eventMap = (Map<String, Object>) context.get("event");
        assertNotNull(eventMap);
        assertEquals("evt1", eventMap.get("event_id"));
        assertEquals("proj1", eventMap.get("project_id"));
        assertEquals("purchase", eventMap.get("event_name"));
        assertEquals(1000L, eventMap.get("cts"));
        assertEquals(2000L, eventMap.get("sts"));
        assertEquals("user1", eventMap.get("profile_id"));

        Map<String, Object> eventProps = (Map<String, Object>) eventMap.get("props");
        assertEquals(5999, eventProps.get("amount"));

        Map<String, Object> eventCtx = (Map<String, Object>) eventMap.get("ctx");
        assertEquals("1.2.3.4", eventCtx.get("ip"));

        // Verify nested profile structure
        Map<String, Object> profileMap = (Map<String, Object>) context.get("profile");
        assertNotNull(profileMap);
        assertEquals("user1", profileMap.get("profile_id"));
        assertEquals("proj1", profileMap.get("project_id"));
        assertEquals(500L, profileMap.get("created_at"));
        assertEquals(1000L, profileMap.get("updated_at"));

        Map<String, Object> profileProps = (Map<String, Object>) profileMap.get("props");
        assertEquals("gold", profileProps.get("vip_level"));
    }

    @Test
    void buildConstraintContext_handlesNullEnrichedEvent() {
        Map<String, Object> context = TriggerEvalFunction.buildConstraintContext(null);
        assertTrue(context.isEmpty());
    }

    @Test
    void processElement_oncePerProfile_differentProfiles_fireSeparately() throws Exception {
        TriggerAction action = createEnabledAction("webhook", "{}");
        TriggerRule rule = createActiveRule("rule1", "proj1", TriggerFrequency.ONCE_PER_PROFILE, List.of(action));

        enqueueRulesResponse(List.of(rule));
        enqueueRulesResponse(List.of(rule));

        EnrichedEvent enrichedA = createEnrichedEvent("userA", "proj1", "purchase");
        harness.processElement(new StreamRecord<>(enrichedA));

        EnrichedEvent enrichedB = createEnrichedEvent("userB", "proj1", "purchase");
        harness.processElement(new StreamRecord<>(enrichedB));

        List<TriggerOutput> mainOutput = extractMainOutput();
        assertEquals(2, mainOutput.size(), "Different profiles should each fire once");
    }

    @Test
    void processElement_nullConstraints_treatedAsNoConstraints() throws Exception {
        TriggerAction action = createEnabledAction("webhook", "{}");
        TriggerRule rule = createActiveRule("rule1", "proj1", TriggerFrequency.EVERY_TIME, List.of(action));
        rule.setConstraints(null);

        enqueueRulesResponse(List.of(rule));

        EnrichedEvent enriched = createEnrichedEvent("user1", "proj1", "purchase");
        harness.processElement(new StreamRecord<>(enriched));

        List<TriggerOutput> mainOutput = extractMainOutput();
        assertEquals(1, mainOutput.size());
    }

    @Test
    void processElement_emptyConstraintNodes_treatedAsNoConstraints() throws Exception {
        TriggerAction action = createEnabledAction("webhook", "{}");
        TriggerRule rule = createActiveRule("rule1", "proj1", TriggerFrequency.EVERY_TIME, List.of(action));
        rule.setConstraints(new ConstraintGroup(Logic.AND, List.of()));

        enqueueRulesResponse(List.of(rule));

        EnrichedEvent enriched = createEnrichedEvent("user1", "proj1", "purchase");
        harness.processElement(new StreamRecord<>(enriched));

        List<TriggerOutput> mainOutput = extractMainOutput();
        assertEquals(1, mainOutput.size());
    }
}
