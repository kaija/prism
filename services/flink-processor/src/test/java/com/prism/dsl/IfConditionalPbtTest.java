package com.prism.dsl;

import com.prism.models.PrismEvent;
import net.jqwik.api.*;
import net.jqwik.api.constraints.DoubleRange;
import net.jqwik.api.constraints.IntRange;

import java.util.HashMap;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Property-based tests for IF conditional correctness.
 *
 * <p>Feature: dsl-engine, Property 11: IF Conditional Correctness</p>
 *
 * <p>For any boolean condition and two expressions, IF(condition, then_expr, else_expr)
 * SHALL return then_expr when condition is true and else_expr when condition is false.</p>
 *
 * <p><b>Validates: Requirements 11.1</b></p>
 */
class IfConditionalPbtTest {

    private final AviatorDslEngine engine;
    private final PrismEvent minimalEvent;

    IfConditionalPbtTest() {
        engine = new AviatorDslEngine();
        engine.init();
        minimalEvent = new PrismEvent(
                "test-id", "test-project", "test-event",
                System.currentTimeMillis(), System.currentTimeMillis(),
                "test-profile", new HashMap<>(), new HashMap<>()
        );
    }

    // --- Boolean literal condition with integer branches ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 11: IF Conditional Correctness
    void ifTrueReturnsFirstBranchForIntegers(
            @ForAll @IntRange(min = -1000, max = 1000) int thenVal,
            @ForAll @IntRange(min = -1000, max = 1000) int elseVal) {
        String dsl = "IF(true, " + thenVal + ", " + elseVal + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        assertTrue(result.success(), "IF(true,...) should succeed, got error: " + result.errorMessage());
        assertEquals(((Number) result.value()).longValue(), (long) thenVal,
                "IF(true, " + thenVal + ", " + elseVal + ") should return then branch");
    }

    @Property(tries = 200)
    // Feature: dsl-engine, Property 11: IF Conditional Correctness
    void ifFalseReturnsSecondBranchForIntegers(
            @ForAll @IntRange(min = -1000, max = 1000) int thenVal,
            @ForAll @IntRange(min = -1000, max = 1000) int elseVal) {
        String dsl = "IF(false, " + thenVal + ", " + elseVal + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        assertTrue(result.success(), "IF(false,...) should succeed, got error: " + result.errorMessage());
        assertEquals(((Number) result.value()).longValue(), (long) elseVal,
                "IF(false, " + thenVal + ", " + elseVal + ") should return else branch");
    }

    // --- Comparison-derived condition with integer branches ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 11: IF Conditional Correctness
    void ifWithComparisonConditionSelectsCorrectBranch(
            @ForAll @IntRange(min = -500, max = 500) int a,
            @ForAll @IntRange(min = -500, max = 500) int b,
            @ForAll @IntRange(min = -1000, max = 1000) int thenVal,
            @ForAll @IntRange(min = -1000, max = 1000) int elseVal) {
        String dsl = "IF(GT(" + a + ", " + b + "), " + thenVal + ", " + elseVal + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        assertTrue(result.success(), "IF(GT(...)) should succeed, got error: " + result.errorMessage());
        long expected = a > b ? thenVal : elseVal;
        assertEquals(expected, ((Number) result.value()).longValue(),
                "IF(GT(" + a + ", " + b + "), " + thenVal + ", " + elseVal + ") should select correct branch");
    }

    // --- Boolean literal condition with double branches ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 11: IF Conditional Correctness
    void ifTrueReturnsFirstBranchForDoubles(
            @ForAll @DoubleRange(min = -1000, max = 1000) double thenVal,
            @ForAll @DoubleRange(min = -1000, max = 1000) double elseVal) {
        String dsl = "IF(true, " + thenVal + ", " + elseVal + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        assertTrue(result.success(), "IF(true,...) should succeed, got error: " + result.errorMessage());
        assertEquals(thenVal, ((Number) result.value()).doubleValue(), 1e-9,
                "IF(true, " + thenVal + ", " + elseVal + ") should return then branch");
    }

    @Property(tries = 200)
    // Feature: dsl-engine, Property 11: IF Conditional Correctness
    void ifFalseReturnsSecondBranchForDoubles(
            @ForAll @DoubleRange(min = -1000, max = 1000) double thenVal,
            @ForAll @DoubleRange(min = -1000, max = 1000) double elseVal) {
        String dsl = "IF(false, " + thenVal + ", " + elseVal + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        assertTrue(result.success(), "IF(false,...) should succeed, got error: " + result.errorMessage());
        assertEquals(elseVal, ((Number) result.value()).doubleValue(), 1e-9,
                "IF(false, " + thenVal + ", " + elseVal + ") should return else branch");
    }

    // --- EQ-derived condition verifying branch selection ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 11: IF Conditional Correctness
    void ifWithEqConditionSelectsCorrectBranch(
            @ForAll @IntRange(min = -500, max = 500) int a,
            @ForAll @IntRange(min = -500, max = 500) int b,
            @ForAll @IntRange(min = -1000, max = 1000) int thenVal,
            @ForAll @IntRange(min = -1000, max = 1000) int elseVal) {
        String dsl = "IF(EQ(" + a + ", " + b + "), " + thenVal + ", " + elseVal + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        assertTrue(result.success(), "IF(EQ(...)) should succeed, got error: " + result.errorMessage());
        long expected = a == b ? thenVal : elseVal;
        assertEquals(expected, ((Number) result.value()).longValue(),
                "IF(EQ(" + a + ", " + b + "), " + thenVal + ", " + elseVal + ") should select correct branch");
    }

    // --- Boolean condition generated from arbitrary boolean ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 11: IF Conditional Correctness
    void ifWithArbitraryBooleanSelectsCorrectBranch(
            @ForAll boolean condition,
            @ForAll @IntRange(min = -1000, max = 1000) int thenVal,
            @ForAll @IntRange(min = -1000, max = 1000) int elseVal) {
        String dsl = "IF(" + condition + ", " + thenVal + ", " + elseVal + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        assertTrue(result.success(), "IF(" + condition + ",...) should succeed, got error: " + result.errorMessage());
        long expected = condition ? thenVal : elseVal;
        assertEquals(expected, ((Number) result.value()).longValue(),
                "IF(" + condition + ", " + thenVal + ", " + elseVal + ") should select correct branch");
    }
}
