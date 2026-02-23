package com.prism.dsl.functions;

import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.function.FunctionUtils;
import com.googlecode.aviator.runtime.type.AviatorObject;
import com.googlecode.aviator.runtime.type.AviatorRuntimeJavaType;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

/**
 * Aggregation: {@code dsl_unique(fieldName)}.
 * Returns the set of distinct values of the field across event_history.
 */
public class UniqueFunction extends AbstractFunction {

    @Override
    public String getName() {
        return "dsl_unique";
    }

    @Override
    public AviatorObject call(Map<String, Object> env, AviatorObject arg1) {
        String fieldName = FunctionUtils.getStringValue(arg1, env);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> history = (List<Map<String, Object>>) env.get("event_history");
        if (history == null || fieldName == null) {
            return AviatorRuntimeJavaType.valueOf(new ArrayList<>());
        }
        LinkedHashSet<Object> unique = new LinkedHashSet<>();
        for (Map<String, Object> event : history) {
            Object val = resolveField(event, fieldName);
            if (val != null) {
                unique.add(val);
            }
        }
        return AviatorRuntimeJavaType.valueOf(new ArrayList<>(unique));
    }

    @SuppressWarnings("unchecked")
    private Object resolveField(Map<String, Object> event, String field) {
        Map<String, Object> props = (Map<String, Object>) event.get("props");
        return props != null ? props.get(field) : null;
    }
}
