package com.prism.dsl.functions;

import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.function.FunctionUtils;
import com.googlecode.aviator.runtime.type.AviatorLong;
import com.googlecode.aviator.runtime.type.AviatorObject;

import java.util.List;
import java.util.Map;

/**
 * Aggregation: {@code dsl_count(fieldName)}.
 * Counts non-null values of the given field across event_history.
 */
public class CountFunction extends AbstractFunction {

    @Override
    public String getName() {
        return "dsl_count";
    }

    /**
     * Zero-arg: COUNT() — counts all events in event_history.
     */
    @Override
    public AviatorObject call(Map<String, Object> env) {
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> history = (List<Map<String, Object>>) env.get("event_history");
        if (history == null) {
            return AviatorLong.valueOf(0L);
        }
        return AviatorLong.valueOf((long) history.size());
    }

    @Override
    public AviatorObject call(Map<String, Object> env, AviatorObject arg1) {
        // Try to get the value — if it's a list (e.g. from UNIQUE), count its size
        Object rawVal = arg1.getValue(env);
        if (rawVal instanceof List<?> list) {
            return AviatorLong.valueOf((long) list.size());
        }
        // Otherwise treat as field name and aggregate over event_history
        String fieldName = FunctionUtils.getStringValue(arg1, env);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> history = (List<Map<String, Object>>) env.get("event_history");
        if (history == null || fieldName == null) {
            return AviatorLong.valueOf(0L);
        }
        long count = history.stream()
                .map(e -> resolveField(e, fieldName))
                .filter(v -> v != null)
                .count();
        return AviatorLong.valueOf(count);
    }

    @SuppressWarnings("unchecked")
    private Object resolveField(Map<String, Object> event, String field) {
        Map<String, Object> props = (Map<String, Object>) event.get("props");
        return props != null ? props.get(field) : null;
    }
}
