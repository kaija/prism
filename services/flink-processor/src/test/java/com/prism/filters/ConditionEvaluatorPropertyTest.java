package com.prism.filters;

import com.prism.models.Condition;
import net.jqwik.api.*;
import net.jqwik.api.constraints.*;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

// Feature: flink-processor, Property 10: Condition evaluator correctness
// Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5
class ConditionEvaluatorPropertyTest {

    // --- Helpers ---

    private Map<String, Object> contextWithValue(String attribute, Object value) {
        Map<String, Object> context = new HashMap<>();
        String[] segments = attribute.split("\\.");
        if (segments.length == 1) {
            context.put(attribute, value);
        } else {
            // Build nested map for dotted paths
            Map<String, Object> current = context;
            for (int i = 0; i < segments.length - 1; i++) {
                Map<String, Object> nested = new HashMap<>();
                current.put(segments[i], nested);
                current = nested;
            }
            current.put(segments[segments.length - 1], value);
        }
        return context;
    }

    // --- Property: String "is" operator returns true iff value equals comparison ---

    @Property(tries = 100)
    void stringIsOperator(
            @ForAll("stringValues") String contextValue,
            @ForAll("stringValues") String comparisonValue) {

        String attr = "event.props.name";
        Condition condition = new Condition(attr, "is", comparisonValue);
        Map<String, Object> context = contextWithValue(attr, contextValue);

        boolean expected = contextValue.equals(comparisonValue);
        boolean actual = ConditionEvaluator.evaluate(condition, context);

        assertEquals(expected, actual,
                String.format("is: '%s' vs '%s'", contextValue, comparisonValue));
    }

    // --- Property: String "not_is" operator returns true iff value does not equal comparison ---

    @Property(tries = 100)
    void stringNotIsOperator(
            @ForAll("stringValues") String contextValue,
            @ForAll("stringValues") String comparisonValue) {

        String attr = "event.props.name";
        Condition condition = new Condition(attr, "not_is", comparisonValue);
        Map<String, Object> context = contextWithValue(attr, contextValue);

        boolean expected = !contextValue.equals(comparisonValue);
        boolean actual = ConditionEvaluator.evaluate(condition, context);

        assertEquals(expected, actual,
                String.format("not_is: '%s' vs '%s'", contextValue, comparisonValue));
    }

    // --- Property: String "contain" operator returns true iff value contains comparison ---

    @Property(tries = 100)
    void stringContainOperator(
            @ForAll("stringValues") String contextValue,
            @ForAll("stringValues") String comparisonValue) {

        String attr = "props.tag";
        Condition condition = new Condition(attr, "contain", comparisonValue);
        Map<String, Object> context = contextWithValue(attr, contextValue);

        boolean expected = contextValue.contains(comparisonValue);
        boolean actual = ConditionEvaluator.evaluate(condition, context);

        assertEquals(expected, actual,
                String.format("contain: '%s' contains '%s'", contextValue, comparisonValue));
    }

    // --- Property: String "not_contain" operator ---

    @Property(tries = 100)
    void stringNotContainOperator(
            @ForAll("stringValues") String contextValue,
            @ForAll("stringValues") String comparisonValue) {

        String attr = "props.tag";
        Condition condition = new Condition(attr, "not_contain", comparisonValue);
        Map<String, Object> context = contextWithValue(attr, contextValue);

        boolean expected = !contextValue.contains(comparisonValue);
        boolean actual = ConditionEvaluator.evaluate(condition, context);

        assertEquals(expected, actual);
    }

    // --- Property: String "start_with" operator ---

    @Property(tries = 100)
    void stringStartWithOperator(
            @ForAll("stringValues") String contextValue,
            @ForAll("stringValues") String comparisonValue) {

        String attr = "event.props.url";
        Condition condition = new Condition(attr, "start_with", comparisonValue);
        Map<String, Object> context = contextWithValue(attr, contextValue);

        boolean expected = contextValue.startsWith(comparisonValue);
        boolean actual = ConditionEvaluator.evaluate(condition, context);

        assertEquals(expected, actual);
    }

