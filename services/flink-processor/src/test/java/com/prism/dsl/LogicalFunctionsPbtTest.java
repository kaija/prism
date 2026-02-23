package com.prism.dsl;

import com.prism.models.PrismEvent;
import net.jqwik.api.*;
import net.jqwik.api.constraints.Size;

import java.util.HashMap;
import java.util.List;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Property-based tests for logical function correctness (AND, OR, NOT).
 *
 * <p>Feature: dsl-engine, Property 4: Logical Function Correctness</p>
 *
 * <p>For any list of boolean values, evaluating {@code AND(...)} SHALL return true
 * if and only if all values are true, evaluating {@code OR(...)} SHALL return true
 * if and only if at least one value is true, and evaluating {@code NOT(x)} SHALL
 * return the negation of x.</p>
 *
 * <p><b>Validates: Requirements 4.1, 4.2, 4.3</b></p>
 */
class LogicalFunctionsPbtTest {

    private final AviatorDslEngine engine;
    private final PrismEvent minimalEvent;

    LogicalFunctionsPbtTest() {
        engine = new AviatorDslEngine();
        engine.init();
        minimalEvent = new PrismEvent(
                "test-id", "test-project", "test-event",
                System.currentTimeMillis(), System.currentTimeMillis(),
                "test-profile", new HashMap<>(), new HashMap<>()
        );
    }

    @Property(tries = 200)
    // Feature: dsl-engine, Property 4: Logical Function Correctness
    void andMatchesNativeBooleanAlgebra(@ForAll @Size(min = 2, max = 10) List<Boolean> values) {
        String dsl = "AND(" + values.stream().map(String::valueOf).collect(Collectors.joining(", ")) + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        boolean expected = values.stream().allMatch(b -> b);
        assertTrue(result.success(), "AND evaluation should succeed, got error: " + result.errorMessage());
        assertEquals(expected, result.value(), "AND(" + values + ") should be " + expected);
    }

    @Property(tries = 200)
    // Feature: dsl-engine, Property 4: Logical Function Correctness
    void orMatchesNativeBooleanAlgebra(@ForAll @Size(min = 2, max = 10) List<Boolean> values) {
        String dsl = "OR(" + values.stream().map(String::valueOf).collect(Collectors.joining(", ")) + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        boolean expected = values.stream().anyMatch(b -> b);
        assertTrue(result.success(), "OR evaluation should succeed, got error: " + result.errorMessage());
        assertEquals(expected, result.value(), "OR(" + values + ") should be " + expected);
    }

    @Property(tries = 200)
    // Feature: dsl-engine, Property 4: Logical Function Correctness
    void notMatchesNativeBooleanNegation(@ForAll boolean value) {
        String dsl = "NOT(" + value + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent);
        boolean expected = !value;
        assertTrue(result.success(), "NOT evaluation should succeed, got error: " + result.errorMessage());
        assertEquals(expected, result.value(), "NOT(" + value + ") should be " + expected);
    }
}
