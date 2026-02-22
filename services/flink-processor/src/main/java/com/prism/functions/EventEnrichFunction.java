package com.prism.functions;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prism.clients.BackendApiClient;
import com.prism.config.AppConfig;
import com.prism.models.EnrichedEvent;
import com.prism.models.PrismEvent;
import com.prism.models.ProfileState;
import org.apache.flink.api.common.functions.OpenContext;
import org.apache.flink.api.common.state.ListState;
import org.apache.flink.api.common.state.ListStateDescriptor;
import org.apache.flink.api.common.state.ValueState;
import org.apache.flink.api.common.state.ValueStateDescriptor;
import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
import org.apache.flink.util.Collector;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

/**
 * Flink keyed process function that enriches events with profile data.
 *
 * <p>For each incoming event, this function:
 * <ol>
 *   <li>Looks up or creates a ProfileState for the event's profile_id</li>
 *   <li>Updates the profile's updated_at timestamp</li>
 *   <li>Appends the event to the profile's event history with retention enforcement</li>
 *   <li>Emits an EnrichedEvent combining the event with its profile</li>
 * </ol>
 */
public class EventEnrichFunction
        extends KeyedProcessFunction<String, PrismEvent, EnrichedEvent> {

    private static final long serialVersionUID = 1L;
    private static final Logger log = LoggerFactory.getLogger(EventEnrichFunction.class);

    private final AppConfig config;

    private ValueState<ProfileState> profileState;
    private ListState<PrismEvent> eventHistoryState;
    private transient BackendApiClient apiClient;
    private transient ObjectMapper objectMapper;

    public EventEnrichFunction(AppConfig config) {
        this.config = config;
    }

    @Override
    public void open(OpenContext ctx) throws Exception {
        profileState = getRuntimeContext().getState(
                new ValueStateDescriptor<>("profile", ProfileState.class));
        eventHistoryState = getRuntimeContext().getListState(
                new ListStateDescriptor<>("eventHistory", PrismEvent.class));
        apiClient = new BackendApiClient(config.getBackendApiUrl());
        apiClient.init(config.getSchemaCacheTtl(), config.getRuleCacheTtl());
        objectMapper = new ObjectMapper();
    }

    @Override
    public void processElement(PrismEvent event, Context ctx, Collector<EnrichedEvent> out)
            throws Exception {
        log.info("[ENRICH] Processing event: event_id={}, event_name={}, project_id={}, profile_id={}",
                event.getEventId(), event.getEventName(), event.getProjectId(), event.getProfileId());
        ProfileState profile = getOrCreateProfile(event);
        profile.setUpdatedAt(System.currentTimeMillis());
        appendEventWithRetention(event);
        profileState.update(profile);
        log.info("[ENRICH] Enriched event emitted: event_id={}, profile_id={}, profile_created_at={}",
                event.getEventId(), profile.getProfileId(), profile.getCreatedAt());
        out.collect(new EnrichedEvent(event, profile));
    }

    /**
     * Look up the existing profile state or create a new one if it doesn't exist.
     */
    ProfileState getOrCreateProfile(PrismEvent event) throws Exception {
        ProfileState profile = profileState.value();
        if (profile == null) {
            profile = new ProfileState(
                    event.getProfileId(),
                    event.getProjectId(),
                    System.currentTimeMillis(),
                    0L,
                    new HashMap<>()
            );
            log.debug("Created new profile for profile_id={}, project_id={}",
                    event.getProfileId(), event.getProjectId());
        }
        return profile;
    }

    /**
     * Append an event to the history list state, then enforce retention limits:
     * 1. Max event count — evict oldest events if count exceeds the configured maximum
     * 2. Max serialized size — evict oldest events until total size is within the configured limit
     */
    void appendEventWithRetention(PrismEvent event) throws Exception {
        eventHistoryState.add(event);

        List<PrismEvent> events = new ArrayList<>();
        for (PrismEvent e : eventHistoryState.get()) {
            events.add(e);
        }

        boolean evicted = false;
        int maxCount = config.getMaxEventHistoryCount();
        long maxBytes = config.getMaxEventHistoryBytes();

        // Enforce max count: keep the most recent N events
        if (events.size() > maxCount) {
            int excess = events.size() - maxCount;
            events = new ArrayList<>(events.subList(excess, events.size()));
            evicted = true;
            log.debug("Evicted {} events to enforce max count of {}", excess, maxCount);
        }

        // Enforce max size: evict oldest until under the byte limit
        long serializedSize = estimateSerializedSize(events);
        while (serializedSize > maxBytes && !events.isEmpty()) {
            events.remove(0);
            evicted = true;
            serializedSize = estimateSerializedSize(events);
        }

        if (evicted) {
            eventHistoryState.clear();
            for (PrismEvent e : events) {
                eventHistoryState.add(e);
            }
        }
    }

    /**
     * Estimate the serialized size of a list of events using Jackson.
     */
    long estimateSerializedSize(List<PrismEvent> events) {
        if (events.isEmpty()) {
            return 0;
        }
        try {
            return objectMapper.writeValueAsBytes(events).length;
        } catch (Exception e) {
            log.warn("Failed to estimate serialized size, returning 0", e);
            return 0;
        }
    }
}