    // --- Property: String "not_start_with" operator ---

    @Property(tries = 100)
    void stringNotStartWithOperator(
            @ForAll("stringValues") String contextValue,
            @ForAll("stringValues") String comparisonValue) {

        String attr = "event.props.url";
        Condition condition = new Condition(attr, "not_start_with", comparisonValue);
        Map<String, Object> context = contextWithValue(attr, contextValue);

        boolean expected = !contextValue.startsWith(comparisonValue);
        boolean actual = ConditionEvaluator.evaluate(condition, context);

        assertEquals(expected, actual);
    }

    // --- Property: String "end_with" operator ---

    @Property(tries = 100)
    void stringEndWithOperator(
            @ForAll("stringValues") String contextValue,
            @ForAll("stringValues") String comparisonValue) {

        String attr = "event.props.ext";
        Condition condition = new Condition(attr, "end_with", comparisonValue);
        Map<String, Object> context = contextWithValue(attr, contextValue);

        boolean expected = contextValue.endsWith(comparisonValue);
        boolean actual = ConditionEvaluator.evaluate(condition, context);

        assertEquals(expected, actual);
    }

    // --- Property: String "not_end_with" operator ---

    @Property(tries = 100)
    void stringNotEndWithOperator(
            @ForAll("stringValues") String contextValue,
            @ForAll("stringValues") String comparisonValue) {

        String attr = "event.props.ext";
        Condition condition = new Condition(attr, "not_end_with", comparisonValue);
        Map<String, Object> context = contextWithValue(attr, contextValue);

        boolean expected = !contextValue.endsWith(comparisonValue);
        boolean actual = ConditionEvaluator.evaluate(condition, context);

        assertEquals(expected, actual);
    }

    // --- Property: Boolean "is_true" operator returns true iff value is Boolean.TRUE ---

    @Property(tries = 100)
    void booleanIsTrueOperator(@ForAll boolean contextValue) {

        String attr = "profile.props.active";
        Condition condition = new Condition(attr, "is_true", null);
        Map<String, Object> context = contextWithValue(attr, contextValue);

        boolean expected = contextValue;
        boolean actual = ConditionEvaluator.evaluate(condition, context);

        assertEquals(expected, actual,
                String.format("is_true: value=%s", contextValue));
    }

    // --- Property: Boolean "is_false" operator returns true iff value is Boolean.FALSE ---

    @Property(tries = 100)
    void booleanIsFalseOperator(@ForAll boolean contextValue) {

        String attr = "profile.props.active";
        Condition condition = new Condition(attr, "is_false", null);
        Map<String, Object> context = contextWithValue(attr, contextValue);

        boolean expected = !contextValue;
        boolean actual = ConditionEvaluator.evaluate(condition, context);

        assertEquals(expected, actual,
                String.format("is_false: value=%s", contextValue));
    }

    // --- Property: Number "equal" operator ---

    @Property(tries = 100)
    void numberEqualOperator(
            @ForAll("finiteDoubles") double contextValue,
            @ForAll("finiteDoubles") double comparisonValue) {

        String attr = "event.props.amount";
        Condition condition = new Condition(attr, "equal", String.valueOf(comparisonValue));
        Map<String, Object> context = contextWithValue(attr, contextValue);

        boolean expected = contextValue == comparisonValue;
        boolean actual = ConditionEvaluator.evaluate(condition, context);

        assertEquals(expected, actual,
                String.format("equal: %f vs %f", contextValue, comparisonValue));
    }

    // --- Property: Number "not_equal" operator ---

    @Property(tries = 100)
    void numberNotEqualOperator(
            @ForAll("finiteDoubles") double contextValue,
            @ForAll("finiteDoubles") double comparisonValue) {

        String attr = "event.props.amount";
        Condition condition = new Condition(attr, "not_equal", String.valueOf(comparisonValue));
        Map<String, Object> context = contextWithValue(attr, contextValue);

        boolean expected = contextValue != comparisonValue;
        boolean actual = ConditionEvaluator.evaluate(condition, context);

        assertEquals(expected, actual,
                String.format("not_equal: %f vs %f", contextValue, comparisonValue));
    }

