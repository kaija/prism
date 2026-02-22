package com.prism.models;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prism.config.AppConfig;
import com.prism.dsl.DslResult;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for core data model classes.
 */
class DataModelTest {

    private final ObjectMapper mapper = new ObjectMapper();

    // --- PrismEvent ---

    @Test
    void prismEventSerializesWithSnakeCaseFields() throws Exception {
        PrismEvent event = new PrismEvent("e1", "p1", "purchase",
                1000L, 2000L, "user1",
                Map.of("amount", 50), Map.of("ip", "1.2.3.4"));

        String json = mapper.writeValueAsString(event);
        assertTrue(json.contains("\"event_id\""));
        assertTrue(json.contains("\"project_id\""));
        assertTrue(json.contains("\"event_name\""));
        assertTrue(json.contains("\"profile_id\""));
    }

    @Test
    void prismEventDeserializesFromSnakeCaseJson() throws Exception {
        String json = """
                {"event_id":"e1","project_id":"p1","event_name":"click",
                 "cts":100,"sts":200,"profile_id":"u1","props":{},"ctx":{}}""";
        PrismEvent event = mapper.readValue(json, PrismEvent.class);
        assertEquals("e1", event.getEventId());
        assertEquals("p1", event.getProjectId());
        assertEquals("click", event.getEventName());
        assertEquals("u1", event.getProfileId());
    }

    @Test
    void prismEventDefaultConstructorInitializesMaps() {
        PrismEvent event = new PrismEvent();
        assertNotNull(event.getProps());
        assertNotNull(event.getCtx());
    }

    // --- ProfileState ---

    @Test
    void profileStateSerializesWithSnakeCaseFields() throws Exception {
        ProfileState ps = new ProfileState("u1", "p1", 100L, 200L, Map.of("vip", true));
        String json = mapper.writeValueAsString(ps);
        assertTrue(json.contains("\"profile_id\""));
        assertTrue(json.contains("\"project_id\""));
        assertTrue(json.contains("\"created_at\""));
        assertTrue(json.contains("\"updated_at\""));
    }

    // --- EnrichedEvent ---

    @Test
    void enrichedEventConvenienceAccessors() {
        PrismEvent event = new PrismEvent();
        event.setProjectId("proj1");
        event.setProfileId("user1");
        EnrichedEvent enriched = new EnrichedEvent(event, new ProfileState());
        assertEquals("proj1", enriched.getProjectId());
        assertEquals("user1", enriched.getProfileId());
    }

    @Test
    void enrichedEventNullEventReturnsNullAccessors() {
        EnrichedEvent enriched = new EnrichedEvent(null, null);
        assertNull(enriched.getProjectId());
        assertNull(enriched.getProfileId());
    }

    // --- TriggerOutput ---

    @Test
    void triggerOutputSerializesWithSnakeCaseFields() throws Exception {
        TriggerOutput to = new TriggerOutput("r1", "e1", "u1", "p1",
                "webhook", "{}", 12345L);
        String json = mapper.writeValueAsString(to);
        assertTrue(json.contains("\"rule_id\""));
        assertTrue(json.contains("\"event_id\""));
        assertTrue(json.contains("\"action_type\""));
        assertTrue(json.contains("\"rendered_payload\""));
        assertTrue(json.contains("\"triggered_at\""));
    }

    // --- TriggerRule ---

    @Test
    void triggerRuleIsActiveChecksStatus() {
        TriggerRule rule = new TriggerRule();
        rule.setStatus("active");
        assertTrue(rule.isActive());
        rule.setStatus("inactive");
        assertFalse(rule.isActive());
        rule.setStatus("draft");
        assertFalse(rule.isActive());
    }

    @Test
    void triggerRuleGetEnabledActionsFiltersCorrectly() {
        TriggerAction enabled = new TriggerAction("webhook", true, null, null, null, null);
        TriggerAction disabled = new TriggerAction("kafka_publish", false, null, null, null, null);
        TriggerRule rule = new TriggerRule();
        rule.setActions(List.of(enabled, disabled));
        List<TriggerAction> result = rule.getEnabledActions();
        assertEquals(1, result.size());
        assertEquals("webhook", result.get(0).getType());
    }

