package com.prism.dsl;

import com.prism.dsl.ast.DslNode;
import com.prism.dsl.ast.FieldRefNode;
import com.prism.dsl.ast.FunctionCallNode;
import com.prism.dsl.ast.LiteralNode;

import java.util.List;

/**
 * Translates a DSL AST into an AviatorScript expression string.
 *
 * <p>Arithmetic, comparison, and logical operators are mapped to native
 * AviatorScript operators. Math functions that have AviatorScript built-ins
 * (e.g. {@code math.pow}) are mapped directly. All other DSL functions are
 * mapped to custom {@code dsl_*} function calls that must be registered
 * with the AviatorScript evaluator instance.</p>
 */
public class AviatorCodeGenerator {

    /**
     * Convert a DSL AST to an AviatorScript expression string.
     *
     * @param node the root AST node
     * @return the AviatorScript expression string
     * @throws IllegalArgumentException if the node type is unknown
     */
    public static String generate(DslNode node) {
        if (node instanceof LiteralNode lit) {
            return switch (lit.type()) {
                case "string" -> "'" + lit.value().toString().replace("'", "\\'") + "'";
                case "number" -> lit.value().toString();
                case "boolean" -> lit.value().toString();
                default -> throw new IllegalArgumentException("Unknown type: " + lit.type());
            };
        }
        if (node instanceof FieldRefNode ref) {
            return switch (ref.source()) {
                case "EVENT" -> "event_props." + ref.field();
                case "PROFILE" -> "profile_props." + ref.field();
                case "PARAM" -> "params." + ref.field();
                default -> throw new IllegalArgumentException("Unknown source: " + ref.source());
            };
        }
        if (node instanceof FunctionCallNode func) {
            List<String> args = func.args().stream()
                    .map(AviatorCodeGenerator::generate).toList();
            return translateFunction(func.name(), args);
        }
        throw new IllegalArgumentException("Unknown node: " + node);
    }

    private static String translateFunction(String name, List<String> args) {
        return switch (name) {
            // Arithmetic
            case "ADD" -> "(" + args.get(0) + " + " + args.get(1) + ")";
            case "SUBTRACT" -> "(" + args.get(0) + " - " + args.get(1) + ")";
            case "MULTIPLY" -> "(" + args.get(0) + " * " + args.get(1) + ")";
            case "DIVIDE" -> "dsl_divide(" + args.get(0) + ", " + args.get(1) + ")";
            case "MOD" -> "(" + args.get(0) + " % " + args.get(1) + ")";
            // Comparison
            case "EQ" -> "(" + args.get(0) + " == " + args.get(1) + ")";
            case "NEQ" -> "(" + args.get(0) + " != " + args.get(1) + ")";
            case "GT" -> "(" + args.get(0) + " > " + args.get(1) + ")";
            case "LT" -> "(" + args.get(0) + " < " + args.get(1) + ")";
            case "GTE" -> "(" + args.get(0) + " >= " + args.get(1) + ")";
            case "LTE" -> "(" + args.get(0) + " <= " + args.get(1) + ")";
            // Logical
            case "AND" -> "(" + String.join(" && ", args) + ")";
            case "OR" -> "(" + String.join(" || ", args) + ")";
            case "NOT" -> "(!" + args.get(0) + ")";
            // Math built-ins
            case "POW" -> "math.pow(" + args.get(0) + ", " + args.get(1) + ")";
            case "ABS" -> "math.abs(" + args.get(0) + ")";
            case "ROUND" -> "math.round(" + args.get(0) + ")";
            case "CEIL" -> "math.ceil(" + args.get(0) + ")";
            case "FLOOR" -> "math.floor(" + args.get(0) + ")";
            case "SQRT" -> "math.sqrt(" + args.get(0) + ")";
            case "LOG" -> "math.log(" + args.get(0) + ")";
            case "EXP" -> "dsl_exp(" + args.get(0) + ")";
            // Conditional
            case "IF" -> "((" + args.get(0) + ") ? (" + args.get(1) + ") : (" + args.get(2) + "))";
            // All other functions → custom dsl_* function calls
            default -> "dsl_" + name.toLowerCase() + "(" + String.join(", ", args) + ")";
        };
    }
}
