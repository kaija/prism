package com.prism.dsl;

import com.prism.models.AttributeDefinition;
import com.prism.models.PrismEvent;
import com.prism.models.ProfileState;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * End-to-end integration test exercising the full DSL pipeline:
 * event schema (computed attributes) → profile schema (aggregation-based computed attributes)
 * → trigger rule evaluation with DSL expressions.
 *
 * <p>Simulates the same flow as ComputedAttributeFunction + TriggerEvalFunction
 * but without requiring Flink runtime context.</p>
 */
class DslIntegrationTest {

    private AviatorDslEngine engine;

    @BeforeEach
    void setUp() {
        engine = new AviatorDslEngine();
        engine.init();
    }

    // ---- Event Schema: computed attributes ----

    @Test
    @DisplayName("Event computed attrs: total_price = ADD(EVENT(price), EVENT(tax))")
    void eventSchema_computedTotalPrice() {
        // Define event schema with a computed attribute
        AttributeDefinition totalPrice = new AttributeDefinition(
                "total_price", "number", "event", false, true,
                "ADD(EVENT(\"price\"), EVENT(\"tax\"))");

        // Create an event with raw props
        PrismEvent event = makeEvent(Map.of("price", 100, "tax", 15));

        // Evaluate computed attribute (same flow as ComputedAttributeFunction)
        DslResult result = engine.evaluateEventComputed(totalPrice.getFormula(), event);
        assertTrue(result.success(), "Should succeed: " + result.errorMessage());
        event.getProps().put(totalPrice.getName(), result.value());

        assertEquals(115L, ((Number) event.getProps().get("total_price")).longValue());
    }

    @Test
    @DisplayName("Event computed attrs: discount_pct = MULTIPLY(DIVIDE(EVENT(discount), EVENT(price)), 100)")
    void eventSchema_computedDiscountPercentage() {
        AttributeDefinition discountPct = new AttributeDefinition(
                "discount_pct", "number", "event", false, true,
                "MULTIPLY(DIVIDE(EVENT(\"discount\"), EVENT(\"price\")), 100)");

        PrismEvent event = makeEvent(Map.of("price", 200.0, "discount", 30.0));

        DslResult result = engine.evaluateEventComputed(discountPct.getFormula(), event);
        assertTrue(result.success(), "Should succeed: " + result.errorMessage());
        event.getProps().put(discountPct.getName(), result.value());

        assertEquals(15.0, ((Number) event.getProps().get("discount_pct")).doubleValue(), 0.01);
    }

    @Test
    @DisplayName("Event computed attrs: is_high_value = GT(EVENT(amount), 1000)")
    void eventSchema_computedIsHighValue() {
        AttributeDefinition isHighValue = new AttributeDefinition(
                "is_high_value", "boolean", "event", false, true,
                "GT(EVENT(\"amount\"), 1000)");

        PrismEvent highEvent = makeEvent(Map.of("amount", 1500));
        PrismEvent lowEvent = makeEvent(Map.of("amount", 500));

        DslResult highResult = engine.evaluateEventComputed(isHighValue.getFormula(), highEvent);
        DslResult lowResult = engine.evaluateEventComputed(isHighValue.getFormula(), lowEvent);

        assertTrue(highResult.success());
        assertTrue(lowResult.success());
        assertEquals(true, highResult.value());
        assertEquals(false, lowResult.value());
    }


    // ---- Profile Schema: aggregation-based computed attributes ----

    @Test
    @DisplayName("Profile computed attrs: total_spend = SUM(amount) over event history")
    void profileSchema_computedTotalSpend() {
        // Profile aggregation formulas use string field names (not EVENT refs)
        // The aggregation functions iterate over event_history internally
        AttributeDefinition totalSpend = new AttributeDefinition(
                "total_spend", "number", "profile", false, true,
                "SUM(\"amount\")");

        PrismEvent currentEvent = makeEvent(Map.of("amount", 50));
        ProfileState profile = makeProfile(Map.of("name", "Alice"));
        List<PrismEvent> history = List.of(
                makeEvent(Map.of("amount", 100)),
                makeEvent(Map.of("amount", 200)),
                makeEvent(Map.of("amount", 150)));

        DslResult result = engine.evaluateProfileComputed(
                totalSpend.getFormula(), currentEvent, profile, history);
        assertTrue(result.success(), "Should succeed: " + result.errorMessage());
        profile.getProps().put(totalSpend.getName(), result.value());

        // SUM over event history: 100 + 200 + 150 = 450
        assertEquals(450.0, ((Number) profile.getProps().get("total_spend")).doubleValue(), 0.01);
    }

