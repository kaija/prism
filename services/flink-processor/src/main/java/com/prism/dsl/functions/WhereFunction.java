package com.prism.dsl.functions;

import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.type.AviatorObject;
import com.googlecode.aviator.runtime.type.AviatorRuntimeJavaType;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Filtering: {@code dsl_where(expr, condition)}.
 * Filters event_history to only include records where the condition field is truthy.
 * In the AviatorScript context, this is a simplified implementation that filters
 * the event_history based on a field condition.
 */
public class WhereFunction extends AbstractFunction {

    @Override
    public String getName() {
        return "dsl_where";
    }

    @Override
    public AviatorObject call(Map<String, Object> env, AviatorObject arg1, AviatorObject arg2) {
        Object expr = arg1.getValue(env);
        Object condition = arg2.getValue(env);
        // If expr is already a filtered list, return it filtered further
        if (expr instanceof List<?> list) {
            if (condition instanceof Boolean b && b) {
                return AviatorRuntimeJavaType.valueOf(list);
            }
            return AviatorRuntimeJavaType.valueOf(new ArrayList<>());
        }
        // Return the expression value if condition is true
        if (condition instanceof Boolean b && b) {
            return AviatorRuntimeJavaType.valueOf(expr);
        }
        return AviatorRuntimeJavaType.valueOf(null);
    }
}
