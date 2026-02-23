package com.prism.dsl.functions;

import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.type.AviatorLong;
import com.googlecode.aviator.runtime.type.AviatorObject;

import java.util.Map;

/**
 * Date/time: {@code dsl_now()}.
 * Returns the current processing time as epoch milliseconds.
 */
public class NowFunction extends AbstractFunction {

    @Override
    public String getName() {
        return "dsl_now";
    }

    @Override
    public AviatorObject call(Map<String, Object> env) {
        Object ts = env.get("processing_time");
        if (ts instanceof Number n) {
            return AviatorLong.valueOf(n.longValue());
        }
        return AviatorLong.valueOf(System.currentTimeMillis());
    }
}
