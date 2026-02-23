package com.prism.dsl;

import com.prism.models.PrismEvent;
import net.jqwik.api.*;
import net.jqwik.api.constraints.DoubleRange;
import net.jqwik.api.constraints.IntRange;

import java.util.HashMap;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Property-based tests for conversion function correctness (TO_NUMBER, TO_STRING, TO_BOOLEAN).
 *
 * <p>Feature: dsl-engine, Property 12: Conversion Function Correctness</p>
 *
 * <p>For any convertible value, TO_NUMBER SHALL produce the numeric equivalent,
 * TO_STRING SHALL produce the string representation, and TO_BOOLEAN SHALL produce
 * the boolean equivalent, matching native type conversion semantics.</p>
 *
 * <p><b>Validates: Requirements 12.1, 12.2, 12.3</b></p>
 */
class ConversionFunctionsPbtTest {

    private final AviatorDslEngine engine;
    private final PrismEvent minimalEvent;

    ConversionFunctionsPbtTest() {
        engine = new AviatorDslEngine();
        engine.init();
        minimalEvent = new PrismEvent(
                "test-id", "test-project", "test-event",
                System.currentTimeMillis(), System.currentTimeMillis(),
                "test-profile", new HashMap<>(), new HashMap<>()
        );
    }

    // ========== TO_NUMBER: numeric string → number ==========

    @Property(tries = 200)
    // Feature: dsl-engine, Property 12: Conversion Function Correctness
    void toNumberConvertsIntegerStringsToNumericEquivalent(
            @ForAll @IntRange(min = -10000, max = 10000) int value) {
        String dsl = "TO_NUMBER(\"" + value + "\")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        assertTrue(result.success(), "TO_NUMBER should succeed, got error: " + result.errorMessage());
        assertEquals((double) value, ((Number) result.value()).doubleValue(), 1e-9,
                "TO_NUMBER(\"" + value + "\") should produce " + value);
    }

    @Property(tries = 200)
    // Feature: dsl-engine, Property 12: Conversion Function Correctness
    void toNumberConvertsDecimalStringsToNumericEquivalent(
            @ForAll @DoubleRange(min = -1000, max = 1000) double value) {
        String dsl = "TO_NUMBER(\"" + value + "\")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        assertTrue(result.success(), "TO_NUMBER should succeed, got error: " + result.errorMessage());
        assertEquals(value, ((Number) result.value()).doubleValue(), 1e-9,
                "TO_NUMBER(\"" + value + "\") should produce " + value);
    }

    // ========== TO_NUMBER: number passthrough ==========

    @Property(tries = 200)
    // Feature: dsl-engine, Property 12: Conversion Function Correctness
    void toNumberPassesThroughIntegers(
            @ForAll @IntRange(min = -10000, max = 10000) int value) {
        String dsl = "TO_NUMBER(" + value + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        assertTrue(result.success(), "TO_NUMBER should succeed, got error: " + result.errorMessage());
        assertEquals((double) value, ((Number) result.value()).doubleValue(), 1e-9,
                "TO_NUMBER(" + value + ") should pass through as " + value);
    }

    @Property(tries = 200)
    // Feature: dsl-engine, Property 12: Conversion Function Correctness
    void toNumberPassesThroughDoubles(
            @ForAll @DoubleRange(min = -1000, max = 1000) double value) {
        String dsl = "TO_NUMBER(" + value + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        assertTrue(result.success(), "TO_NUMBER should succeed, got error: " + result.errorMessage());
        assertEquals(value, ((Number) result.value()).doubleValue(), 1e-9,
                "TO_NUMBER(" + value + ") should pass through as " + value);
    }

    // ========== TO_NUMBER: boolean → number ==========

    @Property(tries = 200)
    // Feature: dsl-engine, Property 12: Conversion Function Correctness
    void toNumberConvertsBooleanToNumericEquivalent(@ForAll boolean value) {
        String dsl = "TO_NUMBER(" + value + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        assertTrue(result.success(), "TO_NUMBER should succeed, got error: " + result.errorMessage());
        double expected = value ? 1.0 : 0.0;
        assertEquals(expected, ((Number) result.value()).doubleValue(), 1e-9,
                "TO_NUMBER(" + value + ") should produce " + expected);
    }

    // ========== TO_STRING: number → string ==========

    @Property(tries = 200)
    // Feature: dsl-engine, Property 12: Conversion Function Correctness
    void toStringConvertsIntegersToStringRepresentation(
            @ForAll @IntRange(min = -10000, max = 10000) int value) {
        String dsl = "TO_STRING(" + value + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        assertTrue(result.success(), "TO_STRING should succeed, got error: " + result.errorMessage());
        assertEquals(String.valueOf(value), result.value(),
                "TO_STRING(" + value + ") should produce \"" + value + "\"");
    }

    @Property(tries = 200)
    // Feature: dsl-engine, Property 12: Conversion Function Correctness
    void toStringConvertsDoublesToStringRepresentation(
            @ForAll @DoubleRange(min = -1000, max = 1000) double value) {
        String dsl = "TO_STRING(" + value + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        assertTrue(result.success(), "TO_STRING should succeed, got error: " + result.errorMessage());
        // The engine returns the native toString() of the value
        String resultStr = (String) result.value();
        assertNotNull(resultStr, "TO_STRING(" + value + ") should not return null");
        // Verify the string can be parsed back to the original value
        assertEquals(value, Double.parseDouble(resultStr), 1e-9,
                "TO_STRING(" + value + ") should produce a parseable string representation");
    }

