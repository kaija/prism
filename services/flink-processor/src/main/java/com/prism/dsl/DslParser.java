package com.prism.dsl;

import com.prism.dsl.ast.DslNode;
import com.prism.dsl.ast.FieldRefNode;
import com.prism.dsl.ast.FunctionCallNode;
import com.prism.dsl.ast.LiteralNode;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Recursive-descent parser for DSL expressions.
 *
 * <p>Parses a DSL expression string into an AST of {@link DslNode} instances.
 * Supports function calls, string/number/boolean literals, and field references
 * (EVENT, PROFILE, PARAM). Function names are normalized to uppercase.</p>
 */
public class DslParser {

    private static final Pattern FUNC_CALL = Pattern.compile(
            "^([A-Za-z_][A-Za-z0-9_]*)\\((.*)\\)$", Pattern.DOTALL);
    private static final Pattern NUMBER = Pattern.compile("^-?[0-9]+(\\.[0-9]+)?$");
    private static final Pattern BOOLEAN = Pattern.compile("^(true|false)$", Pattern.CASE_INSENSITIVE);
    private static final Set<String> FIELD_REF_FUNCTIONS = Set.of("EVENT", "PROFILE", "PARAM");

    /**
     * Parse a DSL expression string into an AST.
     *
     * @param expression the DSL expression to parse
     * @return the root AST node
     * @throws DslParseException if the expression cannot be parsed
     */
    public static DslNode parse(String expression) {
        if (expression == null) {
            throw new DslParseException("Cannot parse expression: null");
        }
        String trimmed = expression.trim();
        if (trimmed.isEmpty()) {
            throw new DslParseException("Cannot parse expression: (empty)");
        }

        // Try string literal
        if (trimmed.startsWith("\"") && trimmed.endsWith("\"") && isCompleteString(trimmed)) {
            String val = trimmed.substring(1, trimmed.length() - 1)
                    .replace("\\\"", "\"");
            return new LiteralNode(val, "string");
        }

        // Try number literal
        if (NUMBER.matcher(trimmed).matches()) {
            if (trimmed.contains(".")) {
                return new LiteralNode(Double.parseDouble(trimmed), "number");
            }
            return new LiteralNode(Long.parseLong(trimmed), "number");
        }

        // Try boolean literal
        if (BOOLEAN.matcher(trimmed).matches()) {
            return new LiteralNode(Boolean.parseBoolean(trimmed.toLowerCase()), "boolean");
        }

        // Try function call
        Matcher m = FUNC_CALL.matcher(trimmed);
        if (m.matches()) {
            String name = m.group(1).toUpperCase();
            String argsStr = m.group(2).trim();
            List<DslNode> args = argsStr.isEmpty()
                    ? List.of()
                    : splitArgs(argsStr).stream().map(DslParser::parse).toList();

            // Handle field refs as special function calls
            if (FIELD_REF_FUNCTIONS.contains(name) && args.size() == 1) {
                if (args.get(0) instanceof LiteralNode lit && "string".equals(lit.type())) {
                    return new FieldRefNode(name, (String) lit.value());
                }
            }
            return new FunctionCallNode(name, args);
        }

        throw new DslParseException("Cannot parse expression: " + trimmed);
    }

    /**
     * Check if a string starting and ending with quotes is a complete string literal
     * (not a function call that happens to start with a quote in its first arg
     * and end with a quote in its last arg).
     */
    private static boolean isCompleteString(String s) {
        // Walk through the string checking for properly escaped quotes
        int i = 1; // skip opening quote
        while (i < s.length() - 1) {
            char c = s.charAt(i);
            if (c == '\\') {
                i += 2; // skip escaped character
            } else if (c == '"') {
                // Found an unescaped quote before the end — not a simple string literal
                return false;
            } else {
                i++;
            }
        }
        return true;
    }

    /**
     * Split top-level comma-separated arguments, respecting nested parentheses and quoted strings.
     *
     * <p>Examples:
     * <ul>
     *   <li>{@code "1, MULTIPLY(2, 3)"} → {@code ["1", "MULTIPLY(2, 3)"]}</li>
     *   <li>{@code "\"hello, world\", \"foo\""} → {@code ["\"hello, world\"", "\"foo\""]}</li>
     * </ul>
     *
     * @param argsStr the arguments portion of a function call (between outer parens)
     * @return list of individual argument strings
     */
    static List<String> splitArgs(String argsStr) {
        List<String> args = new ArrayList<>();
        int depth = 0;
        boolean inString = false;
        int start = 0;

        for (int i = 0; i < argsStr.length(); i++) {
            char c = argsStr.charAt(i);

            if (inString) {
                if (c == '\\') {
                    i++; // skip next character (escaped)
                } else if (c == '"') {
                    inString = false;
                }
            } else {
                if (c == '"') {
                    inString = true;
                } else if (c == '(') {
                    depth++;
                } else if (c == ')') {
                    depth--;
                } else if (c == ',' && depth == 0) {
                    args.add(argsStr.substring(start, i).trim());
                    start = i + 1;
                }
            }
        }

        // Add the last argument
        String last = argsStr.substring(start).trim();
        if (!last.isEmpty()) {
            args.add(last);
        }

        return args;
    }
}
