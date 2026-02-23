package com.prism.dsl.functions;

import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.function.FunctionUtils;
import com.googlecode.aviator.runtime.type.AviatorDouble;
import com.googlecode.aviator.runtime.type.AviatorNil;
import com.googlecode.aviator.runtime.type.AviatorObject;

import java.util.Map;

/**
 * Zero-safe division: {@code dsl_divide(a, b)}.
 * Returns null when the divisor is zero.
 */
public class DivideFunction extends AbstractFunction {

    @Override
    public String getName() {
        return "dsl_divide";
    }

    @Override
    public AviatorObject call(Map<String, Object> env, AviatorObject arg1, AviatorObject arg2) {
        Number a = FunctionUtils.getNumberValue(arg1, env);
        Number b = FunctionUtils.getNumberValue(arg2, env);
        if (a == null || b == null) {
            return AviatorNil.NIL;
        }
        if (b.doubleValue() == 0.0) {
            return AviatorNil.NIL;
        }
        return new AviatorDouble(a.doubleValue() / b.doubleValue());
    }
}
