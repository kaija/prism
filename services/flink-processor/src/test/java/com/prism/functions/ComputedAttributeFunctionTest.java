package com.prism.functions;

import com.prism.dsl.AviatorDslEngine;
import com.prism.dsl.DslResult;
import com.prism.models.PrismEvent;
import com.prism.models.ProfileState;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for computed attribute evaluation using the real {@link AviatorDslEngine}.
 *
 * <p>Since {@code ComputedAttributeFunction} extends Flink's {@code KeyedProcessFunction}
 * and requires a full Flink runtime context, these tests validate the core evaluation
 * flow directly through the engine — the same path that ComputedAttributeFunction uses.</p>
 *
 * <p>Validates: Requirements 17.1, 17.2, 17.3, 17.4, 18.1, 18.2, 18.3, 18.4, 18.5</p>
 */
class ComputedAttributeFunctionTest {

    private AviatorDslEngine engine;

    @BeforeEach
    void setUp() {
        engine = new AviatorDslEngine();
        engine.init();
    }

    // ---- Event Computed Attribute Tests (Requirements 17.1–17.4) ----

    /**
     * Validates Requirement 17.1: event-level computed property evaluation using event attributes.
     * Validates Requirement 17.2: EVENT(field) resolves from event props.
     */
    @Test
    void evaluateEventComputed_addPriceAndTax() {
        PrismEvent event = makeEvent(Map.of("price", 100, "tax", 15));

        DslResult result = engine.evaluateEventComputed(
                "ADD(EVENT(\"price\"), EVENT(\"tax\"))", event);

        assertTrue(result.success(), "Evaluation should succeed");
        assertEquals(115L, ((Number) result.value()).longValue(),
                "ADD(100, 15) should equal 115");
    }

    /**
     * Validates Requirement 17.3: successful result is added to event props.
     * Simulates the same flow as ComputedAttributeFunction.processElement().
     */
    @Test
    void evaluateEventComputed_resultAddedToEventProps() {
        PrismEvent event = makeEvent(Map.of("price", 100, "tax", 15));

        DslResult result = engine.evaluateEventComputed(
                "ADD(EVENT(\"price\"), EVENT(\"tax\"))", event);

        assertTrue(result.success());
        event.getProps().put("total", result.value());

        assertEquals(115L, ((Number) event.getProps().get("total")).longValue(),
                "Computed 'total' should be in event props");
    }

    /**
     * Validates Requirement 17.4: evaluation failure returns error without throwing.
     */
    @Test
    void evaluateEventComputed_invalidFormula_returnsError() {
        PrismEvent event = makeEvent(Map.of("price", 100));

        DslResult result = engine.evaluateEventComputed("INVALID_SYNTAX(((", event);

        assertFalse(result.success(), "Invalid formula should fail gracefully");
        assertNotNull(result.errorMessage(), "Error message should be present");
    }

    /**
     * Validates Requirement 17.4: missing field returns error or null without crashing.
     */
    @Test
    void evaluateEventComputed_missingField_handledGracefully() {
        PrismEvent event = makeEvent(Map.of("price", 100));

        DslResult result = engine.evaluateEventComputed(
                "ADD(EVENT(\"price\"), EVENT(\"nonexistent\"))", event);

        assertNotNull(result, "Result should not be null");
    }

    /**
     * Validates Requirement 17.1, 17.2: nested formula with multiple event fields.
     */
    @Test
    void evaluateEventComputed_nestedFormula() {
        PrismEvent event = makeEvent(Map.of("price", 200, "discount", 0.1, "qty", 3));

        DslResult result = engine.evaluateEventComputed(
                "MULTIPLY(SUBTRACT(EVENT(\"price\"), MULTIPLY(EVENT(\"price\"), EVENT(\"discount\"))), EVENT(\"qty\"))",
                event);

        assertTrue(result.success(), "Nested formula should evaluate successfully");
        assertEquals(540.0, ((Number) result.value()).doubleValue(), 0.001,
                "Nested computation should produce correct result");
    }

