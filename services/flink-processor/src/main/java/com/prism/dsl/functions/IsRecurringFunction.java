package com.prism.dsl.functions;

import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.function.FunctionUtils;
import com.googlecode.aviator.runtime.type.AviatorBoolean;
import com.googlecode.aviator.runtime.type.AviatorObject;

import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Date/time: {@code dsl_is_recurring(expr, n)}.
 * Returns true when the expression value has occurred at least n times in event_history.
 */
public class IsRecurringFunction extends AbstractFunction {

    @Override
    public String getName() {
        return "dsl_is_recurring";
    }

    @Override
    public AviatorObject call(Map<String, Object> env, AviatorObject arg1, AviatorObject arg2) {
        String fieldName = FunctionUtils.getStringValue(arg1, env);
        Number n = FunctionUtils.getNumberValue(arg2, env);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> history = (List<Map<String, Object>>) env.get("event_history");
        if (history == null || fieldName == null || n == null) {
            return AviatorBoolean.FALSE;
        }
        long count = history.stream()
                .map(e -> resolveField(e, fieldName))
                .filter(Objects::nonNull)
                .count();
        return AviatorBoolean.valueOf(count >= n.longValue());
    }

    @SuppressWarnings("unchecked")
    private Object resolveField(Map<String, Object> event, String field) {
        Map<String, Object> props = (Map<String, Object>) event.get("props");
        return props != null ? props.get(field) : null;
    }
}