    // --- Property: Number "larger" operator ---

    @Property(tries = 100)
    void numberLargerOperator(
            @ForAll("finiteDoubles") double contextValue,
            @ForAll("finiteDoubles") double comparisonValue) {

        String attr = "event.props.score";
        Condition condition = new Condition(attr, "larger", String.valueOf(comparisonValue));
        Map<String, Object> context = contextWithValue(attr, contextValue);

        boolean expected = contextValue > comparisonValue;
        boolean actual = ConditionEvaluator.evaluate(condition, context);

        assertEquals(expected, actual,
                String.format("larger: %f > %f", contextValue, comparisonValue));
    }

    // --- Property: Number "less" operator ---

    @Property(tries = 100)
    void numberLessOperator(
            @ForAll("finiteDoubles") double contextValue,
            @ForAll("finiteDoubles") double comparisonValue) {

        String attr = "event.props.score";
        Condition condition = new Condition(attr, "less", String.valueOf(comparisonValue));
        Map<String, Object> context = contextWithValue(attr, contextValue);

        boolean expected = contextValue < comparisonValue;
        boolean actual = ConditionEvaluator.evaluate(condition, context);

        assertEquals(expected, actual,
                String.format("less: %f < %f", contextValue, comparisonValue));
    }

    // --- Property: Missing attribute always returns false ---

    @Property(tries = 100)
    void missingAttributeReturnsFalse(
            @ForAll("allOperators") String operator,
            @ForAll("stringValues") String comparisonValue) {

        // Use an attribute path that does NOT exist in the context
        Condition condition = new Condition("nonexistent.path.attr", operator, comparisonValue);
        Map<String, Object> context = Map.of("other", "data");

        assertFalse(ConditionEvaluator.evaluate(condition, context),
                "Missing attribute should always return false for operator: " + operator);
    }

    // --- Property: Number operators work with integer context values ---

    @Property(tries = 100)
    void numberOperatorsWithIntegerValues(
            @ForAll @IntRange(min = -1000, max = 1000) int contextValue,
            @ForAll @IntRange(min = -1000, max = 1000) int comparisonValue,
            @ForAll("numberOperators") String operator) {

        String attr = "event.props.count";
        Condition condition = new Condition(attr, operator, String.valueOf(comparisonValue));
        Map<String, Object> context = contextWithValue(attr, contextValue);

        boolean expected = switch (operator) {
            case "equal" -> (double) contextValue == (double) comparisonValue;
            case "not_equal" -> (double) contextValue != (double) comparisonValue;
            case "larger" -> (double) contextValue > (double) comparisonValue;
            case "less" -> (double) contextValue < (double) comparisonValue;
            default -> false;
        };
        boolean actual = ConditionEvaluator.evaluate(condition, context);

        assertEquals(expected, actual,
                String.format("%s: %d vs %d", operator, contextValue, comparisonValue));
    }

    // --- Providers ---

    @Provide
    Arbitrary<String> stringValues() {
        return Arbitraries.of(
                "hello", "world", "hello world", "test", "foobar",
                "foo", "bar", "baz", "", "Hello", "HELLO",
                "prefix_value", "value_suffix", "pre_mid_suf");
    }

    @Provide
    Arbitrary<Double> finiteDoubles() {
        return Arbitraries.doubles().between(-1_000_000.0, 1_000_000.0)
                .filter(Double::isFinite);
    }

    @Provide
    Arbitrary<String> allOperators() {
        return Arbitraries.of(
                "is", "not_is", "contain", "not_contain",
                "start_with", "not_start_with", "end_with", "not_end_with",
                "is_true", "is_false",
                "equal", "not_equal", "larger", "less");
    }

    @Provide
    Arbitrary<String> numberOperators() {
        return Arbitraries.of("equal", "not_equal", "larger", "less");
    }
}
