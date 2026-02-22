package com.prism.models;

import java.io.Serializable;
import java.util.Objects;

/**
 * An event enriched with its associated profile state.
 * Used as the internal pipeline object between Flink operators.
 */
public class EnrichedEvent implements Serializable {

    private static final long serialVersionUID = 1L;

    private PrismEvent event;
    private ProfileState profile;

    public EnrichedEvent() {}

    public EnrichedEvent(PrismEvent event, ProfileState profile) {
        this.event = event;
        this.profile = profile;
    }

    public PrismEvent getEvent() { return event; }
    public void setEvent(PrismEvent event) { this.event = event; }

    public ProfileState getProfile() { return profile; }
    public void setProfile(ProfileState profile) { this.profile = profile; }

    /** Convenience accessor delegating to the event's project ID. */
    public String getProjectId() { return event != null ? event.getProjectId() : null; }

    /** Convenience accessor delegating to the event's profile ID. */
    public String getProfileId() { return event != null ? event.getProfileId() : null; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        EnrichedEvent that = (EnrichedEvent) o;
        return Objects.equals(event, that.event) && Objects.equals(profile, that.profile);
    }

    @Override
    public int hashCode() {
        return Objects.hash(event, profile);
    }

    @Override
    public String toString() {
        return "EnrichedEvent{event=" + event + ", profile=" + profile + "}";
    }
}
