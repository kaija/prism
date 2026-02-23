package com.prism.dsl.functions;

import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.function.FunctionUtils;
import com.googlecode.aviator.runtime.type.AviatorLong;
import com.googlecode.aviator.runtime.type.AviatorNil;
import com.googlecode.aviator.runtime.type.AviatorObject;

import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;

/**
 * Date/time: {@code dsl_weekday(timestamp)}.
 * Returns the day of the week (1=Monday through 7=Sunday) for the given epoch-ms timestamp.
 */
public class WeekdayFunction extends AbstractFunction {

    @Override
    public String getName() {
        return "dsl_weekday";
    }

    @Override
    public AviatorObject call(Map<String, Object> env, AviatorObject arg1) {
        Number timestamp = FunctionUtils.getNumberValue(arg1, env);
        if (timestamp == null) {
            return AviatorNil.NIL;
        }
        int dayOfWeek = Instant.ofEpochMilli(timestamp.longValue())
                .atZone(ZoneOffset.UTC)
                .getDayOfWeek()
                .getValue(); // 1=Monday, 7=Sunday
        return AviatorLong.valueOf((long) dayOfWeek);
    }
}
