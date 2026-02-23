package com.prism.dsl;

import com.prism.models.PrismEvent;
import net.jqwik.api.*;
import net.jqwik.api.constraints.DoubleRange;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Property-based tests for event computed attribute evaluation.
 *
 * <p>Feature: dsl-engine, Property 19: Event Computed Attribute Evaluation</p>
 *
 * <p>For any event with props and a set of computed attribute definitions with
 * valid DSL formulas, evaluating all event computed attributes SHALL add the
 * correct computed values to the event's props without modifying existing props.</p>
 *
 * <p><b>Validates: Requirements 17.1, 17.2, 17.3, 19.2</b></p>
 */
class EventComputedPbtTest {

    private static final double DELTA = 0.001;

    private final AviatorDslEngine engine;

    EventComputedPbtTest() {
        engine = new AviatorDslEngine();
        engine.init();
    }

    // --- Property: ADD(EVENT("a"), EVENT("b")) equals a + b ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 19: Event Computed Attribute Evaluation
    void addComputedAttributeMatchesSum(
            @ForAll @DoubleRange(min = -1000, max = 1000) double a,
            @ForAll @DoubleRange(min = -1000, max = 1000) double b) {

        Map<String, Object> props = new HashMap<>();
        props.put("price", a);
        props.put("tax", b);

        PrismEvent event = new PrismEvent(
                "evt-1", "proj-1", "purchase",
                System.currentTimeMillis(), System.currentTimeMillis(),
                "profile-1", props, new HashMap<>());

        String formula = "ADD(EVENT(\"price\"), EVENT(\"tax\"))";
        DslResult result = engine.evaluateEventComputed(formula, event);

        assertTrue(result.success(), "ADD computed should succeed, got: " + result.errorMessage());
        double expected = a + b;
        assertEquals(expected, ((Number) result.value()).doubleValue(), DELTA,
                "ADD(EVENT(\"price\"), EVENT(\"tax\")) should equal " + expected);
    }

    // --- Property: MULTIPLY(EVENT("price"), EVENT("qty")) equals price * qty ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 19: Event Computed Attribute Evaluation
    void multiplyComputedAttributeMatchesProduct(
            @ForAll @DoubleRange(min = -100, max = 100) double price,
            @ForAll @DoubleRange(min = -100, max = 100) double qty) {

        Map<String, Object> props = new HashMap<>();
        props.put("price", price);
        props.put("qty", qty);

        PrismEvent event = new PrismEvent(
                "evt-2", "proj-1", "purchase",
                System.currentTimeMillis(), System.currentTimeMillis(),
                "profile-1", props, new HashMap<>());

        String formula = "MULTIPLY(EVENT(\"price\"), EVENT(\"qty\"))";
        DslResult result = engine.evaluateEventComputed(formula, event);

        assertTrue(result.success(), "MULTIPLY computed should succeed, got: " + result.errorMessage());
        double expected = price * qty;
        assertEquals(expected, ((Number) result.value()).doubleValue(), DELTA,
                "MULTIPLY(EVENT(\"price\"), EVENT(\"qty\")) should equal " + expected);
    }

    // --- Property: SUBTRACT(EVENT("a"), EVENT("b")) equals a - b ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 19: Event Computed Attribute Evaluation
    void subtractComputedAttributeMatchesDifference(
            @ForAll @DoubleRange(min = -1000, max = 1000) double a,
            @ForAll @DoubleRange(min = -1000, max = 1000) double b) {

        Map<String, Object> props = new HashMap<>();
        props.put("a", a);
        props.put("b", b);

        PrismEvent event = new PrismEvent(
                "evt-3", "proj-1", "calc",
                System.currentTimeMillis(), System.currentTimeMillis(),
                "profile-1", props, new HashMap<>());

        String formula = "SUBTRACT(EVENT(\"a\"), EVENT(\"b\"))";
        DslResult result = engine.evaluateEventComputed(formula, event);

        assertTrue(result.success(), "SUBTRACT computed should succeed, got: " + result.errorMessage());
        double expected = a - b;
        assertEquals(expected, ((Number) result.value()).doubleValue(), DELTA,
                "SUBTRACT(EVENT(\"a\"), EVENT(\"b\")) should equal " + expected);
    }

    // --- Property: Computed result can be added to props without affecting existing props ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 19: Event Computed Attribute Evaluation
    void computedResultDoesNotModifyExistingProps(
            @ForAll @DoubleRange(min = -1000, max = 1000) double price,
            @ForAll @DoubleRange(min = -1000, max = 1000) double tax) {

        Map<String, Object> props = new HashMap<>();
        props.put("price", price);
        props.put("tax", tax);

        PrismEvent event = new PrismEvent(
                "evt-4", "proj-1", "purchase",
                System.currentTimeMillis(), System.currentTimeMillis(),
                "profile-1", props, new HashMap<>());

        // Snapshot original props before evaluation
        Map<String, Object> originalProps = new HashMap<>(event.getProps());

        String formula = "ADD(EVENT(\"price\"), EVENT(\"tax\"))";
        DslResult result = engine.evaluateEventComputed(formula, event);
        assertTrue(result.success(), "Evaluation should succeed");

        // Simulate adding computed result to event props (Req 17.3)
        event.getProps().put("total", result.value());

        // Verify original props are unchanged
        assertEquals(originalProps.get("price"), event.getProps().get("price"),
                "Existing 'price' prop should not be modified");
        assertEquals(originalProps.get("tax"), event.getProps().get("tax"),
                "Existing 'tax' prop should not be modified");

        // Verify computed value was added
        assertNotNull(event.getProps().get("total"), "Computed 'total' should be present");
        double expected = price + tax;
        assertEquals(expected, ((Number) event.getProps().get("total")).doubleValue(), DELTA,
                "Computed 'total' should equal price + tax");
    }

    // --- Property: Nested computed formula evaluates correctly ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 19: Event Computed Attribute Evaluation
    void nestedComputedFormulaEvaluatesCorrectly(
            @ForAll @DoubleRange(min = 1, max = 100) double price,
            @ForAll @DoubleRange(min = 1, max = 100) double tax,
            @ForAll @DoubleRange(min = 1, max = 50) double qty) {

        Map<String, Object> props = new HashMap<>();
        props.put("price", price);
        props.put("tax", tax);
        props.put("qty", qty);

        PrismEvent event = new PrismEvent(
                "evt-5", "proj-1", "purchase",
                System.currentTimeMillis(), System.currentTimeMillis(),
                "profile-1", props, new HashMap<>());

        // total = (price + tax) * qty
        String formula = "MULTIPLY(ADD(EVENT(\"price\"), EVENT(\"tax\")), EVENT(\"qty\"))";
        DslResult result = engine.evaluateEventComputed(formula, event);

        assertTrue(result.success(), "Nested computed should succeed, got: " + result.errorMessage());
        double expected = (price + tax) * qty;
        assertEquals(expected, ((Number) result.value()).doubleValue(), DELTA,
                "MULTIPLY(ADD(price, tax), qty) should equal " + expected);
    }
}
