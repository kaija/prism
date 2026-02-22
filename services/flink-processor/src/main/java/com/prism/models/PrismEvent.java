package com.prism.models;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.io.Serializable;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

/**
 * Represents a raw event consumed from the event.raw Kafka topic.
 */
public class PrismEvent implements Serializable {

    private static final long serialVersionUID = 1L;

    @JsonProperty("event_id")
    private String eventId;

    @JsonProperty("project_id")
    private String projectId;

    @JsonProperty("event_name")
    private String eventName;

    private Long cts;
    private Long sts;

    @JsonProperty("profile_id")
    private String profileId;

    private Map<String, Object> props;
    private Map<String, Object> ctx;

    public PrismEvent() {
        this.props = new HashMap<>();
        this.ctx = new HashMap<>();
    }

    public PrismEvent(String eventId, String projectId, String eventName,
                      Long cts, Long sts, String profileId,
                      Map<String, Object> props, Map<String, Object> ctx) {
        this.eventId = eventId;
        this.projectId = projectId;
        this.eventName = eventName;
        this.cts = cts;
        this.sts = sts;
        this.profileId = profileId;
        this.props = props != null ? new HashMap<>(props) : new HashMap<>();
        this.ctx = ctx != null ? new HashMap<>(ctx) : new HashMap<>();
    }

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }

    public String getEventName() { return eventName; }
    public void setEventName(String eventName) { this.eventName = eventName; }

    public Long getCts() { return cts; }
    public void setCts(Long cts) { this.cts = cts; }

    public Long getSts() { return sts; }
    public void setSts(Long sts) { this.sts = sts; }

    public String getProfileId() { return profileId; }
    public void setProfileId(String profileId) { this.profileId = profileId; }

    public Map<String, Object> getProps() { return props; }
    public void setProps(Map<String, Object> props) { this.props = props != null ? props : new HashMap<>(); }

    public Map<String, Object> getCtx() { return ctx; }
    public void setCtx(Map<String, Object> ctx) { this.ctx = ctx != null ? ctx : new HashMap<>(); }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        PrismEvent that = (PrismEvent) o;
        return Objects.equals(eventId, that.eventId)
                && Objects.equals(projectId, that.projectId)
                && Objects.equals(eventName, that.eventName)
                && Objects.equals(cts, that.cts)
                && Objects.equals(sts, that.sts)
                && Objects.equals(profileId, that.profileId)
                && Objects.equals(props, that.props)
                && Objects.equals(ctx, that.ctx);
    }

    @Override
    public int hashCode() {
        return Objects.hash(eventId, projectId, eventName, cts, sts, profileId, props, ctx);
    }

    @Override
    public String toString() {
        return "PrismEvent{eventId='" + eventId + "', projectId='" + projectId
                + "', eventName='" + eventName + "', profileId='" + profileId + "'}";
    }
}
