package com.prism.models;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.io.Serializable;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

/**
 * Per-profile keyed state stored in RocksDB.
 */
public class ProfileState implements Serializable {

    private static final long serialVersionUID = 1L;

    @JsonProperty("profile_id")
    private String profileId;

    @JsonProperty("project_id")
    private String projectId;

    @JsonProperty("created_at")
    private long createdAt;

    @JsonProperty("updated_at")
    private long updatedAt;

    private Map<String, Object> props;

    public ProfileState() {
        this.props = new HashMap<>();
    }

    public ProfileState(String profileId, String projectId, long createdAt,
                        long updatedAt, Map<String, Object> props) {
        this.profileId = profileId;
        this.projectId = projectId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.props = props != null ? new HashMap<>(props) : new HashMap<>();
    }

    public String getProfileId() { return profileId; }
    public void setProfileId(String profileId) { this.profileId = profileId; }

    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }

    public long getCreatedAt() { return createdAt; }
    public void setCreatedAt(long createdAt) { this.createdAt = createdAt; }

    public long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(long updatedAt) { this.updatedAt = updatedAt; }

    public Map<String, Object> getProps() { return props; }
    public void setProps(Map<String, Object> props) { this.props = props != null ? props : new HashMap<>(); }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ProfileState that = (ProfileState) o;
        return createdAt == that.createdAt
                && updatedAt == that.updatedAt
                && Objects.equals(profileId, that.profileId)
                && Objects.equals(projectId, that.projectId)
                && Objects.equals(props, that.props);
    }

    @Override
    public int hashCode() {
        return Objects.hash(profileId, projectId, createdAt, updatedAt, props);
    }

    @Override
    public String toString() {
        return "ProfileState{profileId='" + profileId + "', projectId='" + projectId + "'}";
    }
}
