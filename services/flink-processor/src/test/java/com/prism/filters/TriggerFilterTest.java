package com.prism.filters;

import com.prism.models.*;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class TriggerFilterTest {

    private EnrichedEvent createEnrichedEvent(String eventName, long cts) {
        PrismEvent event = new PrismEvent(
                "evt-1", "proj-1", eventName, cts, cts + 100,
                "profile-1", Map.of(), Map.of());
        ProfileState profile = new ProfileState();
        profile.setProfileId("profile-1");
        profile.setProjectId("proj-1");
        return new EnrichedEvent(event, profile);
    }

    private TriggerRule createRule() {
        TriggerRule rule = new TriggerRule();
        rule.setRuleId("rule-1");
        rule.setProjectId("proj-1");
        rule.setStatus("active");
        return rule;
    }

    // --- matchesTimeframe tests ---

    @Test
    void matchesTimeframe_nullTimeframe_returnsTrue() {
        TriggerRule rule = createRule();
        rule.setTimeframe(null);
        EnrichedEvent event = createEnrichedEvent("click", 1000L);

        assertTrue(TriggerFilter.matchesTimeframe(rule, event));
    }

    @Test
    void matchesTimeframe_absoluteWithinRange_returnsTrue() {
        TriggerRule rule = createRule();
        rule.setTimeframe(new TimeframeConfig(true, 500L, 1500L, null));
        EnrichedEvent event = createEnrichedEvent("click", 1000L);

        assertTrue(TriggerFilter.matchesTimeframe(rule, event));
    }

    @Test
    void matchesTimeframe_absoluteAtBoundaries_returnsTrue() {
        TriggerRule rule = createRule();
        rule.setTimeframe(new TimeframeConfig(true, 1000L, 2000L, null));

        assertTrue(TriggerFilter.matchesTimeframe(rule, createEnrichedEvent("click", 1000L)));
        assertTrue(TriggerFilter.matchesTimeframe(rule, createEnrichedEvent("click", 2000L)));
    }

    @Test
    void matchesTimeframe_absoluteOutsideRange_returnsFalse() {
        TriggerRule rule = createRule();
        rule.setTimeframe(new TimeframeConfig(true, 500L, 1500L, null));

        assertFalse(TriggerFilter.matchesTimeframe(rule, createEnrichedEvent("click", 400L)));
        assertFalse(TriggerFilter.matchesTimeframe(rule, createEnrichedEvent("click", 1600L)));
    }

    @Test
    void matchesTimeframe_relativeRecentEvent_returnsTrue() {
        TriggerRule rule = createRule();
        long durationMs = 60_000L; // 1 minute
        rule.setTimeframe(new TimeframeConfig(false, null, null, durationMs));

        long now = System.currentTimeMillis();
        EnrichedEvent event = createEnrichedEvent("click", now - 30_000L); // 30s ago

        assertTrue(TriggerFilter.matchesTimeframe(rule, event));
    }

    @Test
    void matchesTimeframe_relativeOldEvent_returnsFalse() {
        TriggerRule rule = createRule();
        long durationMs = 60_000L; // 1 minute
        rule.setTimeframe(new TimeframeConfig(false, null, null, durationMs));

        long now = System.currentTimeMillis();
        EnrichedEvent event = createEnrichedEvent("click", now - 120_000L); // 2 min ago

        assertFalse(TriggerFilter.matchesTimeframe(rule, event));
    }

    // --- matchesEventSelection tests ---

    @Test
    void matchesEventSelection_nullList_returnsTrue() {
        TriggerRule rule = createRule();
        rule.setSelectedEventNames(null);
        EnrichedEvent event = createEnrichedEvent("anything", 1000L);

        assertTrue(TriggerFilter.matchesEventSelection(rule, event));
    }

    @Test
    void matchesEventSelection_emptyList_returnsTrue() {
        TriggerRule rule = createRule();
        rule.setSelectedEventNames(List.of());
        EnrichedEvent event = createEnrichedEvent("anything", 1000L);

        assertTrue(TriggerFilter.matchesEventSelection(rule, event));
    }

    @Test
    void matchesEventSelection_eventInList_returnsTrue() {
        TriggerRule rule = createRule();
        rule.setSelectedEventNames(List.of("click", "purchase", "signup"));
        EnrichedEvent event = createEnrichedEvent("purchase", 1000L);

        assertTrue(TriggerFilter.matchesEventSelection(rule, event));
    }

    @Test
    void matchesEventSelection_eventNotInList_returnsFalse() {
        TriggerRule rule = createRule();
        rule.setSelectedEventNames(List.of("click", "purchase"));
        EnrichedEvent event = createEnrichedEvent("logout", 1000L);

        assertFalse(TriggerFilter.matchesEventSelection(rule, event));
    }

    // --- matches (combined) tests ---

    @Test
    void matches_bothFiltersPass_returnsTrue() {
        TriggerRule rule = createRule();
        rule.setTimeframe(new TimeframeConfig(true, 500L, 1500L, null));
        rule.setSelectedEventNames(List.of("click"));
        EnrichedEvent event = createEnrichedEvent("click", 1000L);

        assertTrue(TriggerFilter.matches(rule, event));
    }

    @Test
    void matches_timeframeFails_returnsFalse() {
        TriggerRule rule = createRule();
        rule.setTimeframe(new TimeframeConfig(true, 500L, 900L, null));
        rule.setSelectedEventNames(List.of("click"));
        EnrichedEvent event = createEnrichedEvent("click", 1000L);

        assertFalse(TriggerFilter.matches(rule, event));
    }

    @Test
    void matches_eventSelectionFails_returnsFalse() {
        TriggerRule rule = createRule();
        rule.setTimeframe(null);
        rule.setSelectedEventNames(List.of("purchase"));
        EnrichedEvent event = createEnrichedEvent("click", 1000L);

        assertFalse(TriggerFilter.matches(rule, event));
    }

    @Test
    void matches_noFiltersConfigured_returnsTrue() {
        TriggerRule rule = createRule();
        rule.setTimeframe(null);
        rule.setSelectedEventNames(null);
        EnrichedEvent event = createEnrichedEvent("anything", 1000L);

        assertTrue(TriggerFilter.matches(rule, event));
    }
}
