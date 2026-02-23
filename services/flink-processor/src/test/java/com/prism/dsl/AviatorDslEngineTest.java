package com.prism.dsl;

import com.prism.models.PrismEvent;
import com.prism.models.ProfileState;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for {@link AviatorDslEngine}.
 */
class AviatorDslEngineTest {

    private AviatorDslEngine engine;

    @BeforeEach
    void setUp() {
        engine = new AviatorDslEngine();
        engine.init();
    }

    // ---- evaluateEventComputed ----

    @Test
    void evaluateEventComputed_literalFormula_returnsValue() {
        PrismEvent event = makeEvent(Map.of("amount", 100));
        DslResult result = engine.evaluateEventComputed("42", event);
        assertTrue(result.success());
        assertEquals(42L, ((Number) result.value()).longValue());
    }

    @Test
    void evaluateEventComputed_eventFieldAccess() {
        PrismEvent event = makeEvent(Map.of("amount", 50.0));
        DslResult result = engine.evaluateEventComputed("EVENT(\"amount\")", event);
        assertTrue(result.success());
        assertEquals(50.0, ((Number) result.value()).doubleValue(), 0.001);
    }

    @Test
    void evaluateEventComputed_arithmetic() {
        PrismEvent event = makeEvent(Map.of("price", 10.0, "qty", 3.0));
        DslResult result = engine.evaluateEventComputed(
                "MULTIPLY(EVENT(\"price\"), EVENT(\"qty\"))", event);
        assertTrue(result.success());
        assertEquals(30.0, ((Number) result.value()).doubleValue(), 0.001);
    }

    @Test
    void evaluateEventComputed_invalidFormula_returnsError() {
        PrismEvent event = makeEvent(Map.of());
        DslResult result = engine.evaluateEventComputed("INVALID_SYNTAX(((", event);
        assertFalse(result.success());
        assertNotNull(result.errorMessage());
    }

    @Test
    void evaluateEventComputed_divideByZero_returnsNull() {
        PrismEvent event = makeEvent(Map.of("a", 10.0, "b", 0.0));
        DslResult result = engine.evaluateEventComputed(
                "DIVIDE(EVENT(\"a\"), EVENT(\"b\"))", event);
        assertTrue(result.success());
        assertNull(result.value());
    }

    @Test
    void evaluateEventComputed_stringFunction() {
        PrismEvent event = makeEvent(Map.of("name", "hello world"));
        DslResult result = engine.evaluateEventComputed(
                "UPPER(EVENT(\"name\"))", event);
        assertTrue(result.success());
        assertEquals("HELLO WORLD", result.value());
    }

    @Test
    void evaluateEventComputed_comparison() {
        PrismEvent event = makeEvent(Map.of("score", 85.0));
        DslResult result = engine.evaluateEventComputed(
                "GT(EVENT(\"score\"), 80)", event);
        assertTrue(result.success());
        assertEquals(true, result.value());
    }

    @Test
    void evaluateEventComputed_logicalAnd() {
        PrismEvent event = makeEvent(Map.of("a", 10.0, "b", 20.0));
        DslResult result = engine.evaluateEventComputed(
                "AND(GT(EVENT(\"a\"), 5), LT(EVENT(\"b\"), 30))", event);
        assertTrue(result.success());
        assertEquals(true, result.value());
    }

    // ---- evaluateProfileComputed ----

    @Test
    void evaluateProfileComputed_profileFieldAccess() {
        PrismEvent event = makeEvent(Map.of());
        ProfileState profile = makeProfile(Map.of("tier", "gold"));
        DslResult result = engine.evaluateProfileComputed(
                "PROFILE(\"tier\")", event, profile, List.of());
        assertTrue(result.success());
        assertEquals("gold", result.value());
    }

    @Test
    void evaluateProfileComputed_countAggregation() {
        PrismEvent current = makeEvent(Map.of());
        ProfileState profile = makeProfile(Map.of());
        List<PrismEvent> history = List.of(
                makeEvent(Map.of("amount", 10.0)),
                makeEvent(Map.of("amount", 20.0)),
                makeEvent(Map.of("amount", 30.0))
        );
        DslResult result = engine.evaluateProfileComputed(
                "COUNT(\"amount\")", current, profile, history);
        assertTrue(result.success());
        assertEquals(3L, ((Number) result.value()).longValue());
    }

    @Test
    void evaluateProfileComputed_sumAggregation() {
        PrismEvent current = makeEvent(Map.of());
        ProfileState profile = makeProfile(Map.of());
        List<PrismEvent> history = List.of(
                makeEvent(Map.of("amount", 10.0)),
                makeEvent(Map.of("amount", 20.0)),
                makeEvent(Map.of("amount", 30.0))
        );
        DslResult result = engine.evaluateProfileComputed(
                "SUM(\"amount\")", current, profile, history);
        assertTrue(result.success());
        assertEquals(60.0, ((Number) result.value()).doubleValue(), 0.001);
    }

    @Test
    void evaluateProfileComputed_invalidFormula_returnsError() {
        PrismEvent event = makeEvent(Map.of());
        ProfileState profile = makeProfile(Map.of());
        DslResult result = engine.evaluateProfileComputed(
                "BROKEN(((", event, profile, List.of());
        assertFalse(result.success());
        assertNotNull(result.errorMessage());
    }

    // ---- evaluateTriggerRule ----

