package com.prism.dsl;

import com.prism.dsl.ast.DslNode;
import com.prism.dsl.ast.FieldRefNode;
import com.prism.dsl.ast.FunctionCallNode;
import com.prism.dsl.ast.LiteralNode;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Centralized catalog of all DSL function signatures.
 *
 * <p>Mirrors the Python {@code function_registry.py} exactly so that both
 * runtimes validate expressions against the same set of functions.</p>
 */
public final class FunctionRegistry {

    /**
     * Describes a single DSL function's type signature.
     *
     * @param name       function name (uppercase)
     * @param minArgs    minimum number of arguments
     * @param maxArgs    maximum number of arguments, or {@code null} for variadic
     * @param argTypes   expected argument types (e.g. ["number", "number"])
     * @param returnType the type returned by this function
     */
    public record FunctionSignature(
            String name,
            int minArgs,
            Integer maxArgs,
            List<String> argTypes,
            String returnType
    ) {
        public FunctionSignature {
            argTypes = List.copyOf(argTypes);
        }
    }

    /**
     * Validates a DSL AST node against the function registry.
     *
     * <p>Mirrors the Python validator in {@code services/backend-api/app/dsl/validator.py}.
     * Recursively checks that every function call references a known function,
     * provides the correct number of arguments, and uses compatible argument types.</p>
     *
     * @param node the root AST node to validate
     * @return a {@link ValidationResult} with errors (if any) and the inferred return type
     */
    public static ValidationResult validate(DslNode node) {
        List<String> errors = new ArrayList<>();
        String returnType = validateNode(node, errors);
        return new ValidationResult(errors.isEmpty(), errors, returnType);
    }

    private static boolean isTypeCompatible(String expected, String actual) {
        if (actual == null || "any".equals(expected) || "any".equals(actual)) {
            return true;
        }
        return expected.equals(actual);
    }

    private static String validateNode(DslNode node, List<String> errors) {
        if (node instanceof LiteralNode lit) {
            return lit.type();
        }
        if (node instanceof FieldRefNode) {
            return "any";
        }
        if (node instanceof FunctionCallNode func) {
            FunctionSignature sig = REGISTRY.get(func.name());
            if (sig == null) {
                errors.add("Unknown function: " + func.name());
                return null;
            }

            int argCount = func.args().size();

            if (argCount < sig.minArgs()) {
                errors.add(sig.name() + " requires at least " + sig.minArgs()
                        + " argument(s), got " + argCount);
            }
            if (sig.maxArgs() != null && argCount > sig.maxArgs()) {
                errors.add(sig.name() + " accepts at most " + sig.maxArgs()
                        + " argument(s), got " + argCount);
            }

            // Validate each argument recursively and check type compatibility
            List<String> argTypes = sig.argTypes();
            for (int i = 0; i < func.args().size(); i++) {
                String argType = validateNode(func.args().get(i), errors);
                if (!argTypes.isEmpty()) {
                    String expected = argTypes.get(Math.min(i, argTypes.size() - 1));
                    if (!isTypeCompatible(expected, argType)) {
                        errors.add(sig.name() + " argument " + (i + 1)
                                + " expected " + expected + ", got " + argType);
                    }
                }
            }

            return sig.returnType();
        }
        return null;
    }


    /**
     * Result of validating a DSL AST against the function registry.
     *
     * @param valid      {@code true} when no validation errors were found
     * @param errors     list of human-readable error messages (empty when valid)
     * @param returnType the inferred return type of the root expression, or {@code null} on error
     */
    public record ValidationResult(
            boolean valid,
            List<String> errors,
            String returnType
    ) {
        public ValidationResult {
            errors = List.copyOf(errors);
        }
    }


    private static final Map<String, FunctionSignature> REGISTRY;

