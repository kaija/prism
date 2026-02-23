package com.prism.dsl.functions;

import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.function.FunctionUtils;
import com.googlecode.aviator.runtime.type.AviatorDouble;
import com.googlecode.aviator.runtime.type.AviatorObject;

import java.util.List;
import java.util.Map;

/**
 * Aggregation: {@code dsl_sum(fieldName)}.
 * Sums numeric values of the given field across event_history.
 */
public class SumFunction extends AbstractFunction {

    @Override
    public String getName() {
        return "dsl_sum";
    }

    @Override
    public AviatorObject call(Map<String, Object> env, AviatorObject arg1) {
        String fieldName = FunctionUtils.getStringValue(arg1, env);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> history = (List<Map<String, Object>>) env.get("event_history");
        if (history == null || fieldName == null) {
            return new AviatorDouble(0.0);
        }
        double sum = history.stream()
                .map(e -> resolveField(e, fieldName))
                .filter(v -> v instanceof Number)
                .mapToDouble(v -> ((Number) v).doubleValue())
                .sum();
        return new AviatorDouble(sum);
    }

    @SuppressWarnings("unchecked")
    private Object resolveField(Map<String, Object> event, String field) {
        Map<String, Object> props = (Map<String, Object>) event.get("props");
        return props != null ? props.get(field) : null;
    }
}
