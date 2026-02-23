package com.prism.dsl.functions;

import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.function.FunctionUtils;
import com.googlecode.aviator.runtime.type.AviatorBoolean;
import com.googlecode.aviator.runtime.type.AviatorObject;

import java.util.Map;

/**
 * Date/time: {@code dsl_in_recent_days(n)}.
 * Returns true when the current event's timestamp falls within the last n days
 * from the processing time.
 */
public class InRecentDaysFunction extends AbstractFunction {

    private static final long MILLIS_PER_DAY = 24L * 60 * 60 * 1000;

    @Override
    public String getName() {
        return "dsl_in_recent_days";
    }

    @Override
    public AviatorObject call(Map<String, Object> env, AviatorObject arg1) {
        Number n = FunctionUtils.getNumberValue(arg1, env);
        if (n == null) {
            return AviatorBoolean.FALSE;
        }
        Object eventTs = env.get("event_timestamp");
        Object procTs = env.get("processing_time");
        if (!(eventTs instanceof Number) || !(procTs instanceof Number)) {
            return AviatorBoolean.FALSE;
        }
        long eventTime = ((Number) eventTs).longValue();
        long processingTime = ((Number) procTs).longValue();
        long cutoff = processingTime - (n.longValue() * MILLIS_PER_DAY);
        return AviatorBoolean.valueOf(eventTime >= cutoff);
    }
}
