package com.prism.models;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

import java.io.Serializable;

/**
 * Sealed interface for constraint tree nodes.
 * A constraint node is either a leaf {@link Condition} or a composite {@link ConstraintGroup}.
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.DEDUCTION)
@JsonSubTypes({
        @JsonSubTypes.Type(value = Condition.class),
        @JsonSubTypes.Type(value = ConstraintGroup.class)
})
public sealed interface ConstraintNode extends Serializable
        permits Condition, ConstraintGroup {
}
