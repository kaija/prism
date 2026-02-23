package com.prism.dsl.functions;

import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.type.AviatorBoolean;
import com.googlecode.aviator.runtime.type.AviatorNil;
import com.googlecode.aviator.runtime.type.AviatorObject;

import java.util.Map;

/**
 * Conversion: {@code dsl_to_boolean(expr)}.
 * Converts the expression result to a boolean type.
 */
public class ToBooleanFunction extends AbstractFunction {

    @Override
    public String getName() {
        return "dsl_to_boolean";
    }

    @Override
    public AviatorObject call(Map<String, Object> env, AviatorObject arg1) {
        Object val = arg1.getValue(env);
        if (val == null) {
            return AviatorNil.NIL;
        }
        if (val instanceof Boolean b) {
            return AviatorBoolean.valueOf(b);
        }
        if (val instanceof Number n) {
            return AviatorBoolean.valueOf(n.doubleValue() != 0.0);
        }
        if (val instanceof String s) {
            return AviatorBoolean.valueOf("true".equalsIgnoreCase(s));
        }
        return AviatorBoolean.FALSE;
    }
}
