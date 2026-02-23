package com.prism.dsl;

import com.prism.models.PrismEvent;
import com.prism.models.ProfileState;
import net.jqwik.api.*;
import net.jqwik.api.constraints.IntRange;
import net.jqwik.api.constraints.Size;

import java.util.*;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Property-based tests for aggregation function correctness
 * (COUNT, SUM, AVG, MIN, MAX, UNIQUE, TOP).
 *
 * <p>Feature: dsl-engine, Property 6: Aggregation Function Correctness</p>
 *
 * <p>For any list of events with numeric attribute values, the DSL aggregation
 * functions SHALL produce results matching reference implementations: COUNT
 * matches list length, SUM matches sum of values, AVG matches arithmetic mean,
 * MIN/MAX match minimum/maximum, UNIQUE matches distinct set, and TOP(n)
 * matches the n most frequent values sorted by frequency.</p>
 *
 * <p><b>Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8</b></p>
 */
class AggregationFunctionsPbtTest {

    private final AviatorDslEngine engine;
    private final PrismEvent currentEvent;
    private final ProfileState profileState;

    AggregationFunctionsPbtTest() {
        engine = new AviatorDslEngine();
        engine.init();
        currentEvent = new PrismEvent(
                "cur-id", "proj-1", "current-event",
                System.currentTimeMillis(), System.currentTimeMillis(),
                "profile-1", new HashMap<>(), new HashMap<>()
        );
        profileState = new ProfileState(
                "profile-1", "proj-1",
                System.currentTimeMillis(), System.currentTimeMillis(),
                new HashMap<>()
        );
    }

    // --- COUNT ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 6: Aggregation Function Correctness
    void countMatchesNumberOfNonNullValues(
            @ForAll("eventHistoryWithAmount") List<PrismEvent> history) {
        String dsl = "COUNT(\"amount\")";
        DslResult result = engine.evaluateProfileComputed(dsl, currentEvent, profileState, history);

        long expected = history.stream()
                .map(e -> e.getProps().get("amount"))
                .filter(Objects::nonNull)
                .count();

        assertTrue(result.success(), "COUNT should succeed, got: " + result.errorMessage());
        assertEquals(expected, ((Number) result.value()).longValue(),
                "COUNT(\"amount\") should equal number of non-null amount values");
    }

    // --- SUM ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 6: Aggregation Function Correctness
    void sumMatchesSumOfNumericValues(
            @ForAll("eventHistoryWithAmount") List<PrismEvent> history) {
        String dsl = "SUM(\"amount\")";
        DslResult result = engine.evaluateProfileComputed(dsl, currentEvent, profileState, history);

        double expected = history.stream()
                .map(e -> e.getProps().get("amount"))
                .filter(v -> v instanceof Number)
                .mapToDouble(v -> ((Number) v).doubleValue())
                .sum();

        assertTrue(result.success(), "SUM should succeed, got: " + result.errorMessage());
        assertEquals(expected, ((Number) result.value()).doubleValue(), 0.001,
                "SUM(\"amount\") should equal sum of numeric amount values");
    }

