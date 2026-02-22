package com.prism.filters;

import com.prism.models.Condition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

/**
 * Evaluates a single {@link Condition} against a context map.
 * Supports string, boolean, and number comparison operators.
 * Attribute paths use dotted notation (e.g. "event.props.amount") to traverse nested maps.
 */
public class ConditionEvaluator {

    private static final Logger log = LoggerFactory.getLogger(ConditionEvaluator.class);

    private ConditionEvaluator() {
        // utility class
    }

    /**
     * Evaluate a condition against the given context map.
     *
     * @param condition the condition to evaluate
     * @param context   the context map containing event/profile data
     * @return true if the condition matches, false otherwise (including missing attributes)
     */
    public static boolean evaluate(Condition condition, Map<String, Object> context) {
        Object value = resolveAttribute(condition.attribute(), context);
        if (value == null) return false;

        return switch (condition.operator()) {
            // String operators
            case "is" -> String.valueOf(value).equals(condition.value());
            case "not_is" -> !String.valueOf(value).equals(condition.value());
            case "contain" -> String.valueOf(value).contains(condition.value());
            case "not_contain" -> !String.valueOf(value).contains(condition.value());
            case "start_with" -> String.valueOf(value).startsWith(condition.value());
            case "not_start_with" -> !String.valueOf(value).startsWith(condition.value());
            case "end_with" -> String.valueOf(value).endsWith(condition.value());
            case "not_end_with" -> !String.valueOf(value).endsWith(condition.value());
            // Boolean operators
            case "is_true" -> Boolean.TRUE.equals(value);
            case "is_false" -> Boolean.FALSE.equals(value);
            // Number operators
            case "equal" -> toDouble(value) == toDouble(condition.value());
            case "not_equal" -> toDouble(value) != toDouble(condition.value());
            case "larger" -> toDouble(value) > toDouble(condition.value());
            case "less" -> toDouble(value) < toDouble(condition.value());
            default -> {
                log.debug("Unknown operator: {}", condition.operator());
                yield false;
            }
        };
    }

    /**
     * Resolve an attribute value from the context map using a dotted path.
     * For example, "event.props.amount" traverses context.get("event") -> ((Map)result).get("props") -> ((Map)result).get("amount").
     *
     * @param path    the dotted attribute path
     * @param context the context map
     * @return the resolved value, or null if any segment is missing or not a map
     */
    @SuppressWarnings("unchecked")
    static Object resolveAttribute(String path, Map<String, Object> context) {
        if (path == null || path.isEmpty() || context == null) return null;

        String[] segments = path.split("\\.");
        Object current = context;

        for (String segment : segments) {
            if (current instanceof Map<?, ?> map) {
                current = map.get(segment);
                if (current == null) return null;
            } else {
                return null;
            }
        }

        return current;
    }

    /**
     * Convert a value to double for numeric comparisons.
     * Handles String, Integer, Long, Double, Float, and other Number subclasses.
     *
     * @param value the value to convert
     * @return the double representation, or Double.NaN if conversion fails
     */
    static double toDouble(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        if (value instanceof String str) {
            try {
                return Double.parseDouble(str);
            } catch (NumberFormatException e) {
                return Double.NaN;
            }
        }
        return Double.NaN;
    }
}