    @Test
    void triggerRuleGetEnabledActionsNullActionsReturnsEmpty() {
        TriggerRule rule = new TriggerRule();
        assertTrue(rule.getEnabledActions().isEmpty());
    }

    // --- AttributeDefinition ---

    @Test
    void attributeDefinitionIsEventComputed() {
        AttributeDefinition attr = new AttributeDefinition("total", "number", "event", false, true, "sum(amount)");
        assertTrue(attr.isEventComputed());
        assertFalse(attr.isProfileComputed());
    }

    @Test
    void attributeDefinitionIsProfileComputed() {
        AttributeDefinition attr = new AttributeDefinition("login_count", "number", "profile", false, true, "count()");
        assertFalse(attr.isEventComputed());
        assertTrue(attr.isProfileComputed());
    }

    @Test
    void attributeDefinitionNotComputedReturnsFalse() {
        AttributeDefinition attr = new AttributeDefinition("name", "string", "event", true, false, null);
        assertFalse(attr.isEventComputed());
        assertFalse(attr.isProfileComputed());
    }

    // --- DslResult ---

    @Test
    void dslResultOkFactory() {
        DslResult result = DslResult.ok(42);
        assertTrue(result.success());
        assertEquals(42, result.value());
        assertNull(result.errorMessage());
    }

    @Test
    void dslResultErrorFactory() {
        DslResult result = DslResult.error("bad formula");
        assertFalse(result.success());
        assertNull(result.value());
        assertEquals("bad formula", result.errorMessage());
    }

    // --- AppConfig ---

    @Test
    void appConfigLoadDefaults() {
        AppConfig config = AppConfig.load(new String[]{});
        assertEquals("event.raw", config.getInputTopic());
        assertEquals("event.enriched", config.getEnrichedTopic());
        assertEquals("event.triggered", config.getTriggeredTopic());
        assertEquals("event.dlq", config.getDlqTopic());
        assertEquals(1000, config.getMaxEventHistoryCount());
        assertEquals(10L * 1024 * 1024, config.getMaxEventHistoryBytes());
    }

    @Test
    void appConfigLoadFromArgs() {
        String[] args = {
                "--kafka.bootstrap.servers=broker:9092",
                "--input.topic=custom.raw",
                "--max.event.history.count=500"
        };
        AppConfig config = AppConfig.load(args);
        assertEquals("broker:9092", config.getKafkaBootstrapServers());
        assertEquals("custom.raw", config.getInputTopic());
        assertEquals(500, config.getMaxEventHistoryCount());
    }

    // --- Sealed interface / records ---

    @Test
    void conditionRecordFields() {
        Condition c = new Condition("event.props.amount", "larger", "100");
        assertEquals("event.props.amount", c.attribute());
        assertEquals("larger", c.operator());
        assertEquals("100", c.value());
        assertInstanceOf(ConstraintNode.class, c);
    }

    @Test
    void constraintGroupRecordFields() {
        Condition c1 = new Condition("a", "is", "x");
        Condition c2 = new Condition("b", "is", "y");
        ConstraintGroup group = new ConstraintGroup(Logic.AND, List.of(c1, c2));
        assertEquals(Logic.AND, group.logic());
        assertEquals(2, group.nodes().size());
        assertInstanceOf(ConstraintNode.class, group);
    }

    // --- TriggerFrequency ---

    @Test
    void triggerFrequencyJsonDeserialization() throws Exception {
        assertEquals(TriggerFrequency.EVERY_TIME,
                mapper.readValue("\"every_time\"", TriggerFrequency.class));
        assertEquals(TriggerFrequency.ONCE_PER_PROFILE,
                mapper.readValue("\"once_per_profile\"", TriggerFrequency.class));
    }

    // --- TimeframeConfig ---

    @Test
    void timeframeConfigIsAbsolute() {
        TimeframeConfig tf = new TimeframeConfig(true, 1000L, 2000L, null);
        assertTrue(tf.isAbsolute());
        TimeframeConfig rel = new TimeframeConfig(false, null, null, 86400000L);
        assertFalse(rel.isAbsolute());
    }
}
