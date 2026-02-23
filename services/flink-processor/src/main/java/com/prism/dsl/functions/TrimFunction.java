package com.prism.dsl.functions;

import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.function.FunctionUtils;
import com.googlecode.aviator.runtime.type.AviatorNil;
import com.googlecode.aviator.runtime.type.AviatorObject;
import com.googlecode.aviator.runtime.type.AviatorString;

import java.util.Map;

/**
 * String: {@code dsl_trim(str)}.
 */
public class TrimFunction extends AbstractFunction {

    @Override
    public String getName() {
        return "dsl_trim";
    }

    @Override
    public AviatorObject call(Map<String, Object> env, AviatorObject arg1) {
        String str = FunctionUtils.getStringValue(arg1, env);
        if (str == null) {
            return AviatorNil.NIL;
        }
        return new AviatorString(str.trim());
    }
}
