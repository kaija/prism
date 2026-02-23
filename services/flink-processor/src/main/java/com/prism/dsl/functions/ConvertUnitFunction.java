package com.prism.dsl.functions;

import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.function.FunctionUtils;
import com.googlecode.aviator.runtime.type.AviatorDouble;
import com.googlecode.aviator.runtime.type.AviatorNil;
import com.googlecode.aviator.runtime.type.AviatorObject;

import java.util.Map;

/**
 * Conversion: {@code dsl_convert_unit(value, from_unit, to_unit)}.
 * Converts a numeric value between measurement units.
 */
public class ConvertUnitFunction extends AbstractFunction {

    // Conversion factors to a base unit (meters for length, grams for mass, seconds for time)
    private static final Map<String, Double> LENGTH_TO_METERS = Map.of(
            "mm", 0.001, "cm", 0.01, "m", 1.0, "km", 1000.0,
            "in", 0.0254, "ft", 0.3048, "yd", 0.9144, "mi", 1609.344
    );
    private static final Map<String, Double> MASS_TO_GRAMS = Map.of(
            "mg", 0.001, "g", 1.0, "kg", 1000.0,
            "oz", 28.3495, "lb", 453.592
    );
    private static final Map<String, Double> TIME_TO_SECONDS = Map.of(
            "ms", 0.001, "s", 1.0, "min", 60.0, "h", 3600.0, "d", 86400.0
    );

    @Override
    public String getName() {
        return "dsl_convert_unit";
    }

    @Override
    public AviatorObject call(Map<String, Object> env,
                              AviatorObject arg1, AviatorObject arg2, AviatorObject arg3) {
        Number value = FunctionUtils.getNumberValue(arg1, env);
        String fromUnit = FunctionUtils.getStringValue(arg2, env);
        String toUnit = FunctionUtils.getStringValue(arg3, env);
        if (value == null || fromUnit == null || toUnit == null) {
            return AviatorNil.NIL;
        }
        String from = fromUnit.toLowerCase();
        String to = toUnit.toLowerCase();
        Double result = tryConvert(value.doubleValue(), from, to, LENGTH_TO_METERS);
        if (result == null) result = tryConvert(value.doubleValue(), from, to, MASS_TO_GRAMS);
        if (result == null) result = tryConvert(value.doubleValue(), from, to, TIME_TO_SECONDS);
        if (result == null) {
            return AviatorNil.NIL;
        }
        return new AviatorDouble(result);
    }

    private Double tryConvert(double value, String from, String to, Map<String, Double> factors) {
        Double fromFactor = factors.get(from);
        Double toFactor = factors.get(to);
        if (fromFactor != null && toFactor != null) {
            return value * fromFactor / toFactor;
        }
        return null;
    }
}
