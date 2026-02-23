package com.prism.dsl.functions;

import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.type.AviatorDouble;
import com.googlecode.aviator.runtime.type.AviatorNil;
import com.googlecode.aviator.runtime.type.AviatorObject;

import java.util.Map;

/**
 * Conversion: {@code dsl_to_number(expr)}.
 * Converts the expression result to a numeric type.
 */
public class ToNumberFunction extends AbstractFunction {

    @Override
    public String getName() {
        return "dsl_to_number";
    }

    @Override
    public AviatorObject call(Map<String, Object> env, AviatorObject arg1) {
        Object val = arg1.getValue(env);
        if (val == null) {
            return AviatorNil.NIL;
        }
        if (val instanceof Number n) {
            return new AviatorDouble(n.doubleValue());
        }
        if (val instanceof Boolean b) {
            return new AviatorDouble(b ? 1.0 : 0.0);
        }
        try {
            return new AviatorDouble(Double.parseDouble(val.toString()));
        } catch (NumberFormatException e) {
            return AviatorNil.NIL;
        }
    }
}
