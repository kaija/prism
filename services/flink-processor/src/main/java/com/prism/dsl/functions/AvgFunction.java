package com.prism.dsl.functions;

import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.function.FunctionUtils;
import com.googlecode.aviator.runtime.type.AviatorDouble;
import com.googlecode.aviator.runtime.type.AviatorNil;
import com.googlecode.aviator.runtime.type.AviatorObject;

import java.util.List;
import java.util.Map;

/**
 * Aggregation: {@code dsl_avg(fieldName)}.
 * Returns the arithmetic mean of numeric values of the field across event_history.
 */
public class AvgFunction extends AbstractFunction {

    @Override
    public String getName() {
        return "dsl_avg";
    }

    @Override
    public AviatorObject call(Map<String, Object> env, AviatorObject arg1) {
        String fieldName = FunctionUtils.getStringValue(arg1, env);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> history = (List<Map<String, Object>>) env.get("event_history");
        if (history == null || fieldName == null) {
            return AviatorNil.NIL;
        }
        List<Double> values = history.stream()
                .map(e -> resolveField(e, fieldName))
                .filter(v -> v instanceof Number)
                .map(v -> ((Number) v).doubleValue())
                .toList();
        if (values.isEmpty()) {
            return AviatorNil.NIL;
        }
        double avg = values.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        return new AviatorDouble(avg);
    }

    @SuppressWarnings("unchecked")
    private Object resolveField(Map<String, Object> event, String field) {
        Map<String, Object> props = (Map<String, Object>) event.get("props");
        return props != null ? props.get(field) : null;
    }
}
