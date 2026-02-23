package com.prism.dsl;

import com.prism.models.PrismEvent;
import com.prism.models.ProfileState;
import net.jqwik.api.*;
import net.jqwik.api.constraints.DoubleRange;

import java.util.*;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Property-based tests for profile computed attribute evaluation with aggregation.
 *
 * <p>Feature: dsl-engine, Property 20: Profile Computed Attribute Evaluation with Aggregation</p>
 *
 * <p>For any profile with props, event history, and a set of computed attribute
 * definitions using aggregation formulas, evaluating all profile computed attributes
 * SHALL produce results matching reference aggregation over the event history.</p>
 *
 * <p><b>Validates: Requirements 18.1, 18.2, 18.3, 18.4, 19.3</b></p>
 */
class ProfileComputedPbtTest {

    private static final double DELTA = 0.001;

    private final AviatorDslEngine engine;

    ProfileComputedPbtTest() {
        engine = new AviatorDslEngine();
        engine.init();
    }

    // --- Property: SUM("amount") over event history matches reference sum ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 20: Profile Computed Attribute Evaluation with Aggregation
    void sumAggregationMatchesReferenceSum(
            @ForAll("eventHistoryWithAmount") List<PrismEvent> history,
            @ForAll("profileWithProps") ProfileState profile) {

        PrismEvent currentEvent = makeCurrentEvent();
        String formula = "SUM(\"amount\")";
        DslResult result = engine.evaluateProfileComputed(formula, currentEvent, profile, history);

        double expected = history.stream()
                .map(e -> e.getProps().get("amount"))
                .filter(v -> v instanceof Number)
                .mapToDouble(v -> ((Number) v).doubleValue())
                .sum();

        assertTrue(result.success(), "SUM should succeed, got: " + result.errorMessage());
        assertEquals(expected, ((Number) result.value()).doubleValue(), DELTA,
                "SUM(\"amount\") should equal sum of all amount values in event history");
    }

    // --- Property: COUNT("amount") over event history matches reference count ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 20: Profile Computed Attribute Evaluation with Aggregation
    void countAggregationMatchesReferenceCount(
            @ForAll("eventHistoryWithAmount") List<PrismEvent> history,
            @ForAll("profileWithProps") ProfileState profile) {

        PrismEvent currentEvent = makeCurrentEvent();
        String formula = "COUNT(\"amount\")";
        DslResult result = engine.evaluateProfileComputed(formula, currentEvent, profile, history);

        long expected = history.stream()
                .map(e -> e.getProps().get("amount"))
                .filter(Objects::nonNull)
                .count();

        assertTrue(result.success(), "COUNT should succeed, got: " + result.errorMessage());
        assertEquals(expected, ((Number) result.value()).longValue(),
                "COUNT(\"amount\") should equal number of non-null amount values");
    }

    // --- Property: AVG("amount") over event history matches reference average ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 20: Profile Computed Attribute Evaluation with Aggregation
    void avgAggregationMatchesReferenceAverage(
            @ForAll("eventHistoryWithAmount") List<PrismEvent> history,
            @ForAll("profileWithProps") ProfileState profile) {

        PrismEvent currentEvent = makeCurrentEvent();
        String formula = "AVG(\"amount\")";
        DslResult result = engine.evaluateProfileComputed(formula, currentEvent, profile, history);

        List<Double> numericValues = history.stream()
                .map(e -> e.getProps().get("amount"))
                .filter(v -> v instanceof Number)
                .map(v -> ((Number) v).doubleValue())
                .toList();

        assertTrue(result.success(), "AVG should succeed, got: " + result.errorMessage());
        if (numericValues.isEmpty()) {
            assertNull(result.value(), "AVG of empty numeric list should be null");
        } else {
            double expected = numericValues.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
            assertEquals(expected, ((Number) result.value()).doubleValue(), DELTA,
                    "AVG(\"amount\") should equal arithmetic mean of amount values");
        }
    }

    // --- Property: Computed results can be added to profile props without affecting existing props ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 20: Profile Computed Attribute Evaluation with Aggregation
    void computedResultDoesNotModifyExistingProfileProps(
            @ForAll("eventHistoryWithAmount") List<PrismEvent> history,
            @ForAll("profileWithProps") ProfileState profile) {

        PrismEvent currentEvent = makeCurrentEvent();

        // Snapshot original profile props before evaluation
        Map<String, Object> originalProps = new HashMap<>(profile.getProps());

        String formula = "SUM(\"amount\")";
        DslResult result = engine.evaluateProfileComputed(formula, currentEvent, profile, history);
        assertTrue(result.success(), "SUM evaluation should succeed");

        // Simulate adding computed result to profile props (Req 18.1)
        profile.getProps().put("total_amount", result.value());

        // Verify original props are unchanged
        for (Map.Entry<String, Object> entry : originalProps.entrySet()) {
            assertEquals(entry.getValue(), profile.getProps().get(entry.getKey()),
                    "Existing profile prop '" + entry.getKey() + "' should not be modified");
        }

        // Verify computed value was added
        assertNotNull(profile.getProps().get("total_amount"),
                "Computed 'total_amount' should be present in profile props");
    }