    // ========== TO_STRING: boolean → string ==========

    @Property(tries = 200)
    // Feature: dsl-engine, Property 12: Conversion Function Correctness
    void toStringConvertsBooleanToStringRepresentation(@ForAll boolean value) {
        String dsl = "TO_STRING(" + value + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        assertTrue(result.success(), "TO_STRING should succeed, got error: " + result.errorMessage());
        assertEquals(String.valueOf(value), result.value(),
                "TO_STRING(" + value + ") should produce \"" + value + "\"");
    }

    // ========== TO_STRING: string passthrough ==========

    @Property(tries = 200)
    // Feature: dsl-engine, Property 12: Conversion Function Correctness
    void toStringPassesThroughStrings(@ForAll("safeStrings") String value) {
        String dsl = "TO_STRING(\"" + value + "\")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        assertTrue(result.success(), "TO_STRING should succeed, got error: " + result.errorMessage());
        assertEquals(value, result.value(),
                "TO_STRING(\"" + value + "\") should pass through as \"" + value + "\"");
    }

    // ========== TO_BOOLEAN: number → boolean ==========

    @Property(tries = 200)
    // Feature: dsl-engine, Property 12: Conversion Function Correctness
    void toBooleanConvertsNonZeroIntegersToTrue(
            @ForAll @IntRange(min = 1, max = 10000) int value) {
        String dsl = "TO_BOOLEAN(" + value + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        assertTrue(result.success(), "TO_BOOLEAN should succeed, got error: " + result.errorMessage());
        assertEquals(true, result.value(),
                "TO_BOOLEAN(" + value + ") should produce true for non-zero");
    }

    @Property(tries = 200)
    // Feature: dsl-engine, Property 12: Conversion Function Correctness
    void toBooleanConvertsNegativeIntegersToTrue(
            @ForAll @IntRange(min = -10000, max = -1) int value) {
        String dsl = "TO_BOOLEAN(" + value + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        assertTrue(result.success(), "TO_BOOLEAN should succeed, got error: " + result.errorMessage());
        assertEquals(true, result.value(),
                "TO_BOOLEAN(" + value + ") should produce true for non-zero");
    }

    @Property(tries = 100)
    // Feature: dsl-engine, Property 12: Conversion Function Correctness
    void toBooleanConvertsZeroToFalse() {
        String dsl = "TO_BOOLEAN(0)";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        assertTrue(result.success(), "TO_BOOLEAN should succeed, got error: " + result.errorMessage());
        assertEquals(false, result.value(), "TO_BOOLEAN(0) should produce false");
    }

    // ========== TO_BOOLEAN: string → boolean ==========

    @Property(tries = 200)
    // Feature: dsl-engine, Property 12: Conversion Function Correctness
    void toBooleanConvertsTrueStringToTrue(@ForAll("trueCaseVariants") String trueStr) {
        String dsl = "TO_BOOLEAN(\"" + trueStr + "\")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        assertTrue(result.success(), "TO_BOOLEAN should succeed, got error: " + result.errorMessage());
        assertEquals(true, result.value(),
                "TO_BOOLEAN(\"" + trueStr + "\") should produce true");
    }

    @Property(tries = 200)
    // Feature: dsl-engine, Property 12: Conversion Function Correctness
    void toBooleanConvertsNonTrueStringsToFalse(@ForAll("nonTrueStrings") String value) {
        String dsl = "TO_BOOLEAN(\"" + value + "\")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        assertTrue(result.success(), "TO_BOOLEAN should succeed, got error: " + result.errorMessage());
        assertEquals(false, result.value(),
                "TO_BOOLEAN(\"" + value + "\") should produce false for non-'true' string");
    }

    // ========== TO_BOOLEAN: boolean passthrough ==========

    @Property(tries = 200)
    // Feature: dsl-engine, Property 12: Conversion Function Correctness
    void toBooleanPassesThroughBooleans(@ForAll boolean value) {
        String dsl = "TO_BOOLEAN(" + value + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        assertTrue(result.success(), "TO_BOOLEAN should succeed, got error: " + result.errorMessage());
        assertEquals(value, result.value(),
                "TO_BOOLEAN(" + value + ") should pass through as " + value);
    }

    // ========== Providers ==========

    @Provide
    Arbitrary<String> safeStrings() {
        return Arbitraries.strings()
                .ofMinLength(0)
                .ofMaxLength(20)
                .alpha()
                .numeric();
    }

    @Provide
    Arbitrary<String> trueCaseVariants() {
        // Generate case variants of "true": "true", "True", "TRUE", "tRuE", etc.
        return Arbitraries.of("true", "True", "TRUE", "tRuE", "trUE", "TrUe");
    }

    @Provide
    Arbitrary<String> nonTrueStrings() {
        // Generate strings that are NOT case-insensitive "true"
        return Arbitraries.strings()
                .ofMinLength(1)
                .ofMaxLength(20)
                .alpha()
                .filter(s -> !"true".equalsIgnoreCase(s));
    }
}
