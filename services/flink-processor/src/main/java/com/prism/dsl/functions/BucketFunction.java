package com.prism.dsl.functions;

import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.function.FunctionUtils;
import com.googlecode.aviator.runtime.type.AviatorNil;
import com.googlecode.aviator.runtime.type.AviatorObject;
import com.googlecode.aviator.runtime.type.AviatorString;

import java.util.List;
import java.util.Map;

/**
 * Segmentation: {@code dsl_bucket(value, boundaries)}.
 * Assigns a numeric value to a bucket based on boundary values.
 * Labels: "< lower" for first bucket, "[lower, upper)" for intermediate, ">= upper" for last.
 */
public class BucketFunction extends AbstractFunction {

    @Override
    public String getName() {
        return "dsl_bucket";
    }

    @Override
    public AviatorObject call(Map<String, Object> env, AviatorObject arg1, AviatorObject arg2) {
        Number value = FunctionUtils.getNumberValue(arg1, env);
        Object boundariesObj = arg2.getValue(env);
        if (value == null || boundariesObj == null) {
            return AviatorNil.NIL;
        }
        List<?> rawBoundaries;
        if (boundariesObj instanceof List<?> list) {
            rawBoundaries = list;
        } else {
            return AviatorNil.NIL;
        }
        if (rawBoundaries.isEmpty()) {
            return AviatorNil.NIL;
        }
        double[] boundaries = rawBoundaries.stream()
                .filter(b -> b instanceof Number)
                .mapToDouble(b -> ((Number) b).doubleValue())
                .sorted()
                .toArray();
        if (boundaries.length == 0) {
            return AviatorNil.NIL;
        }
        double v = value.doubleValue();
        // First bucket: value < first boundary
        if (v < boundaries[0]) {
            return new AviatorString("< " + formatBoundary(boundaries[0]));
        }
        // Last bucket: value >= last boundary
        if (v >= boundaries[boundaries.length - 1]) {
            return new AviatorString(">= " + formatBoundary(boundaries[boundaries.length - 1]));
        }
        // Intermediate buckets
        for (int i = 0; i < boundaries.length - 1; i++) {
            if (v >= boundaries[i] && v < boundaries[i + 1]) {
                return new AviatorString("[" + formatBoundary(boundaries[i]) + ", "
                        + formatBoundary(boundaries[i + 1]) + ")");
            }
        }
        return AviatorNil.NIL;
    }

    private String formatBoundary(double val) {
        if (val == Math.floor(val) && !Double.isInfinite(val)) {
            return String.valueOf((long) val);
        }
        return String.valueOf(val);
    }
}
