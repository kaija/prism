package com.prism.dsl;

import com.prism.models.PrismEvent;
import net.jqwik.api.*;
import net.jqwik.api.constraints.DoubleRange;
import net.jqwik.api.constraints.IntRange;

import java.util.HashMap;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Property-based tests for mathematical function correctness.
 *
 * <p>Feature: dsl-engine, Property 7: Mathematical Function Correctness</p>
 *
 * <p>For any valid numeric inputs (within domain constraints), the DSL math
 * functions SHALL produce results matching native math operations:
 * ADD↔+, SUBTRACT↔-, MULTIPLY↔*, DIVIDE↔/, MOD↔%, POW↔pow,
 * ABS↔abs, ROUND↔round, CEIL↔ceil, FLOOR↔floor, SQRT↔sqrt, LOG↔log, EXP↔exp.</p>
 *
 * <p><b>Validates: Requirements 7.1, 7.2</b></p>
 */
class MathFunctionsPbtTest {

    private static final double DELTA = 0.001;

    private final AviatorDslEngine engine;
    private final PrismEvent minimalEvent;

    MathFunctionsPbtTest() {
        engine = new AviatorDslEngine();
        engine.init();
        minimalEvent = new PrismEvent(
                "test-id", "test-project", "test-event",
                System.currentTimeMillis(), System.currentTimeMillis(),
                "test-profile", new HashMap<>(), new HashMap<>()
        );
    }

    // --- Binary: ADD ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 7: Mathematical Function Correctness
    void addMatchesNativeAddition(
            @ForAll @DoubleRange(min = -1000, max = 1000) double a,
            @ForAll @DoubleRange(min = -1000, max = 1000) double b) {
        String dsl = "ADD(" + a + ", " + b + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        double expected = a + b;
        assertTrue(result.success(), "ADD should succeed, got: " + result.errorMessage());
        assertEquals(expected, ((Number) result.value()).doubleValue(), DELTA,
                "ADD(" + a + ", " + b + ") should equal " + expected);
    }

    // --- Binary: SUBTRACT ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 7: Mathematical Function Correctness
    void subtractMatchesNativeSubtraction(
            @ForAll @DoubleRange(min = -1000, max = 1000) double a,
            @ForAll @DoubleRange(min = -1000, max = 1000) double b) {
        String dsl = "SUBTRACT(" + a + ", " + b + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        double expected = a - b;
        assertTrue(result.success(), "SUBTRACT should succeed, got: " + result.errorMessage());
        assertEquals(expected, ((Number) result.value()).doubleValue(), DELTA,
                "SUBTRACT(" + a + ", " + b + ") should equal " + expected);
    }

    // --- Binary: MULTIPLY ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 7: Mathematical Function Correctness
    void multiplyMatchesNativeMultiplication(
            @ForAll @DoubleRange(min = -100, max = 100) double a,
            @ForAll @DoubleRange(min = -100, max = 100) double b) {
        String dsl = "MULTIPLY(" + a + ", " + b + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        double expected = a * b;
        assertTrue(result.success(), "MULTIPLY should succeed, got: " + result.errorMessage());
        assertEquals(expected, ((Number) result.value()).doubleValue(), DELTA,
                "MULTIPLY(" + a + ", " + b + ") should equal " + expected);
    }

    // --- Binary: DIVIDE ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 7: Mathematical Function Correctness
    void divideMatchesNativeDivision(
            @ForAll @DoubleRange(min = -1000, max = 1000) double a,
            @ForAll("nonZeroDoubles") double b) {
        String dsl = "DIVIDE(" + a + ", " + b + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        double expected = a / b;
        assertTrue(result.success(), "DIVIDE should succeed, got: " + result.errorMessage());
        assertEquals(expected, ((Number) result.value()).doubleValue(), DELTA,
                "DIVIDE(" + a + ", " + b + ") should equal " + expected);
    }

    // --- Binary: MOD (integer inputs to avoid floating-point precision issues) ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 7: Mathematical Function Correctness
    void modMatchesNativeModulo(
            @ForAll @IntRange(min = -1000, max = 1000) int a,
            @ForAll("nonZeroIntegers") int b) {
        String dsl = "MOD(" + a + ", " + b + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        long expected = a % b;
        assertTrue(result.success(), "MOD should succeed, got: " + result.errorMessage());
        assertEquals(expected, ((Number) result.value()).longValue(),
                "MOD(" + a + ", " + b + ") should equal " + expected);
    }

