package com.prism.functions;

import com.prism.actions.PayloadTemplateRenderer;
import com.prism.clients.BackendApiClient;
import com.prism.config.AppConfig;
import com.prism.dsl.DslEngine;
import com.prism.dsl.DslResult;
import com.prism.filters.ConstraintEvaluator;
import com.prism.filters.TriggerFilter;
import com.prism.models.*;
import org.apache.flink.api.common.functions.OpenContext;
import org.apache.flink.api.common.state.ListState;
import org.apache.flink.api.common.state.ListStateDescriptor;
import org.apache.flink.api.common.state.MapState;
import org.apache.flink.api.common.state.MapStateDescriptor;
import org.apache.flink.api.common.state.ValueState;
import org.apache.flink.api.common.state.ValueStateDescriptor;
import org.apache.flink.api.common.typeinfo.Types;
import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
import org.apache.flink.util.Collector;
import org.apache.flink.util.OutputTag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Flink keyed process function that evaluates trigger rules against enriched events.
 *
 * <p>For each incoming enriched event, this function:
 * <ol>
 *   <li>Loads active trigger rules from the Backend API (cached)</li>
 *   <li>For each active rule: checks trigger filter, evaluates constraints,
 *       optionally evaluates DSL expression, checks frequency</li>
 *   <li>Renders payload templates and emits TriggerOutput for each enabled action</li>
 *   <li>Emits the enriched event to a side output for the event.enriched sink</li>
 * </ol>
 */
