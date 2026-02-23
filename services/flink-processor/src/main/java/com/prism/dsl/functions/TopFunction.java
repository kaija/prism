package com.prism.dsl.functions;

import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.function.FunctionUtils;
import com.googlecode.aviator.runtime.type.AviatorObject;
import com.googlecode.aviator.runtime.type.AviatorRuntimeJavaType;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Aggregation: {@code dsl_top(fieldName, n)}.
 * Returns the n most frequently occurring values of the field with their counts.
 */
public class TopFunction extends AbstractFunction {

    @Override
    public String getName() {
        return "dsl_top";
    }

    @Override
    public AviatorObject call(Map<String, Object> env, AviatorObject arg1, AviatorObject arg2) {
        String fieldName = FunctionUtils.getStringValue(arg1, env);
        Number n = FunctionUtils.getNumberValue(arg2, env);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> history = (List<Map<String, Object>>) env.get("event_history");
        if (history == null || fieldName == null || n == null) {
            return AviatorRuntimeJavaType.valueOf(new ArrayList<>());
        }
        // Count frequencies
        Map<Object, Long> freq = history.stream()
                .map(e -> resolveField(e, fieldName))
                .filter(Objects::nonNull)
                .collect(Collectors.groupingBy(v -> v, Collectors.counting()));
        // Sort by frequency descending, take top n
        List<Map<String, Object>> result = freq.entrySet().stream()
                .sorted(Map.Entry.<Object, Long>comparingByValue().reversed())
                .limit(n.intValue())
                .map(e -> {
                    Map<String, Object> entry = new LinkedHashMap<>();
                    entry.put("value", e.getKey());
                    entry.put("count", e.getValue());
                    return entry;
                })
                .collect(Collectors.toList());
        return AviatorRuntimeJavaType.valueOf(result);
    }

    @SuppressWarnings("unchecked")
    private Object resolveField(Map<String, Object> event, String field) {
        Map<String, Object> props = (Map<String, Object>) event.get("props");
        return props != null ? props.get(field) : null;
    }
}
