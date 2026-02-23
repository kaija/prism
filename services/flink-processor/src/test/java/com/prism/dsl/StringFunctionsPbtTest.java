package com.prism.dsl;

import com.prism.models.PrismEvent;
import net.jqwik.api.*;
import net.jqwik.api.constraints.IntRange;
import net.jqwik.api.constraints.StringLength;

import java.util.HashMap;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Property-based tests for string function correctness.
 *
 * <p>Feature: dsl-engine, Property 10: String Function Correctness</p>
 *
 * <p>For any valid string inputs, the DSL string functions SHALL produce results
 * matching native string operations: CONTAINS↔contains, STARTS_WITH↔startsWith,
 * ENDS_WITH↔endsWith, UPPER↔toUpperCase, LOWER↔toLowerCase, TRIM↔trim,
 * LENGTH↔length, CONCAT↔concatenation, SUBSTRING↔substring, REPLACE↔replace,
 * SPLIT↔split.</p>
 *
 * <p><b>Validates: Requirements 10.1, 10.2, 10.3, 10.4</b></p>
 */
class StringFunctionsPbtTest {

    private final AviatorDslEngine engine;
    private final PrismEvent minimalEvent;

    StringFunctionsPbtTest() {
        engine = new AviatorDslEngine();
        engine.init();
        minimalEvent = new PrismEvent(
                "test-id", "test-project", "test-event",
                System.currentTimeMillis(), System.currentTimeMillis(),
                "test-profile", new HashMap<>(), new HashMap<>()
        );
    }

    // --- CONTAINS ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 10: String Function Correctness
    void containsMatchesNativeContains(
            @ForAll("safeStrings") String str,
            @ForAll("safeStrings") String substr) {
        String dsl = "CONTAINS(\"" + str + "\", \"" + substr + "\")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        boolean expected = str.contains(substr);
        assertTrue(result.success(), "CONTAINS should succeed, got: " + result.errorMessage());
        assertEquals(expected, result.value(),
                "CONTAINS(\"" + str + "\", \"" + substr + "\") should equal " + expected);
    }

    // --- STARTS_WITH ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 10: String Function Correctness
    void startsWithMatchesNativeStartsWith(
            @ForAll("safeStrings") String str,
            @ForAll("safeStrings") String prefix) {
        String dsl = "STARTS_WITH(\"" + str + "\", \"" + prefix + "\")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        boolean expected = str.startsWith(prefix);
        assertTrue(result.success(), "STARTS_WITH should succeed, got: " + result.errorMessage());
        assertEquals(expected, result.value(),
                "STARTS_WITH(\"" + str + "\", \"" + prefix + "\") should equal " + expected);
    }

    // --- ENDS_WITH ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 10: String Function Correctness
    void endsWithMatchesNativeEndsWith(
            @ForAll("safeStrings") String str,
            @ForAll("safeStrings") String suffix) {
        String dsl = "ENDS_WITH(\"" + str + "\", \"" + suffix + "\")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        boolean expected = str.endsWith(suffix);
        assertTrue(result.success(), "ENDS_WITH should succeed, got: " + result.errorMessage());
        assertEquals(expected, result.value(),
                "ENDS_WITH(\"" + str + "\", \"" + suffix + "\") should equal " + expected);
    }

    // --- UPPER ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 10: String Function Correctness
    void upperMatchesNativeToUpperCase(@ForAll("safeStrings") String str) {
        String dsl = "UPPER(\"" + str + "\")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        String expected = str.toUpperCase();
        assertTrue(result.success(), "UPPER should succeed, got: " + result.errorMessage());
        assertEquals(expected, result.value(),
                "UPPER(\"" + str + "\") should equal \"" + expected + "\"");
    }

    // --- LOWER ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 10: String Function Correctness
    void lowerMatchesNativeToLowerCase(@ForAll("safeStrings") String str) {
        String dsl = "LOWER(\"" + str + "\")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        String expected = str.toLowerCase();
        assertTrue(result.success(), "LOWER should succeed, got: " + result.errorMessage());
        assertEquals(expected, result.value(),
                "LOWER(\"" + str + "\") should equal \"" + expected + "\"");
    }

    // --- TRIM ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 10: String Function Correctness
    void trimMatchesNativeTrim(@ForAll("safeStringsWithSpaces") String str) {
        String dsl = "TRIM(\"" + str + "\")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        String expected = str.trim();
        assertTrue(result.success(), "TRIM should succeed, got: " + result.errorMessage());
        assertEquals(expected, result.value(),
                "TRIM(\"" + str + "\") should equal \"" + expected + "\"");
    }

