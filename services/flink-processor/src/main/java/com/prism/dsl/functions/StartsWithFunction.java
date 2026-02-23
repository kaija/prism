package com.prism.dsl.functions;

import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.function.FunctionUtils;
import com.googlecode.aviator.runtime.type.AviatorBoolean;
import com.googlecode.aviator.runtime.type.AviatorObject;

import java.util.Map;

/**
 * String: {@code dsl_starts_with(str, prefix)}.
 */
public class StartsWithFunction extends AbstractFunction {

    @Override
    public String getName() {
        return "dsl_starts_with";
    }

    @Override
    public AviatorObject call(Map<String, Object> env, AviatorObject arg1, AviatorObject arg2) {
        String str = FunctionUtils.getStringValue(arg1, env);
        String prefix = FunctionUtils.getStringValue(arg2, env);
        if (str == null || prefix == null) {
            return AviatorBoolean.FALSE;
        }
        return AviatorBoolean.valueOf(str.startsWith(prefix));
    }
}