    // --- Property: PROFILE(field) resolves from profile props within aggregation context ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 20: Profile Computed Attribute Evaluation with Aggregation
    void profileFieldResolvesFromProfileProps(
            @ForAll @DoubleRange(min = -1000, max = 1000) double multiplier,
            @ForAll("eventHistoryWithAmount") List<PrismEvent> history) {

        Map<String, Object> profileProps = new HashMap<>();
        profileProps.put("multiplier", multiplier);

        ProfileState profile = new ProfileState(
                "profile-1", "proj-1",
                System.currentTimeMillis(), System.currentTimeMillis(),
                profileProps);

        PrismEvent currentEvent = makeCurrentEvent();

        // MULTIPLY(SUM("amount"), PROFILE("multiplier"))
        String formula = "MULTIPLY(SUM(\"amount\"), PROFILE(\"multiplier\"))";
        DslResult result = engine.evaluateProfileComputed(formula, currentEvent, profile, history);

        double sum = history.stream()
                .map(e -> e.getProps().get("amount"))
                .filter(v -> v instanceof Number)
                .mapToDouble(v -> ((Number) v).doubleValue())
                .sum();
        double expected = sum * multiplier;

        assertTrue(result.success(), "MULTIPLY(SUM, PROFILE) should succeed, got: " + result.errorMessage());
        assertEquals(expected, ((Number) result.value()).doubleValue(), DELTA,
                "MULTIPLY(SUM(\"amount\"), PROFILE(\"multiplier\")) should equal sum * multiplier");
    }

    // --- Property: Multiple aggregation formulas produce consistent results ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 20: Profile Computed Attribute Evaluation with Aggregation
    void multipleAggregationsProduceConsistentResults(
            @ForAll("eventHistoryWithAmount") List<PrismEvent> history,
            @ForAll("profileWithProps") ProfileState profile) {

        PrismEvent currentEvent = makeCurrentEvent();

        // Evaluate SUM and COUNT separately, then verify SUM / COUNT == AVG
        DslResult sumResult = engine.evaluateProfileComputed("SUM(\"amount\")", currentEvent, profile, history);
        DslResult countResult = engine.evaluateProfileComputed("COUNT(\"amount\")", currentEvent, profile, history);
        DslResult avgResult = engine.evaluateProfileComputed("AVG(\"amount\")", currentEvent, profile, history);

        assertTrue(sumResult.success(), "SUM should succeed");
        assertTrue(countResult.success(), "COUNT should succeed");
        assertTrue(avgResult.success(), "AVG should succeed");

        long count = ((Number) countResult.value()).longValue();
        if (count > 0 && avgResult.value() != null) {
            double sum = ((Number) sumResult.value()).doubleValue();
            double avg = ((Number) avgResult.value()).doubleValue();
            assertEquals(sum / count, avg, DELTA,
                    "SUM / COUNT should equal AVG for the same event history");
        }
    }

    // --- Helpers ---

    private PrismEvent makeCurrentEvent() {
        return new PrismEvent(
                "cur-id", "proj-1", "current-event",
                System.currentTimeMillis(), System.currentTimeMillis(),
                "profile-1", new HashMap<>(), new HashMap<>());
    }

    // --- Providers ---

    @Provide
    Arbitrary<List<PrismEvent>> eventHistoryWithAmount() {
        Arbitrary<Integer> amounts = Arbitraries.integers().between(-500, 500);
        Arbitrary<PrismEvent> events = amounts.map(amount -> {
            Map<String, Object> props = new HashMap<>();
            props.put("amount", amount);
            return new PrismEvent(
                    UUID.randomUUID().toString(), "proj-1", "purchase",
                    System.currentTimeMillis(), System.currentTimeMillis(),
                    "profile-1", props, new HashMap<>());
        });
        return events.list().ofMinSize(2).ofMaxSize(20);
    }

    @Provide
    Arbitrary<ProfileState> profileWithProps() {
        Arbitrary<String> names = Arbitraries.of("Alice", "Bob", "Charlie", "Diana", "Eve");
        Arbitrary<Integer> ages = Arbitraries.integers().between(18, 80);
        return Combinators.combine(names, ages).as((name, age) -> {
            Map<String, Object> props = new HashMap<>();
            props.put("name", name);
            props.put("age", age);
            return new ProfileState(
                    "profile-" + UUID.randomUUID().toString().substring(0, 8),
                    "proj-1",
                    System.currentTimeMillis(), System.currentTimeMillis(),
                    props);
        });
    }
}
