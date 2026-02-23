package com.prism.dsl.functions;

import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.function.FunctionUtils;
import com.googlecode.aviator.runtime.type.AviatorObject;
import com.googlecode.aviator.runtime.type.AviatorRuntimeJavaType;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Filtering: {@code dsl_by(expr, group_field)}.
 * Groups event_history by the specified field before evaluating the expression.
 * Returns a map of group key → list of events.
 */
public class ByFunction extends AbstractFunction {

    @Override
    public String getName() {
        return "dsl_by";
    }

    @Override
    public AviatorObject call(Map<String, Object> env, AviatorObject arg1, AviatorObject arg2) {
        Object expr = arg1.getValue(env);
        String groupField = FunctionUtils.getStringValue(arg2, env);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> history = (List<Map<String, Object>>) env.get("event_history");
        if (history == null || groupField == null) {
            return AviatorRuntimeJavaType.valueOf(new LinkedHashMap<>());
        }
        Map<Object, List<Map<String, Object>>> grouped = history.stream()
                .collect(Collectors.groupingBy(
                        e -> {
                            @SuppressWarnings("unchecked")
                            Map<String, Object> props = (Map<String, Object>) e.get("props");
                            return props != null ? props.getOrDefault(groupField, "null") : "null";
                        },
                        LinkedHashMap::new,
                        Collectors.toList()
                ));
        return AviatorRuntimeJavaType.valueOf(grouped);
    }
}
