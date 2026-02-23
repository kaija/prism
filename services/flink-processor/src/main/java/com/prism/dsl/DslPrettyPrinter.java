package com.prism.dsl;

import com.prism.dsl.ast.DslNode;
import com.prism.dsl.ast.FieldRefNode;
import com.prism.dsl.ast.FunctionCallNode;
import com.prism.dsl.ast.LiteralNode;

import java.util.stream.Collectors;

/**
 * Pretty-printer that converts a DSL AST back to a canonical expression string.
 *
 * <p>Mirrors the Python {@code pretty_printer.py} behavior:
 * <ul>
 *   <li>FunctionCallNode: {@code NAME(arg1, arg2, ...)}</li>
 *   <li>FieldRefNode: {@code SOURCE("field")} with escaped quotes</li>
 *   <li>LiteralNode string: {@code "value"} with escaped quotes</li>
 *   <li>LiteralNode boolean: {@code true} or {@code false} (lowercase)</li>
 *   <li>LiteralNode number: integers without decimal, doubles with decimal;
 *       if a double equals its int value (e.g. 3.0), print as integer "3"</li>
 * </ul>
 */
public class DslPrettyPrinter {

    /**
     * Convert an AST node to its canonical DSL expression string.
     *
     * @param node the AST node to print
     * @return the canonical DSL expression string
     * @throws IllegalArgumentException if the node type is unknown
     */
    public static String print(DslNode node) {
        if (node instanceof FunctionCallNode func) {
            String args = func.args().stream()
                    .map(DslPrettyPrinter::print)
                    .collect(Collectors.joining(", "));
            return func.name() + "(" + args + ")";
        }
        if (node instanceof FieldRefNode ref) {
            String escaped = ref.field().replace("\"", "\\\"");
            return ref.source() + "(\"" + escaped + "\")";
        }
        if (node instanceof LiteralNode lit) {
            return switch (lit.type()) {
                case "string" -> {
                    String escaped = lit.value().toString().replace("\"", "\\\"");
                    yield "\"" + escaped + "\"";
                }
                case "boolean" -> lit.value().equals(Boolean.TRUE) ? "true" : "false";
                case "number" -> formatNumber(lit.value());
                default -> throw new IllegalArgumentException("Unknown literal type: " + lit.type());
            };
        }
        throw new IllegalArgumentException("Unknown AST node: " + node);
    }

    private static String formatNumber(Object value) {
        if (value instanceof Double d) {
            // If the double equals its integer value, print without decimal point
            if (d == Math.floor(d) && !Double.isInfinite(d)) {
                return String.valueOf((long) d.doubleValue());
            }
            return String.valueOf(d);
        }
        // Long, Integer, or other Number types — just use toString
        return value.toString();
    }
}