    @Test
    @DisplayName("Profile computed attrs: event_count = COUNT(amount) over event history")
    void profileSchema_computedEventCount() {
        AttributeDefinition eventCount = new AttributeDefinition(
                "event_count", "number", "profile", false, true,
                "COUNT(\"amount\")");

        PrismEvent currentEvent = makeEvent(Map.of("amount", 50));
        ProfileState profile = makeProfile(Map.of());
        List<PrismEvent> history = List.of(
                makeEvent(Map.of("amount", 10)),
                makeEvent(Map.of("amount", 20)),
                makeEvent(Map.of("amount", 30)),
                makeEvent(Map.of("amount", 40)));

        DslResult result = engine.evaluateProfileComputed(
                eventCount.getFormula(), currentEvent, profile, history);
        assertTrue(result.success(), "Should succeed: " + result.errorMessage());
        profile.getProps().put(eventCount.getName(), result.value());

        assertEquals(4L, ((Number) profile.getProps().get("event_count")).longValue());
    }

    @Test
    @DisplayName("Profile computed attrs: avg_order = AVG(amount) over event history")
    void profileSchema_computedAvgOrder() {
        AttributeDefinition avgOrder = new AttributeDefinition(
                "avg_order", "number", "profile", false, true,
                "AVG(\"amount\")");

        PrismEvent currentEvent = makeEvent(Map.of("amount", 50));
        ProfileState profile = makeProfile(Map.of());
        List<PrismEvent> history = List.of(
                makeEvent(Map.of("amount", 100)),
                makeEvent(Map.of("amount", 200)));

        DslResult result = engine.evaluateProfileComputed(
                avgOrder.getFormula(), currentEvent, profile, history);
        assertTrue(result.success(), "Should succeed: " + result.errorMessage());

        assertEquals(150.0, ((Number) result.value()).doubleValue(), 0.01);
    }

    // ---- Full pipeline: event computed → profile computed → trigger rule ----

    @Test
    @DisplayName("Full pipeline: compute event attrs, update profile, evaluate trigger")
    void fullPipeline_eventComputedThenProfileComputedThenTrigger() {
        // --- Step 1: Define event schema with computed attributes ---
        List<AttributeDefinition> eventAttrs = List.of(
                new AttributeDefinition("total_price", "number", "event", false, true,
                        "ADD(EVENT(\"price\"), EVENT(\"tax\"))"),
                new AttributeDefinition("is_premium", "boolean", "event", false, true,
                        "GT(EVENT(\"price\"), 500)")
        );

        // --- Step 2: Define profile schema with aggregation-based computed attributes ---
        // Aggregation functions take string field names and iterate over event_history
        List<AttributeDefinition> profileAttrs = List.of(
                new AttributeDefinition("lifetime_spend", "number", "profile", false, true,
                        "SUM(\"total_price\")"),
                new AttributeDefinition("order_count", "number", "profile", false, true,
                        "COUNT(\"total_price\")")
        );

        // --- Step 3: Define a trigger rule with DSL expression ---
        // Trigger fires when: profile lifetime_spend > 1000 AND current event is_premium
        String triggerDsl = "AND(GT(PROFILE(\"lifetime_spend\"), 1000), EVENT(\"is_premium\"))";

        // --- Simulate event history (previous orders) ---
        List<PrismEvent> eventHistory = new ArrayList<>();
        eventHistory.add(makeEvent(Map.of("price", 300, "tax", 30, "total_price", 330)));
        eventHistory.add(makeEvent(Map.of("price", 400, "tax", 40, "total_price", 440)));
        eventHistory.add(makeEvent(Map.of("price", 250, "tax", 25, "total_price", 275)));

        // --- Current event: a premium purchase ---
        PrismEvent currentEvent = makeEvent(Map.of("price", 600, "tax", 60));
        ProfileState profile = makeProfile(Map.of("name", "Bob"));

        // --- Step 4: Evaluate event-level computed attributes ---
        for (AttributeDefinition attr : eventAttrs) {
            DslResult result = engine.evaluateEventComputed(attr.getFormula(), currentEvent);
            assertTrue(result.success(), attr.getName() + " should succeed: " + result.errorMessage());
            currentEvent.getProps().put(attr.getName(), result.value());
        }

        assertEquals(660L, ((Number) currentEvent.getProps().get("total_price")).longValue());
        assertEquals(true, currentEvent.getProps().get("is_premium"));

        // --- Step 5: Evaluate profile-level computed attributes ---
        // Add current event's total_price to history for aggregation
        List<PrismEvent> fullHistory = new ArrayList<>(eventHistory);
        // Note: the history already has total_price from previous events

        for (AttributeDefinition attr : profileAttrs) {
            DslResult result = engine.evaluateProfileComputed(
                    attr.getFormula(), currentEvent, profile, fullHistory);
            assertTrue(result.success(), attr.getName() + " should succeed: " + result.errorMessage());
            profile.getProps().put(attr.getName(), result.value());
        }

        // lifetime_spend = SUM of history total_prices: 330 + 440 + 275 = 1045
        assertEquals(1045.0, ((Number) profile.getProps().get("lifetime_spend")).doubleValue(), 0.01);
        assertEquals(3L, ((Number) profile.getProps().get("order_count")).longValue());

        // --- Step 6: Evaluate trigger rule ---
        DslResult triggerResult = engine.evaluateTriggerRule(
                triggerDsl, currentEvent, profile, fullHistory);
        assertTrue(triggerResult.success(), "Trigger eval should succeed: " + triggerResult.errorMessage());
        assertEquals(true, triggerResult.value(),
                "Trigger should fire: lifetime_spend(1045) > 1000 AND is_premium(true)");
    }

