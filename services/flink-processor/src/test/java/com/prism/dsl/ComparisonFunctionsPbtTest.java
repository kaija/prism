package com.prism.dsl;

import com.prism.models.PrismEvent;
import net.jqwik.api.*;
import net.jqwik.api.constraints.DoubleRange;
import net.jqwik.api.constraints.IntRange;

import java.util.HashMap;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Property-based tests for comparison function correctness (EQ, NEQ, GT, LT, GTE, LTE).
 *
 * <p>Feature: dsl-engine, Property 5: Comparison Function Correctness</p>
 *
 * <p>For any pair of comparable values (a, b), the DSL comparison functions
 * (EQ, NEQ, GT, LT, GTE, LTE) SHALL produce results consistent with native
 * comparison operators: EQ(a,b) ↔ a==b, NEQ(a,b) ↔ a!=b, GT(a,b) ↔ a&gt;b,
 * LT(a,b) ↔ a&lt;b, GTE(a,b) ↔ a&gt;=b, LTE(a,b) ↔ a&lt;=b.</p>
 *
 * <p><b>Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6</b></p>
 */
class ComparisonFunctionsPbtTest {

    private final AviatorDslEngine engine;
    private final PrismEvent minimalEvent;

    ComparisonFunctionsPbtTest() {
        engine = new AviatorDslEngine();
        engine.init();
        minimalEvent = new PrismEvent(
                "test-id", "test-project", "test-event",
                System.currentTimeMillis(), System.currentTimeMillis(),
                "test-profile", new HashMap<>(), new HashMap<>()
        );
    }

    // --- Integer comparisons ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 5: Comparison Function Correctness
    void eqMatchesNativeEqualityForIntegers(
            @ForAll @IntRange(min = -1000, max = 1000) int a,
            @ForAll @IntRange(min = -1000, max = 1000) int b) {
        String dsl = "EQ(" + a + ", " + b + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        boolean expected = a == b;
        assertTrue(result.success(), "EQ evaluation should succeed, got error: " + result.errorMessage());
        assertEquals(expected, result.value(), "EQ(" + a + ", " + b + ") should be " + expected);
    }

    @Property(tries = 200)
    // Feature: dsl-engine, Property 5: Comparison Function Correctness
    void neqMatchesNativeInequalityForIntegers(
            @ForAll @IntRange(min = -1000, max = 1000) int a,
            @ForAll @IntRange(min = -1000, max = 1000) int b) {
        String dsl = "NEQ(" + a + ", " + b + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        boolean expected = a != b;
        assertTrue(result.success(), "NEQ evaluation should succeed, got error: " + result.errorMessage());
        assertEquals(expected, result.value(), "NEQ(" + a + ", " + b + ") should be " + expected);
    }

    @Property(tries = 200)
    // Feature: dsl-engine, Property 5: Comparison Function Correctness
    void gtMatchesNativeGreaterThanForIntegers(
            @ForAll @IntRange(min = -1000, max = 1000) int a,
            @ForAll @IntRange(min = -1000, max = 1000) int b) {
        String dsl = "GT(" + a + ", " + b + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        boolean expected = a > b;
        assertTrue(result.success(), "GT evaluation should succeed, got error: " + result.errorMessage());
        assertEquals(expected, result.value(), "GT(" + a + ", " + b + ") should be " + expected);
    }

    @Property(tries = 200)
    // Feature: dsl-engine, Property 5: Comparison Function Correctness
    void ltMatchesNativeLessThanForIntegers(
            @ForAll @IntRange(min = -1000, max = 1000) int a,
            @ForAll @IntRange(min = -1000, max = 1000) int b) {
        String dsl = "LT(" + a + ", " + b + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        boolean expected = a < b;
        assertTrue(result.success(), "LT evaluation should succeed, got error: " + result.errorMessage());
        assertEquals(expected, result.value(), "LT(" + a + ", " + b + ") should be " + expected);
    }

    @Property(tries = 200)
    // Feature: dsl-engine, Property 5: Comparison Function Correctness
    void gteMatchesNativeGreaterThanOrEqualForIntegers(
            @ForAll @IntRange(min = -1000, max = 1000) int a,
            @ForAll @IntRange(min = -1000, max = 1000) int b) {
        String dsl = "GTE(" + a + ", " + b + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        boolean expected = a >= b;
        assertTrue(result.success(), "GTE evaluation should succeed, got error: " + result.errorMessage());
        assertEquals(expected, result.value(), "GTE(" + a + ", " + b + ") should be " + expected);
    }

    @Property(tries = 200)
    // Feature: dsl-engine, Property 5: Comparison Function Correctness
    void lteMatchesNativeLessThanOrEqualForIntegers(
            @ForAll @IntRange(min = -1000, max = 1000) int a,
            @ForAll @IntRange(min = -1000, max = 1000) int b) {
        String dsl = "LTE(" + a + ", " + b + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        boolean expected = a <= b;
        assertTrue(result.success(), "LTE evaluation should succeed, got error: " + result.errorMessage());
        assertEquals(expected, result.value(), "LTE(" + a + ", " + b + ") should be " + expected);
    }

