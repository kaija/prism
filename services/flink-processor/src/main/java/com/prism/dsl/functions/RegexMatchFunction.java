package com.prism.dsl.functions;

import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.function.FunctionUtils;
import com.googlecode.aviator.runtime.type.AviatorBoolean;
import com.googlecode.aviator.runtime.type.AviatorObject;

import java.util.Map;
import java.util.regex.Pattern;

/**
 * String: {@code dsl_regex_match(str, pattern)}.
 */
public class RegexMatchFunction extends AbstractFunction {

    @Override
    public String getName() {
        return "dsl_regex_match";
    }

    @Override
    public AviatorObject call(Map<String, Object> env, AviatorObject arg1, AviatorObject arg2) {
        String str = FunctionUtils.getStringValue(arg1, env);
        String pattern = FunctionUtils.getStringValue(arg2, env);
        if (str == null || pattern == null) {
            return AviatorBoolean.FALSE;
        }
        try {
            return AviatorBoolean.valueOf(Pattern.matches(pattern, str));
        } catch (Exception e) {
            return AviatorBoolean.FALSE;
        }
    }
}
