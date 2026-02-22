package com.prism.dsl;

import com.prism.models.PrismEvent;
import com.prism.models.ProfileState;

import java.util.List;

/**
 * Pluggable DSL engine interface for evaluating computed attributes
 * and trigger rule expressions.
 *
 * <p>Implementations include {@code MockDslEngine} for testing/development
 * and a future AviatorScript-based production engine.</p>
 */
public interface DslEngine extends java.io.Serializable {

    /**
     * Evaluate an event-level computed attribute formula.
     *
     * @param formula the DSL formula to evaluate
     * @param event   the current event providing context
     * @return a {@link DslResult} indicating success with a value, or failure with an error message
     */
    DslResult evaluateEventComputed(String formula, PrismEvent event);

    /**
     * Evaluate a profile-level computed attribute formula.
     *
     * @param formula      the DSL formula to evaluate
     * @param event        the current event providing context
     * @param profileState the current profile state
     * @param eventHistory the profile's event history
     * @return a {@link DslResult} indicating success with a value, or failure with an error message
     */
    DslResult evaluateProfileComputed(String formula, PrismEvent event,
                                      ProfileState profileState, List<PrismEvent> eventHistory);

    /**
     * Evaluate a trigger rule DSL expression.
     *
     * @param dslExpression the DSL expression to evaluate
     * @param event         the current event providing context
     * @param profileState  the current profile state
     * @param eventHistory  the profile's event history
     * @return a {@link DslResult} indicating success with a value, or failure with an error message
     */
    DslResult evaluateTriggerRule(String dslExpression, PrismEvent event,
                                  ProfileState profileState, List<PrismEvent> eventHistory);
}