    @Test
    void evaluateTriggerRule_trueCondition() {
        PrismEvent event = makeEvent(Map.of("amount", 150.0));
        ProfileState profile = makeProfile(Map.of("vip", true));
        DslResult result = engine.evaluateTriggerRule(
                "AND(GT(EVENT(\"amount\"), 100), EQ(PROFILE(\"vip\"), true))",
                event, profile, List.of());
        assertTrue(result.success());
        assertEquals(true, result.value());
    }

    @Test
    void evaluateTriggerRule_falseCondition() {
        PrismEvent event = makeEvent(Map.of("amount", 50.0));
        ProfileState profile = makeProfile(Map.of("vip", false));
        DslResult result = engine.evaluateTriggerRule(
                "GT(EVENT(\"amount\"), 100)",
                event, profile, List.of());
        assertTrue(result.success());
        assertEquals(false, result.value());
    }

    @Test
    void evaluateTriggerRule_invalidExpression_returnsError() {
        PrismEvent event = makeEvent(Map.of());
        ProfileState profile = makeProfile(Map.of());
        DslResult result = engine.evaluateTriggerRule(
                "NOT_A_VALID_EXPR(((", event, profile, List.of());
        assertFalse(result.success());
        assertNotNull(result.errorMessage());
    }

    // ---- caching ----

    @Test
    void expressionCache_returnsSameCompiledExpression() {
        // Calling getOrCompile twice with the same expression should hit cache
        var expr1 = engine.getOrCompile("ADD(1, 2)");
        var expr2 = engine.getOrCompile("ADD(1, 2)");
        assertSame(expr1, expr2);
    }

    // ---- translateToAviator ----

    @Test
    void translateToAviator_simpleArithmetic() {
        String aviatorExpr = engine.translateToAviator("ADD(1, 2)");
        assertEquals("(1 + 2)", aviatorExpr);
    }

    @Test
    void translateToAviator_nestedExpression() {
        String aviatorExpr = engine.translateToAviator(
                "MULTIPLY(ADD(1, 2), SUBTRACT(5, 3))");
        assertEquals("((1 + 2) * (5 - 3))", aviatorExpr);
    }

    // ---- context building ----

    @Test
    void buildEventContext_containsEventProps() {
        PrismEvent event = makeEvent(Map.of("key", "val"));
        event.setCts(12345L);
        Map<String, Object> ctx = engine.buildEventContext(event);
        @SuppressWarnings("unchecked")
        Map<String, Object> props = (Map<String, Object>) ctx.get("event_props");
        assertEquals("val", props.get("key"));
        assertEquals(12345L, ctx.get("event_timestamp"));
    }

    @Test
    void buildFullContext_containsAllSections() {
        PrismEvent event = makeEvent(Map.of("e", 1));
        event.setCts(100L);
        ProfileState profile = makeProfile(Map.of("p", 2));
        List<PrismEvent> history = List.of(makeEvent(Map.of("h", 3)));

        Map<String, Object> ctx = engine.buildFullContext(event, profile, history);

        assertNotNull(ctx.get("event_props"));
        assertNotNull(ctx.get("profile_props"));
        assertNotNull(ctx.get("event_history"));
        assertNotNull(ctx.get("processing_time"));
        assertEquals(100L, ctx.get("event_timestamp"));

        @SuppressWarnings("unchecked")
        Map<String, Object> profileProps = (Map<String, Object>) ctx.get("profile_props");
        assertEquals(2, profileProps.get("p"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> hist = (List<Map<String, Object>>) ctx.get("event_history");
        assertEquals(1, hist.size());
    }

    // ---- lazy init / serialisation resilience ----

    @Test
    void lazyInit_worksAfterDeserialisationSimulation() {
        // Simulate transient fields being null (as after deserialisation)
        AviatorDslEngine freshEngine = new AviatorDslEngine();
        // Don't call init() — the evaluate methods should auto-init
        PrismEvent event = makeEvent(Map.of("x", 5.0));
        DslResult result = freshEngine.evaluateEventComputed("EVENT(\"x\")", event);
        assertTrue(result.success());
        assertEquals(5.0, ((Number) result.value()).doubleValue(), 0.001);
    }

    @Test
    void evaluateEventComputed_nullProps_handledGracefully() {
        PrismEvent event = new PrismEvent();
        event.setCts(0L);
        DslResult result = engine.evaluateEventComputed("42", event);
        assertTrue(result.success());
    }

    @Test
    void evaluateProfileComputed_nullProfileState() {
        PrismEvent event = makeEvent(Map.of());
        DslResult result = engine.evaluateProfileComputed(
                "42", event, null, null);
        assertTrue(result.success());
    }

    // ---- helpers ----

    private PrismEvent makeEvent(Map<String, Object> props) {
        PrismEvent e = new PrismEvent();
        e.setEventId("evt-1");
        e.setProjectId("proj-1");
        e.setEventName("test_event");
        e.setCts(System.currentTimeMillis());
        e.setSts(System.currentTimeMillis());
        e.setProfileId("profile-1");
        e.setProps(new java.util.HashMap<>(props));
        return e;
    }

    private ProfileState makeProfile(Map<String, Object> props) {
        return new ProfileState("profile-1", "proj-1",
                System.currentTimeMillis(), System.currentTimeMillis(),
                new java.util.HashMap<>(props));
    }
}
