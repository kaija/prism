package com.prism.models;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.io.Serializable;
import java.util.Objects;

/**
 * Output record produced when a trigger rule matches an event.
 * Published to the event.triggered Kafka topic.
 */
public class TriggerOutput implements Serializable {

    private static final long serialVersionUID = 1L;

    @JsonProperty("rule_id")
    private String ruleId;

    @JsonProperty("event_id")
    private String eventId;

    @JsonProperty("profile_id")
    private String profileId;

    @JsonProperty("project_id")
    private String projectId;

    @JsonProperty("action_type")
    private String actionType;

    @JsonProperty("rendered_payload")
    private String renderedPayload;

    @JsonProperty("triggered_at")
    private long triggeredAt;

    public TriggerOutput() {}

    public TriggerOutput(String ruleId, String eventId, String profileId,
                         String projectId, String actionType,
                         String renderedPayload, long triggeredAt) {
        this.ruleId = ruleId;
        this.eventId = eventId;
        this.profileId = profileId;
        this.projectId = projectId;
        this.actionType = actionType;
        this.renderedPayload = renderedPayload;
        this.triggeredAt = triggeredAt;
    }

    public String getRuleId() { return ruleId; }
    public void setRuleId(String ruleId) { this.ruleId = ruleId; }

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public String getProfileId() { return profileId; }
    public void setProfileId(String profileId) { this.profileId = profileId; }

    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }

    public String getActionType() { return actionType; }
    public void setActionType(String actionType) { this.actionType = actionType; }

    public String getRenderedPayload() { return renderedPayload; }
    public void setRenderedPayload(String renderedPayload) { this.renderedPayload = renderedPayload; }

    public long getTriggeredAt() { return triggeredAt; }
    public void setTriggeredAt(long triggeredAt) { this.triggeredAt = triggeredAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        TriggerOutput that = (TriggerOutput) o;
        return triggeredAt == that.triggeredAt
                && Objects.equals(ruleId, that.ruleId)
                && Objects.equals(eventId, that.eventId)
                && Objects.equals(profileId, that.profileId)
                && Objects.equals(projectId, that.projectId)
                && Objects.equals(actionType, that.actionType)
                && Objects.equals(renderedPayload, that.renderedPayload);
    }

    @Override
    public int hashCode() {
        return Objects.hash(ruleId, eventId, profileId, projectId, actionType, renderedPayload, triggeredAt);
    }

    @Override
    public String toString() {
        return "TriggerOutput{ruleId='" + ruleId + "', eventId='" + eventId
                + "', actionType='" + actionType + "'}";
    }
}