    @Test
    @DisplayName("Full pipeline: trigger does NOT fire when conditions not met")
    void fullPipeline_triggerDoesNotFireWhenConditionsNotMet() {
        // Event schema
        List<AttributeDefinition> eventAttrs = List.of(
                new AttributeDefinition("total_price", "number", "event", false, true,
                        "ADD(EVENT(\"price\"), EVENT(\"tax\"))"),
                new AttributeDefinition("is_premium", "boolean", "event", false, true,
                        "GT(EVENT(\"price\"), 500)")
        );

        // Profile schema
        List<AttributeDefinition> profileAttrs = List.of(
                new AttributeDefinition("lifetime_spend", "number", "profile", false, true,
                        "SUM(\"total_price\")")
        );

        // Trigger: lifetime_spend > 1000 AND is_premium
        String triggerDsl = "AND(GT(PROFILE(\"lifetime_spend\"), 1000), EVENT(\"is_premium\"))";

        // Small event history — not enough spend
        List<PrismEvent> eventHistory = List.of(
                makeEvent(Map.of("price", 100, "tax", 10, "total_price", 110)));

        // Current event: NOT premium (price <= 500)
        PrismEvent currentEvent = makeEvent(Map.of("price", 200, "tax", 20));
        ProfileState profile = makeProfile(Map.of());

        // Evaluate event computed attrs
        for (AttributeDefinition attr : eventAttrs) {
            DslResult result = engine.evaluateEventComputed(attr.getFormula(), currentEvent);
            assertTrue(result.success());
            currentEvent.getProps().put(attr.getName(), result.value());
        }

        assertEquals(false, currentEvent.getProps().get("is_premium"));

        // Evaluate profile computed attrs
        for (AttributeDefinition attr : profileAttrs) {
            DslResult result = engine.evaluateProfileComputed(
                    attr.getFormula(), currentEvent, profile, eventHistory);
            assertTrue(result.success());
            profile.getProps().put(attr.getName(), result.value());
        }

        // lifetime_spend = 110 (not > 1000)
        assertEquals(110.0, ((Number) profile.getProps().get("lifetime_spend")).doubleValue(), 0.01);

        // Trigger should NOT fire
        DslResult triggerResult = engine.evaluateTriggerRule(
                triggerDsl, currentEvent, profile, eventHistory);
        assertTrue(triggerResult.success());
        assertEquals(false, triggerResult.value(),
                "Trigger should NOT fire: lifetime_spend(110) <= 1000");
    }

    // ---- Trigger rule with string functions ----

    @Test
    @DisplayName("Trigger with string DSL: CONTAINS(EVENT(email), '@company.com')")
    void triggerRule_stringCondition() {
        String triggerDsl = "CONTAINS(EVENT(\"email\"), \"@company.com\")";

        PrismEvent matchEvent = makeEvent(Map.of("email", "alice@company.com"));
        PrismEvent noMatchEvent = makeEvent(Map.of("email", "bob@gmail.com"));
        ProfileState profile = makeProfile(Map.of());

        DslResult matchResult = engine.evaluateTriggerRule(triggerDsl, matchEvent, profile, List.of());
        DslResult noMatchResult = engine.evaluateTriggerRule(triggerDsl, noMatchEvent, profile, List.of());

        assertTrue(matchResult.success());
        assertTrue(noMatchResult.success());
        assertEquals(true, matchResult.value());
        assertEquals(false, noMatchResult.value());
    }

    // ---- Trigger rule with math + comparison ----

