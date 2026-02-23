package com.prism.dsl;

import com.prism.models.PrismEvent;
import com.prism.models.ProfileState;
import net.jqwik.api.*;
import net.jqwik.api.constraints.IntRange;
import net.jqwik.api.constraints.LongRange;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Property-based tests for date/time function correctness
 * (ACTION_TIME, DATE_DIFF, WEEKDAY, IN_RECENT_DAYS).
 *
 * <p>Feature: dsl-engine, Property 8: Date/Time Function Correctness</p>
 *
 * <p>For any valid timestamp and parameters, ACTION_TIME SHALL return the event's cts,
 * DATE_DIFF SHALL return the correct difference in the specified unit,
 * WEEKDAY SHALL return the correct day (1-7), and IN_RECENT_DAYS(n) SHALL return
 * true if and only if the event timestamp is within n days of processing time.</p>
 *
 * <p><b>Validates: Requirements 8.1, 8.4, 8.5, 8.6</b></p>
 */
class DateTimeFunctionsPbtTest {

    private static final long MILLIS_PER_DAY = 24L * 60 * 60 * 1000;

    private final AviatorDslEngine engine;

    DateTimeFunctionsPbtTest() {
        engine = new AviatorDslEngine();
        engine.init();
    }

    // --- ACTION_TIME: returns the event's cts timestamp (Requirement 8.1) ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 8: Date/Time Function Correctness
    void actionTimeReturnsEventCts(
            @ForAll @LongRange(min = 0, max = 4_102_444_800_000L) long cts) {
        PrismEvent event = new PrismEvent(
                "id", "proj", "evt", cts, cts, "profile",
                new HashMap<>(), new HashMap<>());
        DslResult result = engine.evaluateEventComputed("ACTION_TIME()", event);
        assertTrue(result.success(), "ACTION_TIME should succeed, got: " + result.errorMessage());
        assertEquals(cts, ((Number) result.value()).longValue(),
                "ACTION_TIME() should return the event cts " + cts);
    }

    // --- DATE_DIFF: returns difference in specified unit (Requirement 8.4) ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 8: Date/Time Function Correctness
    void dateDiffDaysMatchesNative(
            @ForAll @LongRange(min = 0, max = 4_102_444_800_000L) long ts1,
            @ForAll @LongRange(min = 0, max = 4_102_444_800_000L) long ts2) {
        long expected = (ts2 - ts1) / MILLIS_PER_DAY;
        String dsl = "DATE_DIFF(\"days\", " + ts1 + ", " + ts2 + ")";
        PrismEvent event = minimalEvent();
        DslResult result = engine.evaluateEventComputed(dsl, event);
        assertTrue(result.success(), "DATE_DIFF days should succeed, got: " + result.errorMessage());
        assertEquals(expected, ((Number) result.value()).longValue(),
                "DATE_DIFF(\"days\", " + ts1 + ", " + ts2 + ") should be " + expected);
    }

