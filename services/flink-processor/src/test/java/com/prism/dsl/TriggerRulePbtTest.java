package com.prism.dsl;

import com.prism.models.PrismEvent;
import com.prism.models.ProfileState;
import net.jqwik.api.*;
import net.jqwik.api.constraints.IntRange;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Property-based tests for trigger rule evaluation returning boolean results.
 *
 * <p>Feature: dsl-engine, Property 21: Trigger Rule Evaluation Returns Boolean</p>
 *
 * <p>For any valid trigger rule DSL expression evaluated against an event,
 * profile state, and event history, the Flink_DSL_Runtime SHALL return a
 * DslResult where success is true and the value is a boolean.</p>
 *
 * <p><b>Validates: Requirements 19.4</b></p>
 */
class TriggerRulePbtTest {

    private final AviatorDslEngine engine;

    TriggerRulePbtTest() {
        engine = new AviatorDslEngine();
        engine.init();
    }

    @Property(tries = 200)
    // Feature: dsl-engine, Property 21: Trigger Rule Evaluation Returns Boolean
    void gtTriggerRuleReturnsCorrectBoolean(
            @ForAll @IntRange(min = -1000, max = 1000) int amount,
            @ForAll @IntRange(min = -1000, max = 1000) int threshold) {
        PrismEvent event = makeEvent(Map.of("amount", amount));
        ProfileState profile = makeProfile(Map.of());

        String expression = "GT(EVENT(\"amount\"), " + threshold + ")";
        DslResult result = engine.evaluateTriggerRule(expression, event, profile, List.of());

        assertTrue(result.success(), "Trigger rule should succeed, got: " + result.errorMessage());
        assertInstanceOf(Boolean.class, result.value(), "Trigger rule value should be Boolean");
        assertEquals(amount > threshold, result.value(),
                "GT(EVENT(\"amount\"), " + threshold + ") with amount=" + amount);
    }

    @Property(tries = 200)
    // Feature: dsl-engine, Property 21: Trigger Rule Evaluation Returns Boolean
    void eqTriggerRuleReturnsCorrectBoolean(
            @ForAll @IntRange(min = -100, max = 100) int a,
            @ForAll @IntRange(min = -100, max = 100) int b) {
        PrismEvent event = makeEvent(Map.of("score", a));
        ProfileState profile = makeProfile(Map.of());

        String expression = "EQ(EVENT(\"score\"), " + b + ")";
        DslResult result = engine.evaluateTriggerRule(expression, event, profile, List.of());

        assertTrue(result.success(), "Trigger rule should succeed, got: " + result.errorMessage());
        assertInstanceOf(Boolean.class, result.value(), "Trigger rule value should be Boolean");
        assertEquals(a == b, result.value());
    }

    @Property(tries = 200)
    // Feature: dsl-engine, Property 21: Trigger Rule Evaluation Returns Boolean
    void andTriggerRuleReturnsCorrectBoolean(
            @ForAll @IntRange(min = -100, max = 100) int amount,
            @ForAll @IntRange(min = -100, max = 100) int low,
            @ForAll @IntRange(min = -100, max = 100) int high) {
        PrismEvent event = makeEvent(Map.of("amount", amount));
        ProfileState profile = makeProfile(Map.of());

        String expression = "AND(GTE(EVENT(\"amount\"), " + low + "), LTE(EVENT(\"amount\"), " + high + "))";
        DslResult result = engine.evaluateTriggerRule(expression, event, profile, List.of());

        assertTrue(result.success(), "Trigger rule should succeed, got: " + result.errorMessage());
        assertInstanceOf(Boolean.class, result.value(), "Trigger rule value should be Boolean");
        boolean expected = amount >= low && amount <= high;
        assertEquals(expected, result.value());
    }

    @Property(tries = 200)
    // Feature: dsl-engine, Property 21: Trigger Rule Evaluation Returns Boolean
    void orTriggerRuleReturnsCorrectBoolean(
            @ForAll @IntRange(min = -100, max = 100) int score,
            @ForAll @IntRange(min = -100, max = 100) int t1,
            @ForAll @IntRange(min = -100, max = 100) int t2) {
        PrismEvent event = makeEvent(Map.of("score", score));
        ProfileState profile = makeProfile(Map.of());

        String expression = "OR(GT(EVENT(\"score\"), " + t1 + "), LT(EVENT(\"score\"), " + t2 + "))";
        DslResult result = engine.evaluateTriggerRule(expression, event, profile, List.of());

        assertTrue(result.success(), "Trigger rule should succeed, got: " + result.errorMessage());
        assertInstanceOf(Boolean.class, result.value(), "Trigger rule value should be Boolean");
        boolean expected = score > t1 || score < t2;
        assertEquals(expected, result.value());
    }

    @Property(tries = 200)
    // Feature: dsl-engine, Property 21: Trigger Rule Evaluation Returns Boolean
    void notTriggerRuleReturnsCorrectBoolean(
            @ForAll @IntRange(min = -100, max = 100) int val,
            @ForAll @IntRange(min = -100, max = 100) int threshold) {
        PrismEvent event = makeEvent(Map.of("val", val));
        ProfileState profile = makeProfile(Map.of());

        String expression = "NOT(GT(EVENT(\"val\"), " + threshold + "))";
        DslResult result = engine.evaluateTriggerRule(expression, event, profile, List.of());

        assertTrue(result.success(), "Trigger rule should succeed, got: " + result.errorMessage());
        assertInstanceOf(Boolean.class, result.value(), "Trigger rule value should be Boolean");
        assertEquals(!(val > threshold), result.value());
    }

    private PrismEvent makeEvent(Map<String, Object> props) {
        return new PrismEvent(
                "evt-1", "proj-1", "test-event",
                System.currentTimeMillis(), System.currentTimeMillis(),
                "profile-1", new HashMap<>(props), new HashMap<>());
    }

    private ProfileState makeProfile(Map<String, Object> props) {
        return new ProfileState(
                "profile-1", "proj-1",
                System.currentTimeMillis(), System.currentTimeMillis(),
                new HashMap<>(props));
    }
}
