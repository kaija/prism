package com.prism.functions;

import com.prism.clients.BackendApiClient;
import com.prism.config.AppConfig;
import com.prism.dsl.DslEngine;
import com.prism.dsl.DslResult;
import com.prism.models.AttributeDefinition;
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
import java.util.List;

/**
 * Flink keyed process function that evaluates computed attributes on events and profiles.
 *
 * <p>For each incoming enriched event, this function:
 * <ol>
 *   <li>Loads event-level computed attribute definitions from the Backend API</li>
 *   <li>Evaluates each via the DslEngine, adding successful results to event props</li>
 *   <li>Loads profile-level computed attribute definitions from the Backend API</li>
 *   <li>Evaluates each via the DslEngine, updating profile state props on success</li>
 *   <li>Saves updated profile state and emits the enriched event</li>
 * </ol>
 */
public class ComputedAttributeFunction
        extends KeyedProcessFunction<String, EnrichedEvent, EnrichedEvent> {

    private static final long serialVersionUID = 1L;
    private static final Logger log = LoggerFactory.getLogger(ComputedAttributeFunction.class);

    private final DslEngine dslEngine;
    private final AppConfig config;

    private ValueState<ProfileState> profileState;
    private ListState<PrismEvent> eventHistoryState;
    private transient BackendApiClient apiClient;

    public ComputedAttributeFunction(DslEngine dslEngine, AppConfig config) {
        this.dslEngine = dslEngine;
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
    }

    @Override
    public void processElement(EnrichedEvent enriched, Context ctx, Collector<EnrichedEvent> out)
            throws Exception {
        PrismEvent event = enriched.getEvent();
        String projectId = enriched.getProjectId();

        log.info("[COMPUTE] Processing event: event_id={}, project_id={}", event.getEventId(), projectId);

        // Load attribute definitions for this project
        List<AttributeDefinition> allAttrs = apiClient.getAttributeDefinitions(projectId);
        log.info("[COMPUTE] Loaded {} attribute definitions for project={}", allAttrs.size(), projectId);

        // 1. Evaluate event-level computed attributes
        List<AttributeDefinition> eventAttrs = allAttrs.stream()
                .filter(AttributeDefinition::isEventComputed)
                .toList();

        for (AttributeDefinition attr : eventAttrs) {
            DslResult result = dslEngine.evaluateEventComputed(attr.getFormula(), event);
            if (result.success()) {
                event.getProps().put(attr.getName(), result.value());
            } else {
                log.warn("Event computed attr failed: formula='{}', event_id='{}', error='{}'",
                        attr.getFormula(), event.getEventId(), result.errorMessage());
            }
        }

        // 2. Evaluate profile-level computed attributes
        List<AttributeDefinition> profileAttrs = allAttrs.stream()
                .filter(AttributeDefinition::isProfileComputed)
                .toList();

        ProfileState profile = enriched.getProfile();
        List<PrismEvent> eventHistory = new ArrayList<>();
        for (PrismEvent e : eventHistoryState.get()) {
            eventHistory.add(e);
        }

        for (AttributeDefinition attr : profileAttrs) {
            DslResult result = dslEngine.evaluateProfileComputed(
                    attr.getFormula(), event, profile, eventHistory);
            if (result.success()) {
                profile.getProps().put(attr.getName(), result.value());
            } else {
                log.warn("Profile computed attr failed: formula='{}', profile_id='{}', error='{}'",
                        attr.getFormula(), profile.getProfileId(), result.errorMessage());
            }
        }

        // 3. Save updated profile state
        profileState.update(profile);

        // 4. Emit enriched event
        log.info("[COMPUTE] Done computing attributes for event_id={}, event_computed={}, profile_computed={}",
                event.getEventId(), eventAttrs.size(), profileAttrs.size());
        out.collect(enriched);
    }
}
