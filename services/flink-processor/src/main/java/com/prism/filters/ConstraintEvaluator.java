package com.prism.filters;

import com.prism.models.Condition;
import com.prism.models.ConstraintGroup;
import com.prism.models.ConstraintNode;
import com.prism.models.Logic;

import java.util.Map;

/**
 * Evaluates a {@link ConstraintGroup} tree against a context map.
 * Supports recursive AND/OR evaluation with short-circuit semantics.
 * Uses sealed interface pattern matching to dispatch between
 * leaf {@link Condition} nodes and composite {@link ConstraintGroup} nodes.
 */
public class ConstraintEvaluator {

    private ConstraintEvaluator() {
        // utility class
    }

    /**
     * Evaluate a constraint group against the given context.
     * <p>
     * AND logic: all children must match (short-circuits on first false).
     * An empty AND group evaluates to true (vacuous truth).
     * <p>
     * OR logic: at least one child must match (short-circuits on first true).
     * An empty OR group evaluates to false.
     *
     * @param group   the constraint group to evaluate
     * @param context the context map containing event/profile data
     * @return true if the constraint group matches
     */
    public static boolean evaluate(ConstraintGroup group, Map<String, Object> context) {
        if (group.logic() == Logic.AND) {
            for (ConstraintNode node : group.nodes()) {
                if (!evaluateNode(node, context)) return false;
            }
            return true;
        } else { // OR
            for (ConstraintNode node : group.nodes()) {
                if (evaluateNode(node, context)) return true;
            }
            return false;
        }
    }

    /**
     * Evaluate a single constraint node using pattern matching on the sealed interface.
     *
     * @param node    the constraint node (Condition or ConstraintGroup)
     * @param context the context map
     * @return true if the node matches
     */
    private static boolean evaluateNode(ConstraintNode node, Map<String, Object> context) {
        if (node instanceof Condition c) return ConditionEvaluator.evaluate(c, context);
        if (node instanceof ConstraintGroup g) return evaluate(g, context);
        return false;
    }
}
