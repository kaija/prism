package com.prism.dsl;

import com.prism.models.PrismEvent;
import net.jqwik.api.*;
import net.jqwik.api.constraints.DoubleRange;
import net.jqwik.api.constraints.Size;

import java.util.*;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Property-based tests for BUCKET segmentation correctness.
 *
 * <p>Feature: dsl-engine, Property 13: BUCKET Segmentation Correctness</p>
 *
 * <p>For any numeric value and sorted list of boundary values, BUCKET SHALL
 * assign the value to the correct bucket with labels following the format
 * "[lower, upper)" for intermediate buckets, "< lower" for the first bucket,
 * and ">= upper" for the last bucket.</p>
 *
 * <p><b>Validates: Requirements 13.1, 13.2</b></p>
 */
class BucketSegmentationPbtTest {

    private final AviatorDslEngine engine;

    BucketSegmentationPbtTest() {
        engine = new AviatorDslEngine();
        engine.init();
    }

    // ========== Property: value below lowest boundary → "< lowest" ==========

    @Property(tries = 200)
    // Feature: dsl-engine, Property 13: BUCKET Segmentation Correctness
    void valueBelowLowestBoundaryAssignedToFirstBucket(
            @ForAll("sortedBoundaries") List<Double> boundaries) {
        double lowest = boundaries.get(0);
        // Pick a value strictly below the lowest boundary
        double value = lowest - 1.0 - Math.abs(lowest) * 0.1;

        String result = evaluateBucket(value, boundaries);

        String expectedLabel = "< " + formatBoundary(lowest);
        assertEquals(expectedLabel, result,
                "Value " + value + " below lowest boundary " + lowest + " should be in first bucket");
    }

    // ========== Property: value at or above highest boundary → ">= highest" ==========

    @Property(tries = 200)
    // Feature: dsl-engine, Property 13: BUCKET Segmentation Correctness
    void valueAtOrAboveHighestBoundaryAssignedToLastBucket(
            @ForAll("sortedBoundaries") List<Double> boundaries,
            @ForAll @DoubleRange(min = 0.0, max = 100.0) double offset) {
        double highest = boundaries.get(boundaries.size() - 1);
        double value = highest + offset;

        String result = evaluateBucket(value, boundaries);

        String expectedLabel = ">= " + formatBoundary(highest);
        assertEquals(expectedLabel, result,
                "Value " + value + " at/above highest boundary " + highest + " should be in last bucket");
    }

    // ========== Property: value in intermediate range → "[lower, upper)" ==========

    @Property(tries = 200)
    // Feature: dsl-engine, Property 13: BUCKET Segmentation Correctness
    void valueInIntermediateRangeAssignedToCorrectBucket(
            @ForAll("boundariesWithAtLeastTwo") List<Double> boundaries,
            @ForAll @DoubleRange(min = 0.0, max = 1.0) double fraction) {
        // Pick a random intermediate bucket
        int bucketIndex = boundaries.size() > 2
                ? new Random(Double.doubleToLongBits(fraction)).nextInt(boundaries.size() - 1)
                : 0;
        double lower = boundaries.get(bucketIndex);
        double upper = boundaries.get(bucketIndex + 1);

        // Generate a value in [lower, upper) using the fraction
        double value;
        if (lower == upper) {
            // Degenerate case — boundaries are equal after sorting; skip
            return;
        }
        value = lower + fraction * (upper - lower);
        // Ensure value is strictly less than upper (fraction=1.0 edge case)
        if (value >= upper) {
            value = Math.nextDown(upper);
        }

        String result = evaluateBucket(value, boundaries);

        String expectedLabel = "[" + formatBoundary(lower) + ", " + formatBoundary(upper) + ")";
        assertEquals(expectedLabel, result,
                "Value " + value + " in [" + lower + ", " + upper + ") should be in bucket " + expectedLabel);
    }

    // ========== Property: value exactly on a boundary → correct bucket assignment ==========

    @Property(tries = 200)
    // Feature: dsl-engine, Property 13: BUCKET Segmentation Correctness
    void valueExactlyOnBoundaryAssignedCorrectly(
            @ForAll("sortedBoundaries") List<Double> boundaries) {
        // Pick a random boundary to test
        int idx = boundaries.size() == 1 ? 0 : new Random().nextInt(boundaries.size());
        double value = boundaries.get(idx);

        String result = evaluateBucket(value, boundaries);

        // Value exactly on a boundary: it should be >= that boundary
        // If it's the last boundary, it goes to ">= last"
        // Otherwise it goes to [boundary, nextBoundary)
        String expectedLabel = computeExpectedLabel(value, boundaries);
        assertEquals(expectedLabel, result,
                "Value " + value + " exactly on boundary should be assigned correctly");
    }

