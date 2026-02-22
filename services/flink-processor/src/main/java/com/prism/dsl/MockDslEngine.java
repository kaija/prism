package com.prism.dsl;

import com.prism.models.PrismEvent;
import com.prism.models.ProfileState;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Mock implementation of {@link DslEngine} for testing and development.
 *
 * <p>Returns configurable static results for specific formulas.
 * Unconfigured formulas default to {@code DslResult.ok(true)}.</p>
 */
public class MockDslEngine implements DslEngine {

    private static final long serialVersionUID = 1L;

    private final Map<String, Object> configuredResults = new ConcurrentHashMap<>();

    /**
     * Configure a static result value for a given formula.
     *
     * @param formula the formula string to configure
     * @param result  the value to return when this formula is evaluated
     */
    public void setResult(String formula, Object result) {
        configuredResults.put(formula, result);
    }

    @Override
    public DslResult evaluateEventComputed(String formula, PrismEvent event) {
        return resolveResult(formula);
    }

    @Override
    public DslResult evaluateProfileComputed(String formula, PrismEvent event,
                                             ProfileState profileState, List<PrismEvent> eventHistory) {
        return resolveResult(formula);
    }

    @Override
    public DslResult evaluateTriggerRule(String dslExpression, PrismEvent event,
                                         ProfileState profileState, List<PrismEvent> eventHistory) {
        return resolveResult(dslExpression);
    }

    private DslResult resolveResult(String formula) {
        if (configuredResults.containsKey(formula)) {
            return DslResult.ok(configuredResults.get(formula));
        }
        return DslResult.ok(true);
    }
}
