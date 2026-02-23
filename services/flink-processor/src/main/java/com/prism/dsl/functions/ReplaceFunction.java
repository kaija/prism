package com.prism.dsl.functions;

import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.function.FunctionUtils;
import com.googlecode.aviator.runtime.type.AviatorNil;
import com.googlecode.aviator.runtime.type.AviatorObject;
import com.googlecode.aviator.runtime.type.AviatorString;

import java.util.Map;

/**
 * String: {@code dsl_replace(str, old, new)}.
 */
public class ReplaceFunction extends AbstractFunction {

    @Override
    public String getName() {
        return "dsl_replace";
    }

    @Override
    public AviatorObject call(Map<String, Object> env,
                              AviatorObject arg1, AviatorObject arg2, AviatorObject arg3) {
        String str = FunctionUtils.getStringValue(arg1, env);
        String oldStr = FunctionUtils.getStringValue(arg2, env);
        String newStr = FunctionUtils.getStringValue(arg3, env);
        if (str == null || oldStr == null || newStr == null) {
            return AviatorNil.NIL;
        }
        return new AviatorString(str.replace(oldStr, newStr));
    }
}