    // --- Double comparisons ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 5: Comparison Function Correctness
    void eqMatchesNativeEqualityForDoubles(
            @ForAll @DoubleRange(min = -1000, max = 1000) double a,
            @ForAll @DoubleRange(min = -1000, max = 1000) double b) {
        String dsl = "EQ(" + a + ", " + b + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        boolean expected = Double.compare(a, b) == 0;
        assertTrue(result.success(), "EQ evaluation should succeed, got error: " + result.errorMessage());
        assertEquals(expected, result.value(), "EQ(" + a + ", " + b + ") should be " + expected);
    }

    @Property(tries = 200)
    // Feature: dsl-engine, Property 5: Comparison Function Correctness
    void neqMatchesNativeInequalityForDoubles(
            @ForAll @DoubleRange(min = -1000, max = 1000) double a,
            @ForAll @DoubleRange(min = -1000, max = 1000) double b) {
        String dsl = "NEQ(" + a + ", " + b + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        boolean expected = Double.compare(a, b) != 0;
        assertTrue(result.success(), "NEQ evaluation should succeed, got error: " + result.errorMessage());
        assertEquals(expected, result.value(), "NEQ(" + a + ", " + b + ") should be " + expected);
    }

    @Property(tries = 200)
    // Feature: dsl-engine, Property 5: Comparison Function Correctness
    void gtMatchesNativeGreaterThanForDoubles(
            @ForAll @DoubleRange(min = -1000, max = 1000) double a,
            @ForAll @DoubleRange(min = -1000, max = 1000) double b) {
        String dsl = "GT(" + a + ", " + b + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        boolean expected = a > b;
        assertTrue(result.success(), "GT evaluation should succeed, got error: " + result.errorMessage());
        assertEquals(expected, result.value(), "GT(" + a + ", " + b + ") should be " + expected);
    }

    @Property(tries = 200)
    // Feature: dsl-engine, Property 5: Comparison Function Correctness
    void ltMatchesNativeLessThanForDoubles(
            @ForAll @DoubleRange(min = -1000, max = 1000) double a,
            @ForAll @DoubleRange(min = -1000, max = 1000) double b) {
        String dsl = "LT(" + a + ", " + b + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        boolean expected = a < b;
        assertTrue(result.success(), "LT evaluation should succeed, got error: " + result.errorMessage());
        assertEquals(expected, result.value(), "LT(" + a + ", " + b + ") should be " + expected);
    }

    @Property(tries = 200)
    // Feature: dsl-engine, Property 5: Comparison Function Correctness
    void gteMatchesNativeGreaterThanOrEqualForDoubles(
            @ForAll @DoubleRange(min = -1000, max = 1000) double a,
            @ForAll @DoubleRange(min = -1000, max = 1000) double b) {
        String dsl = "GTE(" + a + ", " + b + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        boolean expected = a >= b;
        assertTrue(result.success(), "GTE evaluation should succeed, got error: " + result.errorMessage());
        assertEquals(expected, result.value(), "GTE(" + a + ", " + b + ") should be " + expected);
    }

    @Property(tries = 200)
    // Feature: dsl-engine, Property 5: Comparison Function Correctness
    void lteMatchesNativeLessThanOrEqualForDoubles(
            @ForAll @DoubleRange(min = -1000, max = 1000) double a,
            @ForAll @DoubleRange(min = -1000, max = 1000) double b) {
        String dsl = "LTE(" + a + ", " + b + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        boolean expected = a <= b;
        assertTrue(result.success(), "LTE evaluation should succeed, got error: " + result.errorMessage());
        assertEquals(expected, result.value(), "LTE(" + a + ", " + b + ") should be " + expected);
    }

    // --- String equality comparisons (EQ/NEQ only) ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 5: Comparison Function Correctness
    void eqMatchesNativeEqualityForStrings(@ForAll("safeStrings") String a, @ForAll("safeStrings") String b) {
        String dsl = "EQ(\"" + a + "\", \"" + b + "\")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        boolean expected = a.equals(b);
        assertTrue(result.success(), "EQ evaluation should succeed, got error: " + result.errorMessage());
        assertEquals(expected, result.value(), "EQ(\"" + a + "\", \"" + b + "\") should be " + expected);
    }

    @Property(tries = 200)
    // Feature: dsl-engine, Property 5: Comparison Function Correctness
    void neqMatchesNativeInequalityForStrings(@ForAll("safeStrings") String a, @ForAll("safeStrings") String b) {
        String dsl = "NEQ(\"" + a + "\", \"" + b + "\")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        boolean expected = !a.equals(b);
        assertTrue(result.success(), "NEQ evaluation should succeed, got error: " + result.errorMessage());
        assertEquals(expected, result.value(), "NEQ(\"" + a + "\", \"" + b + "\") should be " + expected);
    }

    @Provide
    Arbitrary<String> safeStrings() {
        return Arbitraries.strings()
                .ofMinLength(0)
                .ofMaxLength(20)
                .alpha()
                .numeric();
    }
}
