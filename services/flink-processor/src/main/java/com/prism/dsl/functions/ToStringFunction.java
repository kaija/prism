package com.prism.dsl.functions;

import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.type.AviatorNil;
import com.googlecode.aviator.runtime.type.AviatorObject;
import com.googlecode.aviator.runtime.type.AviatorString;

import java.util.Map;

/**
 * Conversion: {@code dsl_to_string(expr)}.
 * Converts the expression result to a string type.
 */
public class ToStringFunction extends AbstractFunction {

    @Override
    public String getName() {
        return "dsl_to_string";
    }

    @Override
    public AviatorObject call(Map<String, Object> env, AviatorObject arg1) {
        Object val = arg1.getValue(env);
        if (val == null) {
            return AviatorNil.NIL;
        }
        return new AviatorString(val.toString());
    }
}
