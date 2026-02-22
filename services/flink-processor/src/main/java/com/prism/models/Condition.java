package com.prism.models;

/**
 * A leaf condition in the constraint tree.
 *
 * @param attribute the attribute path (e.g. "event.props.amount", "profile.props.vip_level")
 * @param operator  the comparison operator (e.g. "is", "larger", "contain", "is_true")
 * @param value     the comparison value as a string, parsed by the operator
 */
public record Condition(
        String attribute,
        String operator,
        String value
) implements ConstraintNode {
}