    @Property(tries = 200)
    // Feature: dsl-engine, Property 8: Date/Time Function Correctness
    void dateDiffHoursMatchesNative(
            @ForAll @LongRange(min = 0, max = 4_102_444_800_000L) long ts1,
            @ForAll @LongRange(min = 0, max = 4_102_444_800_000L) long ts2) {
        long expected = (ts2 - ts1) / (1000 * 60 * 60);
        String dsl = "DATE_DIFF(\"hours\", " + ts1 + ", " + ts2 + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent());
        assertTrue(result.success(), "DATE_DIFF hours should succeed, got: " + result.errorMessage());
        assertEquals(expected, ((Number) result.value()).longValue(),
                "DATE_DIFF(\"hours\", " + ts1 + ", " + ts2 + ") should be " + expected);
    }

    @Property(tries = 200)
    // Feature: dsl-engine, Property 8: Date/Time Function Correctness
    void dateDiffMinutesMatchesNative(
            @ForAll @LongRange(min = 0, max = 4_102_444_800_000L) long ts1,
            @ForAll @LongRange(min = 0, max = 4_102_444_800_000L) long ts2) {
        long expected = (ts2 - ts1) / (1000 * 60);
        String dsl = "DATE_DIFF(\"minutes\", " + ts1 + ", " + ts2 + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent());
        assertTrue(result.success(), "DATE_DIFF minutes should succeed, got: " + result.errorMessage());
        assertEquals(expected, ((Number) result.value()).longValue(),
                "DATE_DIFF(\"minutes\", " + ts1 + ", " + ts2 + ") should be " + expected);
    }

    @Property(tries = 200)
    // Feature: dsl-engine, Property 8: Date/Time Function Correctness
    void dateDiffSecondsMatchesNative(
            @ForAll @LongRange(min = 0, max = 4_102_444_800_000L) long ts1,
            @ForAll @LongRange(min = 0, max = 4_102_444_800_000L) long ts2) {
        long expected = (ts2 - ts1) / 1000;
        String dsl = "DATE_DIFF(\"seconds\", " + ts1 + ", " + ts2 + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent());
        assertTrue(result.success(), "DATE_DIFF seconds should succeed, got: " + result.errorMessage());
        assertEquals(expected, ((Number) result.value()).longValue(),
                "DATE_DIFF(\"seconds\", " + ts1 + ", " + ts2 + ") should be " + expected);
    }

    // --- WEEKDAY: returns day of week 1=Monday through 7=Sunday (Requirement 8.5) ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 8: Date/Time Function Correctness
    void weekdayMatchesJavaDayOfWeek(
            @ForAll @LongRange(min = 0, max = 4_102_444_800_000L) long timestamp) {
        int expected = Instant.ofEpochMilli(timestamp)
                .atZone(ZoneOffset.UTC)
                .getDayOfWeek()
                .getValue();
        String dsl = "WEEKDAY(" + timestamp + ")";
        DslResult result = engine.evaluateEventComputed(dsl, minimalEvent());
        assertTrue(result.success(), "WEEKDAY should succeed, got: " + result.errorMessage());
        long actual = ((Number) result.value()).longValue();
        assertTrue(actual >= 1 && actual <= 7,
                "WEEKDAY should return 1-7, got " + actual);
        assertEquals(expected, actual,
                "WEEKDAY(" + timestamp + ") should be " + expected);
    }

    // --- IN_RECENT_DAYS: true iff event timestamp within n days of processing time (Requirement 8.6) ---

    @Property(tries = 200)
    // Feature: dsl-engine, Property 8: Date/Time Function Correctness
    void inRecentDaysMatchesCutoffLogic(
            @ForAll @LongRange(min = 0, max = 4_102_444_800_000L) long eventTs,
            @ForAll @LongRange(min = 0, max = 4_102_444_800_000L) long processingTs,
            @ForAll @IntRange(min = 1, max = 365) int nDays) {
        long cutoff = processingTs - ((long) nDays * MILLIS_PER_DAY);
        boolean expected = eventTs >= cutoff;

        PrismEvent event = new PrismEvent(
                "id", "proj", "evt", eventTs, eventTs, "profile",
                new HashMap<>(), new HashMap<>());
        ProfileState profile = new ProfileState("profile", "proj", 0L, 0L, new HashMap<>());

        // Use evaluateTriggerRule which calls buildFullContext (sets processing_time).
        // But buildFullContext uses System.currentTimeMillis() for processing_time,
        // so we need to evaluate directly with a controlled environment instead.
        // We'll use the engine's getOrCompile + manual env to control processing_time.
        String dsl = "IN_RECENT_DAYS(" + nDays + ")";
        var compiled = engine.getOrCompile(dsl);
        var env = new HashMap<String, Object>();
        env.put("event_props", new HashMap<>());
        env.put("event_timestamp", eventTs);
        env.put("processing_time", processingTs);
        Object resultValue = compiled.execute(env);

        assertEquals(expected, resultValue,
                "IN_RECENT_DAYS(" + nDays + ") with eventTs=" + eventTs
                        + " processingTs=" + processingTs + " should be " + expected);
    }

    // --- Helper ---

    private PrismEvent minimalEvent() {
        return new PrismEvent(
                "test-id", "test-project", "test-event",
                System.currentTimeMillis(), System.currentTimeMillis(),
                "test-profile", new HashMap<>(), new HashMap<>());
    }
}