    // --- Binary: POW ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 7: Mathematical Function Correctness
    void powMatchesNativePow(
            @ForAll @DoubleRange(min = -10, max = 10) double base,
            @ForAll @DoubleRange(min = -5, max = 5) double exp) {
        double expected = Math.pow(base, exp);
        // Skip cases that produce NaN or Infinity
        if (Double.isNaN(expected) || Double.isInfinite(expected)) return;

        String dsl = "POW(" + base + ", " + exp + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        assertTrue(result.success(), "POW should succeed, got: " + result.errorMessage());
        assertEquals(expected, ((Number) result.value()).doubleValue(), DELTA,
                "POW(" + base + ", " + exp + ") should equal " + expected);
    }

    // --- Unary: ABS ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 7: Mathematical Function Correctness
    void absMatchesNativeAbs(
            @ForAll @DoubleRange(min = -1000, max = 1000) double x) {
        String dsl = "ABS(" + x + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        double expected = Math.abs(x);
        assertTrue(result.success(), "ABS should succeed, got: " + result.errorMessage());
        assertEquals(expected, ((Number) result.value()).doubleValue(), DELTA,
                "ABS(" + x + ") should equal " + expected);
    }

    // --- Unary: ROUND ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 7: Mathematical Function Correctness
    void roundMatchesNativeRound(
            @ForAll @DoubleRange(min = -1000, max = 1000) double x) {
        String dsl = "ROUND(" + x + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        double expected = Math.round(x);
        assertTrue(result.success(), "ROUND should succeed, got: " + result.errorMessage());
        assertEquals(expected, ((Number) result.value()).doubleValue(), DELTA,
                "ROUND(" + x + ") should equal " + expected);
    }

    // --- Unary: CEIL ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 7: Mathematical Function Correctness
    void ceilMatchesNativeCeil(
            @ForAll @DoubleRange(min = -1000, max = 1000) double x) {
        String dsl = "CEIL(" + x + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        double expected = Math.ceil(x);
        assertTrue(result.success(), "CEIL should succeed, got: " + result.errorMessage());
        assertEquals(expected, ((Number) result.value()).doubleValue(), DELTA,
                "CEIL(" + x + ") should equal " + expected);
    }

    // --- Unary: FLOOR ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 7: Mathematical Function Correctness
    void floorMatchesNativeFloor(
            @ForAll @DoubleRange(min = -1000, max = 1000) double x) {
        String dsl = "FLOOR(" + x + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        double expected = Math.floor(x);
        assertTrue(result.success(), "FLOOR should succeed, got: " + result.errorMessage());
        assertEquals(expected, ((Number) result.value()).doubleValue(), DELTA,
                "FLOOR(" + x + ") should equal " + expected);
    }

    // --- Unary: SQRT ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 7: Mathematical Function Correctness
    void sqrtMatchesNativeSqrt(
            @ForAll @DoubleRange(min = 0, max = 10000) double x) {
        String dsl = "SQRT(" + x + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        double expected = Math.sqrt(x);
        assertTrue(result.success(), "SQRT should succeed, got: " + result.errorMessage());
        assertEquals(expected, ((Number) result.value()).doubleValue(), DELTA,
                "SQRT(" + x + ") should equal " + expected);
    }

    // --- Unary: LOG ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 7: Mathematical Function Correctness
    void logMatchesNativeLog(@ForAll("positiveDoubles") double x) {
        String dsl = "LOG(" + x + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        double expected = Math.log(x);
        assertTrue(result.success(), "LOG should succeed, got: " + result.errorMessage());
        assertEquals(expected, ((Number) result.value()).doubleValue(), DELTA,
                "LOG(" + x + ") should equal " + expected);
    }

    // --- Unary: EXP ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 7: Mathematical Function Correctness
    void expMatchesNativeExp(
            @ForAll @DoubleRange(min = -20, max = 20) double x) {
        String dsl = "EXP(" + x + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        double expected = Math.exp(x);
        assertTrue(result.success(), "EXP should succeed, got: " + result.errorMessage());
        assertEquals(expected, ((Number) result.value()).doubleValue(), DELTA,
                "EXP(" + x + ") should equal " + expected);
    }

    // --- Providers ---

    @Provide
    Arbitrary<Double> nonZeroDoubles() {
        return Arbitraries.doubles().between(-1000, 1000)
                .filter(d -> Math.abs(d) > 0.001);
    }

    @Provide
    Arbitrary<Integer> nonZeroIntegers() {
        return Arbitraries.integers().between(-1000, 1000)
                .filter(i -> i != 0);
    }

    @Provide
    Arbitrary<Double> positiveDoubles() {
        return Arbitraries.doubles().between(0.01, 10000.0);
    }
}
