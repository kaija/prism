package com.prism.dsl.functions;

import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.function.FunctionUtils;
import com.googlecode.aviator.runtime.type.AviatorLong;
import com.googlecode.aviator.runtime.type.AviatorNil;
import com.googlecode.aviator.runtime.type.AviatorObject;

import java.util.Map;

/**
 * String: {@code dsl_length(str)}.
 * Returns the character count of the string.
 */
public class LengthFunction extends AbstractFunction {

    @Override
    public String getName() {
        return "dsl_length";
    }

    @Override
    public AviatorObject call(Map<String, Object> env, AviatorObject arg1) {
        String str = FunctionUtils.getStringValue(arg1, env);
        if (str == null) {
            return AviatorNil.NIL;
        }
        return AviatorLong.valueOf((long) str.length());
    }
}