    static {
        var m = new LinkedHashMap<String, FunctionSignature>();

        // Logical
        m.put("AND",   sig("AND",   2, null, List.of("boolean"), "boolean"));
        m.put("OR",    sig("OR",    2, null, List.of("boolean"), "boolean"));
        m.put("NOT",   sig("NOT",   1, 1,    List.of("boolean"), "boolean"));

        // Comparison
        m.put("EQ",    sig("EQ",    2, 2, List.of("any", "any"), "boolean"));
        m.put("NEQ",   sig("NEQ",   2, 2, List.of("any", "any"), "boolean"));
        m.put("GT",    sig("GT",    2, 2, List.of("number", "number"), "boolean"));
        m.put("LT",    sig("LT",    2, 2, List.of("number", "number"), "boolean"));
        m.put("GTE",   sig("GTE",   2, 2, List.of("number", "number"), "boolean"));
        m.put("LTE",   sig("LTE",   2, 2, List.of("number", "number"), "boolean"));

        // Aggregation
        m.put("COUNT",  sig("COUNT",  1, 1, List.of("any"), "number"));
        m.put("SUM",    sig("SUM",    1, 1, List.of("number"), "number"));
        m.put("AVG",    sig("AVG",    1, 1, List.of("number"), "number"));
        m.put("MIN",    sig("MIN",    1, 1, List.of("number"), "number"));
        m.put("MAX",    sig("MAX",    1, 1, List.of("number"), "number"));
        m.put("UNIQUE", sig("UNIQUE", 1, 1, List.of("any"), "array"));
        m.put("TOP",    sig("TOP",    2, 2, List.of("any", "number"), "array"));

        // Math
        m.put("ADD",      sig("ADD",      2, 2, List.of("number", "number"), "number"));
        m.put("SUBTRACT", sig("SUBTRACT", 2, 2, List.of("number", "number"), "number"));
        m.put("MULTIPLY", sig("MULTIPLY", 2, 2, List.of("number", "number"), "number"));
        m.put("DIVIDE",   sig("DIVIDE",   2, 2, List.of("number", "number"), "number"));
        m.put("MOD",      sig("MOD",      2, 2, List.of("number", "number"), "number"));
        m.put("POW",      sig("POW",      2, 2, List.of("number", "number"), "number"));
        m.put("ABS",      sig("ABS",      1, 1, List.of("number"), "number"));
        m.put("ROUND",    sig("ROUND",    1, 1, List.of("number"), "number"));
        m.put("CEIL",     sig("CEIL",     1, 1, List.of("number"), "number"));
        m.put("FLOOR",    sig("FLOOR",    1, 1, List.of("number"), "number"));
        m.put("SQRT",     sig("SQRT",     1, 1, List.of("number"), "number"));
        m.put("LOG",      sig("LOG",      1, 1, List.of("number"), "number"));
        m.put("EXP",      sig("EXP",      1, 1, List.of("number"), "number"));

        // Date/Time
        m.put("ACTION_TIME",    sig("ACTION_TIME",    0, 0, List.of(), "number"));
        m.put("NOW",            sig("NOW",            0, 0, List.of(), "number"));
        m.put("DATE_FORMAT",    sig("DATE_FORMAT",    2, 2, List.of("number", "string"), "string"));
        m.put("DATE_DIFF",      sig("DATE_DIFF",      3, 3, List.of("string", "number", "number"), "number"));
        m.put("WEEKDAY",        sig("WEEKDAY",        1, 1, List.of("number"), "number"));
        m.put("IN_RECENT_DAYS", sig("IN_RECENT_DAYS", 1, 1, List.of("number"), "boolean"));
        m.put("IS_RECURRING",   sig("IS_RECURRING",   2, 2, List.of("any", "number"), "boolean"));

        // Data Access
        m.put("EVENT",   sig("EVENT",   1, 1, List.of("string"), "any"));
        m.put("PROFILE", sig("PROFILE", 1, 1, List.of("string"), "any"));
        m.put("PARAM",   sig("PARAM",   1, 1, List.of("string"), "any"));

        // String
        m.put("CONTAINS",    sig("CONTAINS",    2, 2, List.of("string", "string"), "boolean"));
        m.put("STARTS_WITH", sig("STARTS_WITH", 2, 2, List.of("string", "string"), "boolean"));
        m.put("ENDS_WITH",   sig("ENDS_WITH",   2, 2, List.of("string", "string"), "boolean"));
        m.put("REGEX_MATCH", sig("REGEX_MATCH", 2, 2, List.of("string", "string"), "boolean"));
        m.put("UPPER",       sig("UPPER",       1, 1, List.of("string"), "string"));
        m.put("LOWER",       sig("LOWER",       1, 1, List.of("string"), "string"));
        m.put("TRIM",        sig("TRIM",        1, 1, List.of("string"), "string"));
        m.put("SUBSTRING",   sig("SUBSTRING",   3, 3, List.of("string", "number", "number"), "string"));
        m.put("REPLACE",     sig("REPLACE",     3, 3, List.of("string", "string", "string"), "string"));
        m.put("CONCAT",      sig("CONCAT",      2, null, List.of("string"), "string"));
        m.put("SPLIT",       sig("SPLIT",       2, 2, List.of("string", "string"), "array"));
        m.put("LENGTH",      sig("LENGTH",      1, 1, List.of("string"), "number"));

        // Filtering
        m.put("IF",    sig("IF",    3, 3, List.of("boolean", "any", "any"), "any"));
        m.put("WHERE", sig("WHERE", 2, 2, List.of("any", "boolean"), "any"));
        m.put("BY",    sig("BY",    2, 2, List.of("any", "string"), "any"));

        // Conversion
        m.put("TO_NUMBER",    sig("TO_NUMBER",    1, 1, List.of("any"), "number"));
        m.put("TO_STRING",    sig("TO_STRING",    1, 1, List.of("any"), "string"));
        m.put("TO_BOOLEAN",   sig("TO_BOOLEAN",   1, 1, List.of("any"), "boolean"));
        m.put("CONVERT_UNIT", sig("CONVERT_UNIT", 3, 3, List.of("number", "string", "string"), "number"));

        // Segmentation
        m.put("BUCKET", sig("BUCKET", 2, 2, List.of("number", "array"), "string"));

        REGISTRY = Collections.unmodifiableMap(m);
    }

    private FunctionRegistry() {}

    /**
     * Returns an unmodifiable view of the full function registry.
     */
    public static Map<String, FunctionSignature> getRegistry() {
        return REGISTRY;
    }

    /**
     * Looks up a function signature by name (case-insensitive).
     *
     * @param name function name
     * @return the signature, or {@code null} if not found
     */
    public static FunctionSignature lookup(String name) {
        return REGISTRY.get(name == null ? null : name.toUpperCase());
    }

    private static FunctionSignature sig(String name, int minArgs, Integer maxArgs,
                                         List<String> argTypes, String returnType) {
        return new FunctionSignature(name, minArgs, maxArgs, argTypes, returnType);
    }
}
