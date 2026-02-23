package com.prism.dsl.functions;

import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.function.FunctionUtils;
import com.googlecode.aviator.runtime.type.AviatorNil;
import com.googlecode.aviator.runtime.type.AviatorObject;
import com.googlecode.aviator.runtime.type.AviatorString;

import java.util.Map;

/**
 * String: {@code dsl_substring(str, start, length)}.
 */
public class SubstringFunction extends AbstractFunction {

    @Override
    public String getName() {
        return "dsl_substring";
    }

    @Override
    public AviatorObject call(Map<String, Object> env,
                              AviatorObject arg1, AviatorObject arg2, AviatorObject arg3) {
        String str = FunctionUtils.getStringValue(arg1, env);
        Number start = FunctionUtils.getNumberValue(arg2, env);
        Number length = FunctionUtils.getNumberValue(arg3, env);
        if (str == null || start == null || length == null) {
            return AviatorNil.NIL;
        }
        int s = Math.max(0, start.intValue());
        int end = Math.min(str.length(), s + length.intValue());
        if (s >= str.length()) {
            return new AviatorString("");
        }
        return new AviatorString(str.substring(s, end));
    }
}