    // --- LENGTH ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 10: String Function Correctness
    void lengthMatchesNativeLength(@ForAll("safeStrings") String str) {
        String dsl = "LENGTH(\"" + str + "\")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        long expected = str.length();
        assertTrue(result.success(), "LENGTH should succeed, got: " + result.errorMessage());
        assertEquals(expected, ((Number) result.value()).longValue(),
                "LENGTH(\"" + str + "\") should equal " + expected);
    }

    // --- CONCAT ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 10: String Function Correctness
    void concatMatchesNativeConcatenation(
            @ForAll("safeStrings") String str1,
            @ForAll("safeStrings") String str2) {
        String dsl = "CONCAT(\"" + str1 + "\", \"" + str2 + "\")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        String expected = str1 + str2;
        assertTrue(result.success(), "CONCAT should succeed, got: " + result.errorMessage());
        assertEquals(expected, result.value(),
                "CONCAT(\"" + str1 + "\", \"" + str2 + "\") should equal \"" + expected + "\"");
    }

    // --- SUBSTRING ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 10: String Function Correctness
    void substringMatchesNativeSubstring(
            @ForAll("nonEmptySafeStrings") String str,
            @ForAll @IntRange(min = 0, max = 20) int start,
            @ForAll @IntRange(min = 1, max = 10) int length) {
        // Ensure start is within bounds
        int safeStart = start % str.length();
        int safeLength = Math.min(length, str.length() - safeStart);

        String dsl = "SUBSTRING(\"" + str + "\", " + safeStart + ", " + safeLength + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        String expected = str.substring(safeStart, safeStart + safeLength);
        assertTrue(result.success(), "SUBSTRING should succeed, got: " + result.errorMessage());
        assertEquals(expected, result.value(),
                "SUBSTRING(\"" + str + "\", " + safeStart + ", " + safeLength + ") should equal \"" + expected + "\"");
    }

    // --- REPLACE ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 10: String Function Correctness
    void replaceMatchesNativeReplace(
            @ForAll("safeStrings") String str,
            @ForAll("safeStrings") String oldStr,
            @ForAll("safeStrings") String newStr) {
        String dsl = "REPLACE(\"" + str + "\", \"" + oldStr + "\", \"" + newStr + "\")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        String expected = str.replace(oldStr, newStr);
        assertTrue(result.success(), "REPLACE should succeed, got: " + result.errorMessage());
        assertEquals(expected, result.value(),
                "REPLACE should match native replace");
    }

    // --- SPLIT ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 10: String Function Correctness
    @SuppressWarnings("unchecked")
    void splitMatchesNativeSplit(
            @ForAll("safeStrings") String str,
            @ForAll("nonEmptySafeStrings") String delimiter) {
        String dsl = "SPLIT(\"" + str + "\", \"" + delimiter + "\")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        List<String> expected = List.of(str.split(java.util.regex.Pattern.quote(delimiter), -1));
        assertTrue(result.success(), "SPLIT should succeed, got: " + result.errorMessage());
        assertEquals(expected, result.value(),
                "SPLIT(\"" + str + "\", \"" + delimiter + "\") should match native split");
    }

    // --- Providers ---

    @Provide
    Arbitrary<String> safeStrings() {
        return Arbitraries.strings()
                .withCharRange('a', 'z')
                .withCharRange('A', 'Z')
                .withCharRange('0', '9')
                .ofMinLength(0)
                .ofMaxLength(20);
    }

    @Provide
    Arbitrary<String> nonEmptySafeStrings() {
        return Arbitraries.strings()
                .withCharRange('a', 'z')
                .withCharRange('A', 'Z')
                .withCharRange('0', '9')
                .ofMinLength(1)
                .ofMaxLength(20);
    }

    @Provide
    Arbitrary<String> safeStringsWithSpaces() {
        // Generate strings with optional leading/trailing spaces and alphanumeric core
        Arbitrary<String> spaces = Arbitraries.strings()
                .withChars(' ')
                .ofMinLength(0)
                .ofMaxLength(5);
        Arbitrary<String> core = Arbitraries.strings()
                .withCharRange('a', 'z')
                .withCharRange('A', 'Z')
                .withCharRange('0', '9')
                .ofMinLength(0)
                .ofMaxLength(15);
        return Combinators.combine(spaces, core, spaces)
                .as((leading, middle, trailing) -> leading + middle + trailing);
    }
}
