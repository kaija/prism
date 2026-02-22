package com.prism.models;

import java.util.List;

/**
 * A composite constraint node that combines child nodes with AND/OR logic.
 *
 * @param logic the boolean logic (AND or OR) for combining child nodes
 * @param nodes the child constraint nodes (Condition or nested ConstraintGroup)
 */
public record ConstraintGroup(
        Logic logic,
        List<ConstraintNode> nodes
) implements ConstraintNode {
}
