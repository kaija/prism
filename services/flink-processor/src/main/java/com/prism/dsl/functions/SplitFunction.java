package com.prism.dsl.functions;

import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.function.FunctionUtils;
import com.googlecode.aviator.runtime.type.AviatorObject;
import com.googlecode.aviator.runtime.type.AviatorRuntimeJavaType;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * String: {@code dsl_split(str, delimiter)}.
 * Splits a string by the delimiter and returns a list.
 */
public class SplitFunction extends AbstractFunction {

    @Override
    public String getName() {
        return "dsl_split";
    }

    @Override
    public AviatorObject call(Map<String, Object> env, AviatorObject arg1, AviatorObject arg2) {
        String str = FunctionUtils.getStringValue(arg1, env);
        String delimiter = FunctionUtils.getStringValue(arg2, env);
        if (str == null || delimiter == null) {
            return AviatorRuntimeJavaType.valueOf(List.of());
        }
        List<String> parts = Arrays.asList(str.split(java.util.regex.Pattern.quote(delimiter), -1));
        return AviatorRuntimeJavaType.valueOf(parts);
    }
}
