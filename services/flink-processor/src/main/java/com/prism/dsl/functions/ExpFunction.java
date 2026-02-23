package com.prism.dsl.functions;

import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.function.FunctionUtils;
import com.googlecode.aviator.runtime.type.AviatorDouble;
import com.googlecode.aviator.runtime.type.AviatorNil;
import com.googlecode.aviator.runtime.type.AviatorObject;

import java.util.Map;

/**
 * Exponential function: {@code dsl_exp(x)} returns {@code e^x}.
 */
public class ExpFunction extends AbstractFunction {

    @Override
    public String getName() {
        return "dsl_exp";
    }

    @Override
    public AviatorObject call(Map<String, Object> env, AviatorObject arg1) {
        Number x = FunctionUtils.getNumberValue(arg1, env);
        if (x == null) {
            return AviatorNil.NIL;
        }
        return new AviatorDouble(Math.exp(x.doubleValue()));
    }
}
