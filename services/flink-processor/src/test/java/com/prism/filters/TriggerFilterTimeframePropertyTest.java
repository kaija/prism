package com.prism.filters;

import com.prism.models.*;
import net.jqwik.api.*;
import net.jqwik.api.constraints.*;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

// Feature: flink-processor, Property 8: Trigger timeframe filter correctness
// Validates: Requirements 8.1, 8.2
class TriggerFilterTimeframePropertyTest {

    // --- Helpers ---

    private EnrichedEvent enrichedWithCts(long cts) {
        PrismEvent event = new PrismEvent(
                "evt-1", "proj-1", "click", cts, cts + 100,
                "profile-1", Map.of(), Map.of());
        ProfileState profile = new ProfileState("profile-1", "proj-1", 0L, 0L, Map.of());
        return new EnrichedEvent(event, profile);
    }

    private TriggerRule ruleWithTimeframe(TimeframeConfig tf) {
        TriggerRule rule = new TriggerRule();
        rule.setRuleId("rule-1");
        rule.setProjectId("proj-1");
        rule.setStatus("active");
        rule.setTimeframe(tf);
        return rule;
    }

    // --- Property: Absolute timeframe filter correctness ---

    @Property(tries = 100)
    void absoluteTimeframeReturnsTrueIffCtsWithinRange(
            @ForAll("absoluteTimeframes") TimeframeConfig tf,
            @ForAll @LongRange(min = 0, max = 2_000_000_000_000L) long cts) {

        TriggerRule rule = ruleWithTimeframe(tf);
        EnrichedEvent event = enrichedWithCts(cts);

        boolean expected = cts >= tf.getStart() && cts <= tf.getEnd();
        boolean actual = TriggerFilter.matchesTimeframe(rule, event);

        assertEquals(expected, actual,
                String.format("Absolute: cts=%d, start=%d, end=%d", cts, tf.getStart(), tf.getEnd()));
    }

    @Provide
    Arbitrary<TimeframeConfig> absoluteTimeframes() {
        return Arbitraries.longs().between(0L, 2_000_000_000_000L).tuple2()
                .map(t -> {
                    long a = t.get1();
                    long b = t.get2();
                    long start = Math.min(a, b);
                    long end = Math.max(a, b);
                    return new TimeframeConfig(true, start, end, null);
                });
    }

    // --- Property: Relative timeframe filter correctness ---

    @Property(tries = 100)
    void relativeTimeframeReturnsTrueIffCtsWithinWindow(
            @ForAll @LongRange(min = 1, max = 86_400_000L) long durationMs,
            @ForAll @LongRange(min = -172_800_000L, max = 172_800_000L) long offsetFromNow) {

        long now = System.currentTimeMillis();
        long cts = now + offsetFromNow;

        TimeframeConfig tf = new TimeframeConfig(false, null, null, durationMs);
        TriggerRule rule = ruleWithTimeframe(tf);
        EnrichedEvent event = enrichedWithCts(cts);

        boolean actual = TriggerFilter.matchesTimeframe(rule, event);

        // The method computes its own `now` internally, which may differ by a few ms.
        // We check against a small tolerance window to avoid flaky failures.
        long toleranceMs = 50;
        long windowStart = now - durationMs;

        if (cts >= windowStart + toleranceMs && cts <= now - toleranceMs) {
            // Clearly inside the window — must be true
            assertTrue(actual,
                    String.format("Relative: cts=%d should be inside window [%d, %d] (duration=%d)",
                            cts, windowStart, now, durationMs));
        } else if (cts < windowStart - toleranceMs || cts > now + toleranceMs) {
            // Clearly outside the window — must be false
            assertFalse(actual,
                    String.format("Relative: cts=%d should be outside window [%d, %d] (duration=%d)",
                            cts, windowStart, now, durationMs));
        }
        // If cts is within the tolerance band of a boundary, we skip assertion
        // since the internal `now` may differ slightly from our captured `now`.
    }

    // --- Property: Null timeframe always matches ---

    @Property(tries = 100)
    void nullTimeframeAlwaysReturnsTrue(
            @ForAll @LongRange(min = 0, max = 2_000_000_000_000L) long cts) {

        TriggerRule rule = ruleWithTimeframe(null);
        EnrichedEvent event = enrichedWithCts(cts);

        assertTrue(TriggerFilter.matchesTimeframe(rule, event));
    }
}
