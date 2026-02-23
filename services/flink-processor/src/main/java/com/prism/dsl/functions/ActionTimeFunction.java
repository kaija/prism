package com.prism.dsl.functions;

import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.type.AviatorLong;
import com.googlecode.aviator.runtime.type.AviatorNil;
import com.googlecode.aviator.runtime.type.AviatorObject;

import java.util.Map;

/**
 * Date/time: {@code dsl_action_time()}.
 * Returns the current event's timestamp (cts) from the evaluation context.
 */
public class ActionTimeFunction extends AbstractFunction {

    @Override
    public String getName() {
        return "dsl_action_time";
    }

    @Override
    public AviatorObject call(Map<String, Object> env) {
        Object ts = env.get("event_timestamp");
        if (ts instanceof Number n) {
            return AviatorLong.valueOf(n.longValue());
        }
        return AviatorNil.NIL;
    }
}
