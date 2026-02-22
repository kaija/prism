package com.prism.filters;

import com.prism.models.EnrichedEvent;
import com.prism.models.TimeframeConfig;
import com.prism.models.TriggerRule;

import java.util.List;

/**
 * Evaluates whether an enriched event matches a trigger rule's
 * timeframe and event selection filters.
 */
public class TriggerFilter {

    private TriggerFilter() {
        // utility class
    }

    /**
     * Check if the event matches the trigger rule's timeframe and event selection filters.
     *
     * @param rule     the trigger rule containing filter configuration
     * @param enriched the enriched event to evaluate
     * @return true if the event passes both timeframe and event selection filters
     */
    public static boolean matches(TriggerRule rule, EnrichedEvent enriched) {
        if (!matchesTimeframe(rule, enriched)) return false;
        if (!matchesEventSelection(rule, enriched)) return false;
        return true;
    }

    /**
     * Check if the event's timestamp falls within the rule's configured timeframe.
     * <ul>
     *   <li>If no timeframe is configured, all events match.</li>
     *   <li>Absolute timeframe: event cts must be between start and end (inclusive).</li>
     *   <li>Relative timeframe: event cts must be between (now - duration) and now (inclusive).</li>
     * </ul>
     */
    static boolean matchesTimeframe(TriggerRule rule, EnrichedEvent enriched) {
        TimeframeConfig tf = rule.getTimeframe();
        if (tf == null) return true;

        long eventTime = enriched.getEvent().getCts();

        if (tf.isAbsolute()) {
            return eventTime >= tf.getStart() && eventTime <= tf.getEnd();
        } else {
            long now = System.currentTimeMillis();
            long start = now - tf.getRelativeDurationMs();
            return eventTime >= start && eventTime <= now;
        }
    }

    /**
     * Check if the event's name matches the rule's selected event names.
     * If the selected event names list is null or empty, all events match.
     */
    static boolean matchesEventSelection(TriggerRule rule, EnrichedEvent enriched) {
        List<String> selectedEvents = rule.getSelectedEventNames();
        if (selectedEvents == null || selectedEvents.isEmpty()) return true;
        return selectedEvents.contains(enriched.getEvent().getEventName());
    }
}