    /**
     * Validates Requirement 17.3: multiple computed attributes can be chained.
     */
    @Test
    void evaluateEventComputed_chainedComputations() {
        PrismEvent event = makeEvent(Map.of("price", 100, "tax", 15));

        DslResult result1 = engine.evaluateEventComputed(
                "ADD(EVENT(\"price\"), EVENT(\"tax\"))", event);
        assertTrue(result1.success());
        event.getProps().put("total", result1.value());

        DslResult result2 = engine.evaluateEventComputed(
                "MULTIPLY(EVENT(\"total\"), 2)", event);
        assertTrue(result2.success());
        assertEquals(230L, ((Number) result2.value()).longValue(),
                "Chained computation should use previously computed prop");
    }

    /**
     * Validates Requirement 17.4: one failing formula should not prevent others.
     */
    @Test
    void evaluateEventComputed_failureDoesNotAffectOthers() {
        PrismEvent event = makeEvent(Map.of("price", 100, "tax", 15));

        DslResult bad = engine.evaluateEventComputed("INVALID(((", event);
        assertFalse(bad.success());

        DslResult good = engine.evaluateEventComputed(
                "ADD(EVENT(\"price\"), EVENT(\"tax\"))", event);
        assertTrue(good.success());
        assertEquals(115L, ((Number) good.value()).longValue());
    }

    // ---- Profile Computed Attribute Tests (Requirements 18.1–18.5) ----

    /**
     * Validates Requirement 18.1, 18.2: profile computed attribute using SUM aggregation
     * over event history.
     */
    @Test
    void evaluateProfileComputed_sumOverEventHistory() {
        PrismEvent current = makeEvent(Map.of("amount", 50));
        ProfileState profile = makeProfile(Map.of());
        List<PrismEvent> history = List.of(
                makeEvent(Map.of("amount", 100)),
                makeEvent(Map.of("amount", 200)),
                makeEvent(Map.of("amount", 50))
        );

        DslResult result = engine.evaluateProfileComputed(
                "SUM(\"amount\")", current, profile, history);

        assertTrue(result.success(), "SUM over event history should succeed");
        assertEquals(350.0, ((Number) result.value()).doubleValue(), 0.001,
                "SUM(amount) over [100, 200, 50] should equal 350");
    }

    /**
     * Validates Requirement 18.3: profile computed attribute referencing profile props
     * via PROFILE(field).
     */
    @Test
    void evaluateProfileComputed_profileFieldReference() {
        PrismEvent current = makeEvent(Map.of());
        ProfileState profile = makeProfile(Map.of("lifetime_value", 500));
        List<PrismEvent> history = List.of();

        DslResult result = engine.evaluateProfileComputed(
                "MULTIPLY(PROFILE(\"lifetime_value\"), 2)", current, profile, history);

        assertTrue(result.success(), "PROFILE field reference should succeed");
        assertEquals(1000L, ((Number) result.value()).longValue(),
                "MULTIPLY(500, 2) should equal 1000");
    }

    /**
     * Validates Requirement 18.1, 18.3: computed result updates profile state props.
     * Simulates the same flow as ComputedAttributeFunction.processElement().
     */
    @Test
    void evaluateProfileComputed_resultUpdatesProfileProps() {
        PrismEvent current = makeEvent(Map.of("amount", 75));
        ProfileState profile = makeProfile(Map.of("existing_prop", "keep_me"));
        List<PrismEvent> history = List.of(
                makeEvent(Map.of("amount", 100)),
                makeEvent(Map.of("amount", 200))
        );

        DslResult result = engine.evaluateProfileComputed(
                "SUM(\"amount\")", current, profile, history);

        assertTrue(result.success());
        profile.getProps().put("total_amount", result.value());

        assertEquals(300.0, ((Number) profile.getProps().get("total_amount")).doubleValue(), 0.001,
                "Computed 'total_amount' should be in profile props");
        assertEquals("keep_me", profile.getProps().get("existing_prop"),
                "Existing profile props should not be modified");
    }

    /**
     * Validates Requirement 18.5: evaluation failure returns error without throwing.
     */
    @Test
    void evaluateProfileComputed_invalidFormula_returnsError() {
        PrismEvent current = makeEvent(Map.of());
        ProfileState profile = makeProfile(Map.of());
        List<PrismEvent> history = List.of();

        DslResult result = engine.evaluateProfileComputed(
                "INVALID_SYNTAX(((", current, profile, history);

        assertFalse(result.success(), "Invalid formula should fail gracefully");
        assertNotNull(result.errorMessage(), "Error message should be present");
    }