    // --- AVG ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 6: Aggregation Function Correctness
    void avgMatchesArithmeticMean(
            @ForAll("eventHistoryWithAmount") List<PrismEvent> history) {
        String dsl = "AVG(\"amount\")";
        DslResult result = engine.evaluateProfileComputed(dsl, currentEvent, profileState, history);

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
            assertEquals(expected, ((Number) result.value()).doubleValue(), 0.001,
                    "AVG(\"amount\") should equal arithmetic mean of numeric amount values");
        }
    }

    // --- MIN ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 6: Aggregation Function Correctness
    void minMatchesMinimumValue(
            @ForAll("eventHistoryWithAmount") List<PrismEvent> history) {
        String dsl = "MIN(\"amount\")";
        DslResult result = engine.evaluateProfileComputed(dsl, currentEvent, profileState, history);

        OptionalDouble minOpt = history.stream()
                .map(e -> e.getProps().get("amount"))
                .filter(v -> v instanceof Number)
                .mapToDouble(v -> ((Number) v).doubleValue())
                .min();

        assertTrue(result.success(), "MIN should succeed, got: " + result.errorMessage());
        if (minOpt.isEmpty()) {
            assertNull(result.value(), "MIN of empty numeric list should be null");
        } else {
            assertEquals(minOpt.getAsDouble(), ((Number) result.value()).doubleValue(), 0.001,
                    "MIN(\"amount\") should equal minimum numeric amount value");
        }
    }

    // --- MAX ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 6: Aggregation Function Correctness
    void maxMatchesMaximumValue(
            @ForAll("eventHistoryWithAmount") List<PrismEvent> history) {
        String dsl = "MAX(\"amount\")";
        DslResult result = engine.evaluateProfileComputed(dsl, currentEvent, profileState, history);

        OptionalDouble maxOpt = history.stream()
                .map(e -> e.getProps().get("amount"))
                .filter(v -> v instanceof Number)
                .mapToDouble(v -> ((Number) v).doubleValue())
                .max();

        assertTrue(result.success(), "MAX should succeed, got: " + result.errorMessage());
        if (maxOpt.isEmpty()) {
            assertNull(result.value(), "MAX of empty numeric list should be null");
        } else {
            assertEquals(maxOpt.getAsDouble(), ((Number) result.value()).doubleValue(), 0.001,
                    "MAX(\"amount\") should equal maximum numeric amount value");
        }
    }

    // --- UNIQUE ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 6: Aggregation Function Correctness
    void uniqueMatchesDistinctValues(
            @ForAll("eventHistoryWithCategory") List<PrismEvent> history) {
        String dsl = "UNIQUE(\"category\")";
        DslResult result = engine.evaluateProfileComputed(dsl, currentEvent, profileState, history);

        Set<Object> expectedSet = history.stream()
                .map(e -> e.getProps().get("category"))
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        assertTrue(result.success(), "UNIQUE should succeed, got: " + result.errorMessage());
        @SuppressWarnings("unchecked")
        List<Object> actual = (List<Object>) result.value();
        assertEquals(expectedSet.size(), actual.size(),
                "UNIQUE(\"category\") should return correct number of distinct values");
        assertEquals(new HashSet<>(new ArrayList<>(expectedSet)), new HashSet<>(actual),
                "UNIQUE(\"category\") should contain the same distinct values");
    }

    // --- COUNT(UNIQUE(...)) ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 6: Aggregation Function Correctness
    void countUniqueMatchesDistinctCount(
            @ForAll("eventHistoryWithCategory") List<PrismEvent> history) {
        String dsl = "COUNT(UNIQUE(\"category\"))";
        DslResult result = engine.evaluateProfileComputed(dsl, currentEvent, profileState, history);

        long expected = history.stream()
                .map(e -> e.getProps().get("category"))
                .filter(Objects::nonNull)
                .distinct()
                .count();

        assertTrue(result.success(), "COUNT(UNIQUE) should succeed, got: " + result.errorMessage());
        assertEquals(expected, ((Number) result.value()).longValue(),
                "COUNT(UNIQUE(\"category\")) should equal number of distinct non-null values");
    }

    // --- TOP ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 6: Aggregation Function Correctness
    void topReturnsNMostFrequentValues(
            @ForAll("eventHistoryWithCategory") List<PrismEvent> history,
            @ForAll @IntRange(min = 1, max = 5) int n) {
        String dsl = "TOP(\"category\", " + n + ")";
        DslResult result = engine.evaluateProfileComputed(dsl, currentEvent, profileState, history);

        // Build expected frequency map
        Map<Object, Long> freq = history.stream()
                .map(e -> e.getProps().get("category"))
                .filter(Objects::nonNull)
                .collect(Collectors.groupingBy(v -> v, Collectors.counting()));

        List<Map.Entry<Object, Long>> sorted = freq.entrySet().stream()
                .sorted(Map.Entry.<Object, Long>comparingByValue().reversed())
                .limit(n)
                .toList();

        assertTrue(result.success(), "TOP should succeed, got: " + result.errorMessage());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> actual = (List<Map<String, Object>>) result.value();
        assertEquals(sorted.size(), actual.size(),
                "TOP(\"category\", " + n + ") should return min(n, distinct_count) entries");

        // Verify each entry has correct value and count
        for (int i = 0; i < sorted.size(); i++) {
            Map<String, Object> entry = actual.get(i);
            Object actualValue = entry.get("value");
            long actualCount = ((Number) entry.get("count")).longValue();
            long expectedCount = sorted.get(i).getValue();
            assertEquals(expectedCount, actualCount,
                    "TOP entry " + i + " count should match frequency");
            assertTrue(freq.containsKey(actualValue),
                    "TOP entry value should be from the original data");
        }
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
                    "profile-1", props, new HashMap<>()
            );
        });
        return events.list().ofMinSize(2).ofMaxSize(20);
    }

    @Provide
    Arbitrary<List<PrismEvent>> eventHistoryWithCategory() {
        Arbitrary<String> categories = Arbitraries.of("electronics", "books", "clothing", "food", "toys");
        Arbitrary<PrismEvent> events = categories.map(cat -> {
            Map<String, Object> props = new HashMap<>();
            props.put("category", cat);
            return new PrismEvent(
                    UUID.randomUUID().toString(), "proj-1", "browse",
                    System.currentTimeMillis(), System.currentTimeMillis(),
                    "profile-1", props, new HashMap<>()
            );
        });
        return events.list().ofMinSize(2).ofMaxSize(20);
    }
}
