package com.prism.filters;

import com.prism.models.*;
import net.jqwik.api.*;
import net.jqwik.api.constraints.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

// Feature: flink-processor, Property 9: Trigger event name filter correctness
// Validates: Requirements 8.3, 8.4
class TriggerFilterEventNamePropertyTest {

    // --- Helpers ---

    private EnrichedEvent enrichedWithEventName(String eventName) {
        PrismEvent event = new PrismEvent(
                "evt-1", "proj-1", eventName, 1000L, 1100L,
                "profile-1", Map.of(), Map.of());
        ProfileState profile = new ProfileState("profile-1", "proj-1", 0L, 0L, Map.of());
        return new EnrichedEvent(event, profile);
    }

    private TriggerRule ruleWithSelectedEvents(List<String> selectedEventNames) {
        TriggerRule rule = new TriggerRule();
        rule.setRuleId("rule-1");
        rule.setProjectId("proj-1");
        rule.setStatus("active");
        rule.setSelectedEventNames(selectedEventNames);
        return rule;
    }

    // --- Property: Event name filter returns true when list is null ---

    @Property(tries = 100)
    void nullSelectedEventsAlwaysMatches(
            @ForAll("eventNames") String eventName) {

        TriggerRule rule = ruleWithSelectedEvents(null);
        EnrichedEvent event = enrichedWithEventName(eventName);

        assertTrue(TriggerFilter.matchesEventSelection(rule, event),
                "Null selected event names should match any event name: " + eventName);
    }

    // --- Property: Event name filter returns true when list is empty ---

    @Property(tries = 100)
    void emptySelectedEventsAlwaysMatches(
            @ForAll("eventNames") String eventName) {

        TriggerRule rule = ruleWithSelectedEvents(List.of());
        EnrichedEvent event = enrichedWithEventName(eventName);

        assertTrue(TriggerFilter.matchesEventSelection(rule, event),
                "Empty selected event names should match any event name: " + eventName);
    }

    // --- Property: Event name filter returns true iff list contains event name ---

    @Property(tries = 100)
    void nonEmptyListMatchesIffContainsEventName(
            @ForAll("eventNames") String eventName,
            @ForAll("eventNameLists") List<String> selectedNames) {

        // Ensure the list is non-empty (null/empty cases are tested above)
        Assume.that(selectedNames != null && !selectedNames.isEmpty());

        TriggerRule rule = ruleWithSelectedEvents(selectedNames);
        EnrichedEvent event = enrichedWithEventName(eventName);

        boolean expected = selectedNames.contains(eventName);
        boolean actual = TriggerFilter.matchesEventSelection(rule, event);

        assertEquals(expected, actual,
                String.format("Event name '%s' with selected names %s: expected %s but got %s",
                        eventName, selectedNames, expected, actual));
    }

    // --- Providers ---

    @Provide
    Arbitrary<String> eventNames() {
        return Arbitraries.of(
                "click", "purchase", "signup", "logout", "page_view",
                "add_to_cart", "checkout", "search", "share", "login");
    }

    @Provide
    Arbitrary<List<String>> eventNameLists() {
        return eventNames().list().ofMinSize(1).ofMaxSize(6);
    }
}