    // ========== Property: every value gets a non-null bucket label ==========

    @Property(tries = 200)
    // Feature: dsl-engine, Property 13: BUCKET Segmentation Correctness
    void everyNumericValueGetsABucketLabel(
            @ForAll @DoubleRange(min = -10000, max = 10000) double value,
            @ForAll("sortedBoundaries") List<Double> boundaries) {
        String result = evaluateBucket(value, boundaries);

        assertNotNull(result, "BUCKET should always return a non-null label for numeric value " + value);
        assertTrue(
                result.startsWith("< ") || result.startsWith(">= ") || result.startsWith("["),
                "Label should start with '<', '>=', or '[', got: " + result);
    }

    // ========== Property: bucket label matches reference implementation ==========

    @Property(tries = 200)
    // Feature: dsl-engine, Property 13: BUCKET Segmentation Correctness
    void bucketLabelMatchesReferenceImplementation(
            @ForAll @DoubleRange(min = -1000, max = 1000) double value,
            @ForAll("sortedBoundaries") List<Double> boundaries) {
        String result = evaluateBucket(value, boundaries);
        String expected = computeExpectedLabel(value, boundaries);

        assertEquals(expected, result,
                "BUCKET(" + value + ", " + boundaries + ") should produce '" + expected + "'");
    }

    // ========== Helpers ==========

    /**
     * Evaluate BUCKET via the full DSL engine by placing value and boundaries
     * in event props.
     */
    private String evaluateBucket(double value, List<Double> boundaries) {
        Map<String, Object> props = new HashMap<>();
        props.put("value", value);
        props.put("boundaries", new ArrayList<>(boundaries));

        PrismEvent event = new PrismEvent(
                "test-id", "test-project", "test-event",
                System.currentTimeMillis(), System.currentTimeMillis(),
                "test-profile", props, new HashMap<>()
        );

        String dsl = "BUCKET(EVENT(\"value\"), EVENT(\"boundaries\"))";
        DslResult result = engine.evaluateEventComputed(dsl, event);

        assertTrue(result.success(),
                "BUCKET should succeed, got error: " + result.errorMessage());
        return (String) result.value();
    }

    /**
     * Reference implementation: compute the expected bucket label for a value
     * given sorted boundaries.
     */
    private String computeExpectedLabel(double value, List<Double> boundaries) {
        double[] sorted = boundaries.stream().mapToDouble(Double::doubleValue).sorted().toArray();

        if (value < sorted[0]) {
            return "< " + formatBoundary(sorted[0]);
        }
        if (value >= sorted[sorted.length - 1]) {
            return ">= " + formatBoundary(sorted[sorted.length - 1]);
        }
        for (int i = 0; i < sorted.length - 1; i++) {
            if (value >= sorted[i] && value < sorted[i + 1]) {
                return "[" + formatBoundary(sorted[i]) + ", " + formatBoundary(sorted[i + 1]) + ")";
            }
        }
        throw new IllegalStateException("Should not reach here for value=" + value + " boundaries=" + boundaries);
    }

    /**
     * Format a boundary value matching BucketFunction's formatting:
     * integers display without decimal, doubles display with decimal.
     */
    private String formatBoundary(double val) {
        if (val == Math.floor(val) && !Double.isInfinite(val)) {
            return String.valueOf((long) val);
        }
        return String.valueOf(val);
    }

    // ========== Providers ==========

    @Provide
    Arbitrary<List<Double>> sortedBoundaries() {
        return Arbitraries.doubles()
                .between(-1000, 1000)
                .list()
                .ofMinSize(1)
                .ofMaxSize(10)
                .map(list -> list.stream().distinct().sorted().collect(Collectors.toList()))
                .filter(list -> !list.isEmpty());
    }

    @Provide
    Arbitrary<List<Double>> boundariesWithAtLeastTwo() {
        return Arbitraries.doubles()
                .between(-1000, 1000)
                .list()
                .ofMinSize(2)
                .ofMaxSize(10)
                .map(list -> list.stream().distinct().sorted().collect(Collectors.toList()))
                .filter(list -> list.size() >= 2);
    }
}
