package com.prism.dsl;

import com.prism.models.PrismEvent;
import com.prism.models.ProfileState;

import java.util.*;

/**
 * Encapsulates the data environment available during DSL expression evaluation.
 *
 * <p>Provides typed lookups for EVENT, PROFILE, and PARAM field references,
 * and can be converted to the flat {@code Map<String, Object>} format
 * consumed by the AviatorScript runtime via {@link #toEnvironmentMap()}.</p>
 */
public class EvaluationContext {

    private final Map<String, Object> eventProps;
    private final Map<String, Object> profileProps;
    private final Map<String, Object> params;
    private final List<PrismEvent> eventHistory;
    private final long eventTimestamp;
    private final long processingTime;

    private EvaluationContext(Builder builder) {
        this.eventProps = builder.eventProps != null
                ? Collections.unmodifiableMap(new HashMap<>(builder.eventProps))
                : Map.of();
        this.profileProps = builder.profileProps != null
                ? Collections.unmodifiableMap(new HashMap<>(builder.profileProps))
                : Map.of();
        this.params = builder.params != null
                ? Collections.unmodifiableMap(new HashMap<>(builder.params))
                : Map.of();
        this.eventHistory = builder.eventHistory != null
                ? Collections.unmodifiableList(new ArrayList<>(builder.eventHistory))
                : List.of();
        this.eventTimestamp = builder.eventTimestamp;
        this.processingTime = builder.processingTime;
    }

    /**
     * Resolve a field reference from the appropriate source map.
     *
     * @param source one of "EVENT", "PROFILE", or "PARAM"
     * @param field  the field name to look up
     * @return the value, or {@code null} if the field does not exist
     */
    public Object resolveFieldRef(String source, String field) {
        return switch (source) {
            case "EVENT" -> eventProps.getOrDefault(field, null);
            case "PROFILE" -> profileProps.getOrDefault(field, null);
            case "PARAM" -> params.getOrDefault(field, null);
            default -> null;
        };
    }

    /**
     * Convert this context to the flat {@code Map<String, Object>} format
     * expected by the AviatorScript runtime (AviatorDslEngine).
     */
    public Map<String, Object> toEnvironmentMap() {
        Map<String, Object> env = new HashMap<>();
        env.put("event_props", eventProps);
        env.put("profile_props", profileProps);
        env.put("params", params);
        env.put("event_timestamp", eventTimestamp);
        env.put("processing_time", processingTime);
        env.put("event_history", toHistoryMaps());
        return env;
    }

    // ---- getters ----

    public Map<String, Object> getEventProps() { return eventProps; }
    public Map<String, Object> getProfileProps() { return profileProps; }
    public Map<String, Object> getParams() { return params; }
    public List<PrismEvent> getEventHistory() { return eventHistory; }
    public long getEventTimestamp() { return eventTimestamp; }
    public long getProcessingTime() { return processingTime; }

    // ---- static factory methods ----

    /**
     * Create a context for event-only evaluation (no profile or history).
     */
    public static EvaluationContext forEvent(PrismEvent event) {
        return builder()
                .eventProps(event.getProps())
                .eventTimestamp(event.getCts() != null ? event.getCts() : 0L)
                .build();
    }

    /**
     * Create a full context with event, profile, and history data.
     */
    public static EvaluationContext forFull(PrismEvent event,
                                            ProfileState profileState,
                                            List<PrismEvent> eventHistory) {
        Builder b = builder()
                .eventProps(event.getProps())
                .eventTimestamp(event.getCts() != null ? event.getCts() : 0L)
                .eventHistory(eventHistory)
                .processingTime(System.currentTimeMillis());
        if (profileState != null) {
            b.profileProps(profileState.getProps());
        }
        return b.build();
    }

    public static Builder builder() {
        return new Builder();
    }

    // ---- internal helpers ----

    private List<Map<String, Object>> toHistoryMaps() {
        List<Map<String, Object>> result = new ArrayList<>(eventHistory.size());
        for (PrismEvent e : eventHistory) {
            Map<String, Object> m = new HashMap<>();
            m.put("props", e.getProps() != null ? e.getProps() : Map.of());
            m.put("cts", e.getCts() != null ? e.getCts() : 0L);
            m.put("event_name", e.getEventName());
            result.add(m);
        }
        return result;
    }

    // ---- builder ----

    public static class Builder {
        private Map<String, Object> eventProps;
        private Map<String, Object> profileProps;
        private Map<String, Object> params;
        private List<PrismEvent> eventHistory;
        private long eventTimestamp;
        private long processingTime;

        private Builder() {}

        public Builder eventProps(Map<String, Object> eventProps) {
            this.eventProps = eventProps;
            return this;
        }

        public Builder profileProps(Map<String, Object> profileProps) {
            this.profileProps = profileProps;
            return this;
        }

        public Builder params(Map<String, Object> params) {
            this.params = params;
            return this;
        }

        public Builder eventHistory(List<PrismEvent> eventHistory) {
            this.eventHistory = eventHistory;
            return this;
        }

        public Builder eventTimestamp(long eventTimestamp) {
            this.eventTimestamp = eventTimestamp;
            return this;
        }

        public Builder processingTime(long processingTime) {
            this.processingTime = processingTime;
            return this;
        }

        public EvaluationContext build() {
            return new EvaluationContext(this);
        }
    }
}
