package com.prism.dsl.functions;

import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.function.FunctionUtils;
import com.googlecode.aviator.runtime.type.AviatorLong;
import com.googlecode.aviator.runtime.type.AviatorNil;
import com.googlecode.aviator.runtime.type.AviatorObject;

import java.util.Map;

/**
 * Date/time: {@code dsl_date_diff(unit, timestamp1, timestamp2)}.
 * Returns the difference between two epoch-millisecond timestamps in the specified unit.
 */
public class DateDiffFunction extends AbstractFunction {

    @Override
    public String getName() {
        return "dsl_date_diff";
    }

    @Override
    public AviatorObject call(Map<String, Object> env,
                              AviatorObject arg1, AviatorObject arg2, AviatorObject arg3) {
        String unit = FunctionUtils.getStringValue(arg1, env);
        Number ts1 = FunctionUtils.getNumberValue(arg2, env);
        Number ts2 = FunctionUtils.getNumberValue(arg3, env);
        if (unit == null || ts1 == null || ts2 == null) {
            return AviatorNil.NIL;
        }
        long diffMs = ts2.longValue() - ts1.longValue();
        long result = switch (unit.toLowerCase()) {
            case "seconds" -> diffMs / 1000;
            case "minutes" -> diffMs / (1000 * 60);
            case "hours" -> diffMs / (1000 * 60 * 60);
            case "days" -> diffMs / (1000 * 60 * 60 * 24);
            default -> diffMs;
        };
        return AviatorLong.valueOf(result);
    }
}
