package com.prism.dsl.functions;

import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.function.FunctionUtils;
import com.googlecode.aviator.runtime.type.AviatorBoolean;
import com.googlecode.aviator.runtime.type.AviatorObject;

import java.util.Map;

/**
 * String: {@code dsl_ends_with(str, suffix)}.
 */
public class EndsWithFunction extends AbstractFunction {

    @Override
    public String getName() {
        return "dsl_ends_with";
    }

    @Override
    public AviatorObject call(Map<String, Object> env, AviatorObject arg1, AviatorObject arg2) {
        String str = FunctionUtils.getStringValue(arg1, env);
        String suffix = FunctionUtils.getStringValue(arg2, env);
        if (str == null || suffix == null) {
            return AviatorBoolean.FALSE;
        }
        return AviatorBoolean.valueOf(str.endsWith(suffix));
    }
}
