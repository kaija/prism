package com.prism.dsl.functions;

import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.function.FunctionUtils;
import com.googlecode.aviator.runtime.type.AviatorNil;
import com.googlecode.aviator.runtime.type.AviatorObject;
import com.googlecode.aviator.runtime.type.AviatorString;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Map;

/**
 * Date/time: {@code dsl_date_format(timestamp, pattern)}.
 * Formats an epoch-millisecond timestamp according to the given pattern.
 */
public class DateFormatFunction extends AbstractFunction {

    @Override
    public String getName() {
        return "dsl_date_format";
    }

    @Override
    public AviatorObject call(Map<String, Object> env, AviatorObject arg1, AviatorObject arg2) {
        Number timestamp = FunctionUtils.getNumberValue(arg1, env);
        String pattern = FunctionUtils.getStringValue(arg2, env);
        if (timestamp == null || pattern == null) {
            return AviatorNil.NIL;
        }
        try {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern(pattern);
            String formatted = Instant.ofEpochMilli(timestamp.longValue())
                    .atZone(ZoneOffset.UTC)
                    .format(formatter);
            return new AviatorString(formatted);
        } catch (Exception e) {
            return AviatorNil.NIL;
        }
    }
}
