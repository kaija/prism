package com.prism.filters;

import com.prism.models.Condition;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ConditionEvaluatorTest {

    // --- Helper ---

    private Map<String, Object> contextWith(String path, Object value) {
        // Build a nested map from a dotted path
        String[] segments = path.split("\\.");
        Map<String, Object> root = new HashMap<>();
        Map<String, Object> current = root;
        for (int i = 0; i < segments.length - 1; i++) {
            Map<String, Object> next = new HashMap<>();
            current.put(segments[i], next);
            current = next;
        }
        current.put(segments[segments.length - 1], value);
        return root;
    }

    // --- String operators ---

    @Test
    void is_matchingString_returnsTrue() {
        Condition c = new Condition("event.props.status", "is", "active");
        Map<String, Object> ctx = contextWith("event.props.status", "active");
        assertTrue(ConditionEvaluator.evaluate(c, ctx));
    }

    @Test
    void is_nonMatchingString_returnsFalse() {
        Condition c = new Condition("event.props.status", "is", "active");
        Map<String, Object> ctx = contextWith("event.props.status", "inactive");
        assertFalse(ConditionEvaluator.evaluate(c, ctx));
    }

    @Test
    void not_is_differentString_returnsTrue() {
        Condition c = new Condition("event.props.status", "not_is", "active");
        Map<String, Object> ctx = contextWith("event.props.status", "inactive");
        assertTrue(ConditionEvaluator.evaluate(c, ctx));
    }

    @Test
    void contain_substringPresent_returnsTrue() {
        Condition c = new Condition("event.props.name", "contain", "world");
        Map<String, Object> ctx = contextWith("event.props.name", "hello world");
        assertTrue(ConditionEvaluator.evaluate(c, ctx));
    }

    @Test
    void contain_substringAbsent_returnsFalse() {
        Condition c = new Condition("event.props.name", "contain", "xyz");
        Map<String, Object> ctx = contextWith("event.props.name", "hello world");
        assertFalse(ConditionEvaluator.evaluate(c, ctx));
    }

    @Test
    void not_contain_substringAbsent_returnsTrue() {
        Condition c = new Condition("event.props.name", "not_contain", "xyz");
        Map<String, Object> ctx = contextWith("event.props.name", "hello world");
        assertTrue(ConditionEvaluator.evaluate(c, ctx));
    }

    @Test
    void start_with_matchingPrefix_returnsTrue() {
        Condition c = new Condition("event.props.url", "start_with", "https://");
        Map<String, Object> ctx = contextWith("event.props.url", "https://example.com");
        assertTrue(ConditionEvaluator.evaluate(c, ctx));
    }

    @Test
    void not_start_with_differentPrefix_returnsTrue() {
        Condition c = new Condition("event.props.url", "not_start_with", "http://");
        Map<String, Object> ctx = contextWith("event.props.url", "https://example.com");
        assertTrue(ConditionEvaluator.evaluate(c, ctx));
    }

    @Test
    void end_with_matchingSuffix_returnsTrue() {
        Condition c = new Condition("event.props.email", "end_with", "@test.com");
        Map<String, Object> ctx = contextWith("event.props.email", "user@test.com");
        assertTrue(ConditionEvaluator.evaluate(c, ctx));
    }

    @Test
    void not_end_with_differentSuffix_returnsTrue() {
        Condition c = new Condition("event.props.email", "not_end_with", "@test.com");
        Map<String, Object> ctx = contextWith("event.props.email", "user@example.com");
        assertTrue(ConditionEvaluator.evaluate(c, ctx));
    }

    // --- Boolean operators ---

    @Test
    void is_true_withTrueValue_returnsTrue() {
        Condition c = new Condition("event.props.active", "is_true", null);
        Map<String, Object> ctx = contextWith("event.props.active", Boolean.TRUE);
        assertTrue(ConditionEvaluator.evaluate(c, ctx));
    }

    @Test
    void is_true_withFalseValue_returnsFalse() {
        Condition c = new Condition("event.props.active", "is_true", null);
        Map<String, Object> ctx = contextWith("event.props.active", Boolean.FALSE);
        assertFalse(ConditionEvaluator.evaluate(c, ctx));
    }

    @Test
    void is_false_withFalseValue_returnsTrue() {
        Condition c = new Condition("event.props.active", "is_false", null);
        Map<String, Object> ctx = contextWith("event.props.active", Boolean.FALSE);
        assertTrue(ConditionEvaluator.evaluate(c, ctx));
    }

    @Test
    void is_false_withTrueValue_returnsFalse() {
        Condition c = new Condition("event.props.active", "is_false", null);
        Map<String, Object> ctx = contextWith("event.props.active", Boolean.TRUE);
        assertFalse(ConditionEvaluator.evaluate(c, ctx));
    }

    @Test
    void is_true_withNonBooleanValue_returnsFalse() {
        Condition c = new Condition("event.props.active", "is_true", null);
        Map<String, Object> ctx = contextWith("event.props.active", "true");
        assertFalse(ConditionEvaluator.evaluate(c, ctx));
    }

    // --- Number operators ---

    @Test
    void equal_matchingNumbers_returnsTrue() {
        Condition c = new Condition("event.props.amount", "equal", "100");
        Map<String, Object> ctx = contextWith("event.props.amount", 100);
        assertTrue(ConditionEvaluator.evaluate(c, ctx));
    }

    @Test
    void equal_differentNumbers_returnsFalse() {
        Condition c = new Condition("event.props.amount", "equal", "100");
        Map<String, Object> ctx = contextWith("event.props.amount", 200);
        assertFalse(ConditionEvaluator.evaluate(c, ctx));
    }

    @Test
    void not_equal_differentNumbers_returnsTrue() {
        Condition c = new Condition("event.props.amount", "not_equal", "100");
        Map<String, Object> ctx = contextWith("event.props.amount", 200);
        assertTrue(ConditionEvaluator.evaluate(c, ctx));
    }

    @Test
    void larger_greaterValue_returnsTrue() {
        Condition c = new Condition("event.props.amount", "larger", "50");
        Map<String, Object> ctx = contextWith("event.props.amount", 100);
        assertTrue(ConditionEvaluator.evaluate(c, ctx));
    }

    @Test
    void larger_equalValue_returnsFalse() {
        Condition c = new Condition("event.props.amount", "larger", "100");
        Map<String, Object> ctx = contextWith("event.props.amount", 100);
        assertFalse(ConditionEvaluator.evaluate(c, ctx));
    }

    @Test
    void less_smallerValue_returnsTrue() {
        Condition c = new Condition("event.props.amount", "less", "100");
        Map<String, Object> ctx = contextWith("event.props.amount", 50);
        assertTrue(ConditionEvaluator.evaluate(c, ctx));
    }

    @Test
    void less_equalValue_returnsFalse() {
        Condition c = new Condition("event.props.amount", "less", "100");
        Map<String, Object> ctx = contextWith("event.props.amount", 100);
        assertFalse(ConditionEvaluator.evaluate(c, ctx));
    }

    @Test
    void number_withDoubleValue_works() {
        Condition c = new Condition("event.props.price", "larger", "9.99");
        Map<String, Object> ctx = contextWith("event.props.price", 10.50);
        assertTrue(ConditionEvaluator.evaluate(c, ctx));
    }

    @Test
    void number_withLongValue_works() {
        Condition c = new Condition("event.props.count", "equal", "1000000");
        Map<String, Object> ctx = contextWith("event.props.count", 1000000L);
        assertTrue(ConditionEvaluator.evaluate(c, ctx));
    }

    @Test
    void number_withFloatValue_works() {
        Condition c = new Condition("event.props.rate", "less", "1.0");
        Map<String, Object> ctx = contextWith("event.props.rate", 0.5f);
        assertTrue(ConditionEvaluator.evaluate(c, ctx));
    }

    // --- Missing attribute ---

    @Test
    void missingAttribute_returnsFalse() {
        Condition c = new Condition("event.props.nonexistent", "is", "value");
        Map<String, Object> ctx = contextWith("event.props.other", "value");
        assertFalse(ConditionEvaluator.evaluate(c, ctx));
    }

    @Test
    void emptyContext_returnsFalse() {
        Condition c = new Condition("event.props.status", "is", "active");
        assertFalse(ConditionEvaluator.evaluate(c, Map.of()));
    }

    // --- resolveAttribute with dotted paths ---

    @Test
    void resolveAttribute_deeplyNestedPath() {
        Map<String, Object> ctx = Map.of(
                "event", Map.of(
                        "props", Map.of(
                                "nested", Map.of("deep", "found"))));
        Object result = ConditionEvaluator.resolveAttribute("event.props.nested.deep", ctx);
        assertEquals("found", result);
    }

    @Test
    void resolveAttribute_singleSegment() {
        Map<String, Object> ctx = Map.of("key", "value");
        Object result = ConditionEvaluator.resolveAttribute("key", ctx);
        assertEquals("value", result);
    }

    @Test
    void resolveAttribute_pathTraversesNonMap_returnsNull() {
        Map<String, Object> ctx = Map.of("event", "not_a_map");
        Object result = ConditionEvaluator.resolveAttribute("event.props.amount", ctx);
        assertNull(result);
    }

    @Test
    void resolveAttribute_nullPath_returnsNull() {
        assertNull(ConditionEvaluator.resolveAttribute(null, Map.of()));
    }

    @Test
    void resolveAttribute_emptyPath_returnsNull() {
        assertNull(ConditionEvaluator.resolveAttribute("", Map.of()));
    }

    // --- Unknown operator ---

    @Test
    void unknownOperator_returnsFalse() {
        Condition c = new Condition("event.props.status", "unknown_op", "value");
        Map<String, Object> ctx = contextWith("event.props.status", "value");
        assertFalse(ConditionEvaluator.evaluate(c, ctx));
    }

    // --- String valueOf conversion ---

    @Test
    void is_withNumericValue_usesStringConversion() {
        Condition c = new Condition("event.props.code", "is", "42");
        Map<String, Object> ctx = contextWith("event.props.code", 42);
        assertTrue(ConditionEvaluator.evaluate(c, ctx));
    }
}
