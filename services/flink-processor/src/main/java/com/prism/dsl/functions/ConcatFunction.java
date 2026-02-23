package com.prism.dsl.functions;

import com.googlecode.aviator.runtime.function.AbstractVariadicFunction;
import com.googlecode.aviator.runtime.function.FunctionUtils;
import com.googlecode.aviator.runtime.type.AviatorObject;
import com.googlecode.aviator.runtime.type.AviatorString;

import java.util.Map;

/**
 * String: {@code dsl_concat(str1, str2, ...)}.
 * Variadic concatenation of string arguments.
 */
public class ConcatFunction extends AbstractVariadicFunction {

    @Override
    public String getName() {
        return "dsl_concat";
    }

    @Override
    public AviatorObject variadicCall(Map<String, Object> env, AviatorObject... args) {
        StringBuilder sb = new StringBuilder();
        for (AviatorObject arg : args) {
            String s = FunctionUtils.getStringValue(arg, env);
            if (s != null) {
                sb.append(s);
            }
        }
        return new AviatorString(sb.toString());
    }
}