    @Test
    @DisplayName("Trigger with math DSL: GT(MULTIPLY(EVENT(qty), EVENT(unit_price)), 500)")
    void triggerRule_mathCondition() {
        String triggerDsl = "GT(MULTIPLY(EVENT(\"qty\"), EVENT(\"unit_price\")), 500)";

        PrismEvent bigOrder = makeEvent(Map.of("qty", 10, "unit_price", 60));
        PrismEvent smallOrder = makeEvent(Map.of("qty", 2, "unit_price", 30));
        ProfileState profile = makeProfile(Map.of());

        DslResult bigResult = engine.evaluateTriggerRule(triggerDsl, bigOrder, profile, List.of());
        DslResult smallResult = engine.evaluateTriggerRule(triggerDsl, smallOrder, profile, List.of());

        assertTrue(bigResult.success());
        assertTrue(smallResult.success());
        assertEquals(true, bigResult.value(), "10*60=600 > 500");
        assertEquals(false, smallResult.value(), "2*30=60 <= 500");
    }

    // ---- Trigger rule with IF conditional ----

    @Test
    @DisplayName("Trigger with IF: IF(GT(EVENT(age), 18), true, false)")
    void triggerRule_ifConditional() {
        String triggerDsl = "IF(GT(EVENT(\"age\"), 18), true, false)";

        PrismEvent adult = makeEvent(Map.of("age", 25));
        PrismEvent minor = makeEvent(Map.of("age", 16));
        ProfileState profile = makeProfile(Map.of());

        DslResult adultResult = engine.evaluateTriggerRule(triggerDsl, adult, profile, List.of());
        DslResult minorResult = engine.evaluateTriggerRule(triggerDsl, minor, profile, List.of());

        assertTrue(adultResult.success());
        assertTrue(minorResult.success());
        assertEquals(true, adultResult.value());
        assertEquals(false, minorResult.value());
    }

    // ---- Multiple computed attrs chained ----

    @Test
    @DisplayName("Chained computed attrs: one computed attr references another's result")
    void chainedComputedAttributes() {
        // First compute subtotal, then compute total using subtotal
        AttributeDefinition subtotal = new AttributeDefinition(
                "subtotal", "number", "event", false, true,
                "MULTIPLY(EVENT(\"qty\"), EVENT(\"unit_price\"))");
        AttributeDefinition total = new AttributeDefinition(
                "total", "number", "event", false, true,
                "ADD(EVENT(\"subtotal\"), EVENT(\"shipping\"))");

        PrismEvent event = makeEvent(Map.of("qty", 3, "unit_price", 40, "shipping", 10));

        // Evaluate subtotal first
        DslResult subtotalResult = engine.evaluateEventComputed(subtotal.getFormula(), event);
        assertTrue(subtotalResult.success());
        event.getProps().put("subtotal", subtotalResult.value());

        // Now evaluate total (references subtotal which was just computed)
        DslResult totalResult = engine.evaluateEventComputed(total.getFormula(), event);
        assertTrue(totalResult.success());
        event.getProps().put("total", totalResult.value());

        assertEquals(120L, ((Number) event.getProps().get("subtotal")).longValue());
        assertEquals(130L, ((Number) event.getProps().get("total")).longValue());
    }

    // ---- Error handling: invalid formula doesn't crash ----

    @Test
    @DisplayName("Invalid formula returns error gracefully, doesn't affect other attrs")
    void invalidFormula_gracefulError() {
        AttributeDefinition valid = new AttributeDefinition(
                "valid_attr", "number", "event", false, true,
                "ADD(EVENT(\"a\"), EVENT(\"b\"))");
        AttributeDefinition invalid = new AttributeDefinition(
                "invalid_attr", "number", "event", false, true,
                "INVALID_SYNTAX(((");

        PrismEvent event = makeEvent(Map.of("a", 10, "b", 20));

        // Valid attr succeeds
        DslResult validResult = engine.evaluateEventComputed(valid.getFormula(), event);
        assertTrue(validResult.success());
        event.getProps().put("valid_attr", validResult.value());

        // Invalid attr fails gracefully
        DslResult invalidResult = engine.evaluateEventComputed(invalid.getFormula(), event);
        assertFalse(invalidResult.success());
        assertNotNull(invalidResult.errorMessage());

        // Valid attr is still in props
        assertEquals(30L, ((Number) event.getProps().get("valid_attr")).longValue());
        assertNull(event.getProps().get("invalid_attr"));
    }

    // ---- Helpers ----

    private PrismEvent makeEvent(Map<String, Object> props) {
        return new PrismEvent(
                "evt-" + System.nanoTime(), "test-project", "purchase",
                System.currentTimeMillis(), System.currentTimeMillis(),
                "profile-1", new HashMap<>(props), new HashMap<>());
    }

    private ProfileState makeProfile(Map<String, Object> props) {
        return new ProfileState("profile-1", "test-project",
                System.currentTimeMillis(), System.currentTimeMillis(),
                new HashMap<>(props));
    }
}