    /**
     * Validates Requirement 18.5: one failing formula should not prevent others.
     * Simulates the loop in ComputedAttributeFunction.
     */
    @Test
    void evaluateProfileComputed_failureDoesNotAffectOthers() {
        PrismEvent current = makeEvent(Map.of("amount", 10));
        ProfileState profile = makeProfile(Map.of("level", 5));
        List<PrismEvent> history = List.of(
                makeEvent(Map.of("amount", 100))
        );

        DslResult bad = engine.evaluateProfileComputed(
                "INVALID(((", current, profile, history);
        assertFalse(bad.success());

        DslResult sumResult = engine.evaluateProfileComputed(
                "SUM(\"amount\")", current, profile, history);
        assertTrue(sumResult.success());
        assertEquals(100.0, ((Number) sumResult.value()).doubleValue(), 0.001);

        DslResult profileResult = engine.evaluateProfileComputed(
                "ADD(PROFILE(\"level\"), 1)", current, profile, history);
        assertTrue(profileResult.success());
        assertEquals(6L, ((Number) profileResult.value()).longValue());
    }

    /**
     * Validates Requirement 18.2, 18.4: aggregation with AVG over event history.
     */
    @Test
    void evaluateProfileComputed_avgOverEventHistory() {
        PrismEvent current = makeEvent(Map.of("score", 80));
        ProfileState profile = makeProfile(Map.of());
        List<PrismEvent> history = List.of(
                makeEvent(Map.of("score", 60)),
                makeEvent(Map.of("score", 80)),
                makeEvent(Map.of("score", 100))
        );

        DslResult result = engine.evaluateProfileComputed(
                "AVG(\"score\")", current, profile, history);

        assertTrue(result.success(), "AVG over event history should succeed");
        assertEquals(80.0, ((Number) result.value()).doubleValue(), 0.001,
                "AVG(score) over [60, 80, 100] should equal 80");
    }

    /**
     * Validates Requirement 18.2: COUNT aggregation over event history.
     */
    @Test
    void evaluateProfileComputed_countOverEventHistory() {
        PrismEvent current = makeEvent(Map.of("action", "click"));
        ProfileState profile = makeProfile(Map.of());
        List<PrismEvent> history = List.of(
                makeEvent(Map.of("action", "click")),
                makeEvent(Map.of("action", "view")),
                makeEvent(Map.of("action", "click"))
        );

        DslResult result = engine.evaluateProfileComputed(
                "COUNT(\"action\")", current, profile, history);

        assertTrue(result.success(), "COUNT over event history should succeed");
        assertEquals(3L, ((Number) result.value()).longValue(),
                "COUNT(action) over 3 events with non-null action should equal 3");
    }

    /**
     * Validates Requirement 18.1, 18.3: combining profile props with aggregation
     * in a single formula.
     */
    @Test
    void evaluateProfileComputed_combinedProfileAndAggregation() {
        PrismEvent current = makeEvent(Map.of("amount", 25));
        ProfileState profile = makeProfile(Map.of("bonus_rate", 1.5));
        List<PrismEvent> history = List.of(
                makeEvent(Map.of("amount", 100)),
                makeEvent(Map.of("amount", 200))
        );

        DslResult result = engine.evaluateProfileComputed(
                "MULTIPLY(SUM(\"amount\"), PROFILE(\"bonus_rate\"))",
                current, profile, history);

        assertTrue(result.success(), "Combined profile + aggregation should succeed");
        assertEquals(450.0, ((Number) result.value()).doubleValue(), 0.001,
                "SUM(300) * 1.5 should equal 450");
    }

    // ---- Helpers ----

    private PrismEvent makeEvent(Map<String, Object> props) {
        return new PrismEvent(
                "evt-1", "proj-1", "purchase",
                System.currentTimeMillis(), System.currentTimeMillis(),
                "user-1", new HashMap<>(props), Map.of());
    }

    private ProfileState makeProfile(Map<String, Object> props) {
        return new ProfileState(
                "user-1", "proj-1",
                System.currentTimeMillis(), System.currentTimeMillis(),
                new HashMap<>(props));
    }
}
