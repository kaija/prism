package com.prism.models;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Controls how often a trigger rule fires.
 */
public enum TriggerFrequency {

    @JsonProperty("every_time")
    EVERY_TIME,

    @JsonProperty("once_per_profile")
    ONCE_PER_PROFILE
}
