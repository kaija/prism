package com.prism.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.io.Serializable;
import java.util.List;
import java.util.Objects;

/**
 * A trigger rule loaded from the Backend API.
 * Contains DSL expression, filter configuration, constraints, and actions.
 */
public class TriggerRule implements Serializable {

    private static final long serialVersionUID = 1L;

    @JsonProperty("rule_id")
    private String ruleId;

    @JsonProperty("project_id")
    private String projectId;

    private String name;
    private String description;
    private String dsl;
    private String status; // "active", "inactive", "draft"
    private TriggerFrequency frequency;
    private TimeframeConfig timeframe;

    @JsonProperty("selected_event_names")
    private List<String> selectedEventNames;

    private ConstraintGroup constraints;
    private List<TriggerAction> actions;

    public TriggerRule() {}

    public String getRuleId() { return ruleId; }
    public void setRuleId(String ruleId) { this.ruleId = ruleId; }

    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getDsl() { return dsl; }
    public void setDsl(String dsl) { this.dsl = dsl; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public TriggerFrequency getFrequency() { return frequency; }
    public void setFrequency(TriggerFrequency frequency) { this.frequency = frequency; }

    public TimeframeConfig getTimeframe() { return timeframe; }
    public void setTimeframe(TimeframeConfig timeframe) { this.timeframe = timeframe; }

    public List<String> getSelectedEventNames() { return selectedEventNames; }
    public void setSelectedEventNames(List<String> selectedEventNames) { this.selectedEventNames = selectedEventNames; }

    public ConstraintGroup getConstraints() { return constraints; }
    public void setConstraints(ConstraintGroup constraints) { this.constraints = constraints; }

    public List<TriggerAction> getActions() { return actions; }
    public void setActions(List<TriggerAction> actions) { this.actions = actions; }

    /** Returns true if this rule's status is "active". */
    @JsonIgnore
    public boolean isActive() {
        return "active".equals(status);
    }

    /** Returns only the enabled actions from this rule's action list. */
    @JsonIgnore
    public List<TriggerAction> getEnabledActions() {
        if (actions == null) return List.of();
        return actions.stream().filter(TriggerAction::isEnabled).toList();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        TriggerRule that = (TriggerRule) o;
        return Objects.equals(ruleId, that.ruleId)
                && Objects.equals(projectId, that.projectId)
                && Objects.equals(name, that.name)
                && Objects.equals(status, that.status)
                && frequency == that.frequency;
    }

    @Override
    public int hashCode() {
        return Objects.hash(ruleId, projectId, name, status, frequency);
    }

    @Override
    public String toString() {
        return "TriggerRule{ruleId='" + ruleId + "', name='" + name + "', status='" + status + "'}";
    }
}