public class TriggerEvalFunction
        extends KeyedProcessFunction<String, EnrichedEvent, TriggerOutput> {

    private static final long serialVersionUID = 1L;
    private static final Logger log = LoggerFactory.getLogger(TriggerEvalFunction.class);

    /** Side output tag for enriched events routed to the event.enriched Kafka sink. */
    public static final OutputTag<EnrichedEvent> ENRICHED_OUTPUT =
            new OutputTag<>("enriched-output") {};

    private final DslEngine dslEngine;
    private final AppConfig config;

    private ValueState<ProfileState> profileState;
    private ListState<PrismEvent> eventHistoryState;
    private MapState<String, Boolean> firedTriggersState;
    private transient BackendApiClient apiClient;

    public TriggerEvalFunction(DslEngine dslEngine, AppConfig config) {
        this.dslEngine = dslEngine;
        this.config = config;
    }

    @Override
    public void open(OpenContext ctx) throws Exception {
        profileState = getRuntimeContext().getState(
                new ValueStateDescriptor<>("profile", ProfileState.class));
        eventHistoryState = getRuntimeContext().getListState(
                new ListStateDescriptor<>("eventHistory", PrismEvent.class));
        firedTriggersState = getRuntimeContext().getMapState(
                new MapStateDescriptor<>("firedTriggers", Types.STRING, Types.BOOLEAN));
        apiClient = new BackendApiClient(config.getBackendApiUrl());
        apiClient.init(config.getSchemaCacheTtl(), config.getRuleCacheTtl());
    }

    @Override
    public void processElement(EnrichedEvent enriched, Context ctx, Collector<TriggerOutput> out)
            throws Exception {
        String projectId = enriched.getProjectId();
        String eventId = enriched.getEvent().getEventId();
        log.info("[TRIGGER] Processing event: event_id={}, project_id={}, profile_id={}",
                eventId, projectId, enriched.getEvent().getProfileId());

        List<TriggerRule> rules = apiClient.getTriggerRules(projectId);
        log.info("[TRIGGER] Loaded {} trigger rules for project={}", rules.size(), projectId);

        for (TriggerRule rule : rules) {
            if (!rule.isActive()) {
                log.info("[TRIGGER] Skipping inactive rule: rule_id={}, status={}", rule.getRuleId(), rule.getStatus());
                continue;
            }

            try {
                log.info("[TRIGGER] Evaluating rule: rule_id={}, name='{}', dsl='{}' against event_id={}",
                        rule.getRuleId(), rule.getName(), rule.getDsl(), eventId);
                processRule(rule, enriched, ctx, out);
            } catch (Exception e) {
                log.error("[TRIGGER] Error processing rule '{}' for event '{}': {}",
                        rule.getRuleId(), eventId, e.getMessage(), e);
            }
        }

        // Emit enriched event to side output for event.enriched sink
        log.info("[TRIGGER] Emitting enriched event to side output: event_id={}", eventId);
        ctx.output(ENRICHED_OUTPUT, enriched);
    }

    private void processRule(TriggerRule rule, EnrichedEvent enriched,
                             Context ctx, Collector<TriggerOutput> out) throws Exception {
        String ruleId = rule.getRuleId();
        String eventId = enriched.getEvent().getEventId();

        // 1. Check trigger filter (timeframe + event selection)
        if (!TriggerFilter.matches(rule, enriched)) {
            log.info("[TRIGGER]   rule_id={} SKIPPED: trigger filter did not match", ruleId);
            return;
        }
        log.info("[TRIGGER]   rule_id={} PASSED trigger filter", ruleId);

        // 2. Evaluate constraints if present
        if (rule.getConstraints() != null && rule.getConstraints().nodes() != null
                && !rule.getConstraints().nodes().isEmpty()) {
            Map<String, Object> constraintContext = buildConstraintContext(enriched);
            if (!ConstraintEvaluator.evaluate(rule.getConstraints(), constraintContext)) {
                log.info("[TRIGGER]   rule_id={} SKIPPED: constraint evaluation failed", ruleId);
                return;
            }
            log.info("[TRIGGER]   rule_id={} PASSED constraint evaluation", ruleId);
        } else {
            log.info("[TRIGGER]   rule_id={} no constraints defined, skipping constraint check", ruleId);
        }

        // 3. Optionally evaluate DSL expression
        if (rule.getDsl() != null && !rule.getDsl().isEmpty()) {
            ProfileState profile = enriched.getProfile();
            List<PrismEvent> eventHistory = new ArrayList<>();
            for (PrismEvent e : eventHistoryState.get()) {
                eventHistory.add(e);
            }
            log.info("[TRIGGER]   rule_id={} evaluating DSL: '{}' with event_history_size={}",
                    ruleId, rule.getDsl(), eventHistory.size());
            DslResult dslResult = dslEngine.evaluateTriggerRule(
                    rule.getDsl(), enriched.getEvent(), profile, eventHistory);
            if (!dslResult.success()) {
                log.warn("[TRIGGER]   rule_id={} DSL evaluation FAILED: {}", ruleId, dslResult.errorMessage());
                return;
            }
            // If DSL returns a boolean false, skip this rule
            if (dslResult.value() instanceof Boolean && !(Boolean) dslResult.value()) {
                log.info("[TRIGGER]   rule_id={} DSL returned false, skipping", ruleId);
                return;
            }
            log.info("[TRIGGER]   rule_id={} DSL PASSED, result={}", ruleId, dslResult.value());
        } else {
            log.info("[TRIGGER]   rule_id={} no DSL defined, skipping DSL evaluation", ruleId);
        }

        // 4. Check frequency
        if (rule.getFrequency() == TriggerFrequency.ONCE_PER_PROFILE) {
            Boolean alreadyFired = firedTriggersState.get(rule.getRuleId());
            if (Boolean.TRUE.equals(alreadyFired)) {
                log.info("[TRIGGER]   rule_id={} SKIPPED: already fired for this profile (ONCE_PER_PROFILE)", ruleId);
                return;
            }
        }

        // 5. Fire trigger: render payloads and emit actions
        List<TriggerAction> enabledActions = rule.getEnabledActions();
        log.info("[TRIGGER]   rule_id={} FIRING: {} enabled actions", ruleId, enabledActions.size());
        for (TriggerAction action : enabledActions) {
            try {
                String renderedPayload = PayloadTemplateRenderer.render(
                        action.getPayloadTemplate(), enriched);
                TriggerOutput output = new TriggerOutput(
                        rule.getRuleId(),
                        enriched.getEvent().getEventId(),
                        enriched.getEvent().getProfileId(),
                        enriched.getProjectId(),
                        action.getType(),
                        renderedPayload,
                        System.currentTimeMillis());
                log.info("[TRIGGER]   rule_id={} EMITTED trigger output: action_type={}, event_id={}",
                        ruleId, action.getType(), eventId);
                out.collect(output);
            } catch (Exception e) {
                log.error("[TRIGGER]   rule_id={} FAILED to invoke action '{}' for event '{}': {}",
                        ruleId, action.getType(), eventId, e.getMessage(), e);
            }
        }

        // 6. Mark as fired for ONCE_PER_PROFILE
        if (rule.getFrequency() == TriggerFrequency.ONCE_PER_PROFILE) {
            firedTriggersState.put(rule.getRuleId(), true);
            log.info("[TRIGGER]   rule_id={} marked as fired (ONCE_PER_PROFILE)", ruleId);
        }
    }

    /**
     * Build a nested context map from the enriched event for constraint evaluation.
     * Produces a nested structure so that dotted attribute paths like "event.props.amount"
     * can be resolved by traversing nested maps.
     */
    static Map<String, Object> buildConstraintContext(EnrichedEvent enriched) {
        Map<String, Object> context = new HashMap<>();
        if (enriched == null) return context;

        PrismEvent event = enriched.getEvent();
        if (event != null) {
            Map<String, Object> eventMap = new HashMap<>();
            if (event.getEventId() != null) eventMap.put("event_id", event.getEventId());
            if (event.getProjectId() != null) eventMap.put("project_id", event.getProjectId());
            if (event.getEventName() != null) eventMap.put("event_name", event.getEventName());
            if (event.getCts() != null) eventMap.put("cts", event.getCts());
            if (event.getSts() != null) eventMap.put("sts", event.getSts());
            if (event.getProfileId() != null) eventMap.put("profile_id", event.getProfileId());

            if (event.getProps() != null) {
                eventMap.put("props", new HashMap<>(event.getProps()));
            }
            if (event.getCtx() != null) {
                eventMap.put("ctx", new HashMap<>(event.getCtx()));
            }
            context.put("event", eventMap);
        }

        ProfileState profile = enriched.getProfile();
        if (profile != null) {
            Map<String, Object> profileMap = new HashMap<>();
            if (profile.getProfileId() != null) profileMap.put("profile_id", profile.getProfileId());
            if (profile.getProjectId() != null) profileMap.put("project_id", profile.getProjectId());
            profileMap.put("created_at", profile.getCreatedAt());
            profileMap.put("updated_at", profile.getUpdatedAt());

            if (profile.getProps() != null) {
                profileMap.put("props", new HashMap<>(profile.getProps()));
            }
            context.put("profile", profileMap);
        }

        return context;
    }
}
