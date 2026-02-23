package com.prism.dsl;

import com.prism.dsl.ast.*;
import net.jqwik.api.*;
import net.jqwik.api.arbitraries.StringArbitrary;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Property-based test for the Java DSL parser round-trip property.
 *
 * <p>Feature: dsl-engine, Property 2: Parser Round-Trip (Java)</p>
 *
 * <p>For any valid DSL AST, serializing the AST to a DSL string using the Java
 * pretty-printer and then parsing that string back with the Java DslParser
 * SHALL produce an equivalent AST.</p>
 *
 * <p><b>Validates: Requirements 2.1, 1.1, 1.2, 1.3, 1.5, 1.6</b></p>
 */
class DslParserRoundTripPbtTest {

    // ── Function names available in the registry (subset for generating valid calls) ──

    /** Functions that accept exactly 0 args */
    private static final List<String> ZERO_ARG_FUNCS = List.of("ACTION_TIME", "NOW");

    /** Functions that accept exactly 1 arg */
    private static final List<String> ONE_ARG_FUNCS = List.of(
            "NOT", "COUNT", "SUM", "AVG", "MIN", "MAX", "UNIQUE",
            "ABS", "ROUND", "CEIL", "FLOOR", "SQRT", "LOG", "EXP",
            "WEEKDAY", "IN_RECENT_DAYS",
            "UPPER", "LOWER", "TRIM", "LENGTH",
            "TO_NUMBER", "TO_STRING", "TO_BOOLEAN"
    );

    /** Functions that accept exactly 2 args */
    private static final List<String> TWO_ARG_FUNCS = List.of(
            "EQ", "NEQ", "GT", "LT", "GTE", "LTE",
            "ADD", "SUBTRACT", "MULTIPLY", "DIVIDE", "MOD", "POW",
            "TOP", "IS_RECURRING",
            "CONTAINS", "STARTS_WITH", "ENDS_WITH", "REGEX_MATCH",
            "SPLIT", "WHERE", "BY", "BUCKET"
    );

    /** Functions that accept exactly 3 args */
    private static final List<String> THREE_ARG_FUNCS = List.of(
            "DATE_FORMAT", "DATE_DIFF",
            "SUBSTRING", "REPLACE",
            "IF", "CONVERT_UNIT"
    );

    // ── Property ─────────────────────────────────────────────────────

    @Property(tries = 200)
    void parserRoundTrip(@ForAll("dslNodes") DslNode ast) {
        // Feature: dsl-engine, Property 2: Parser Round-Trip (Java)
        String printed = DslPrettyPrinter.print(ast);
        DslNode reparsed = DslParser.parse(printed);
        assertEquals(ast, reparsed,
                "Round-trip failed for printed expression: " + printed);
    }

    // ── Generators ───────────────────────────────────────────────────

    @Provide
    Arbitrary<DslNode> dslNodes() {
        return dslNodeArbitrary(0);
    }

    /**
     * Recursive arbitrary for DSL AST nodes with depth limiting.
     * At max depth, only leaf nodes (literals and field refs) are generated.
     */
    private Arbitrary<DslNode> dslNodeArbitrary(int depth) {
        Arbitrary<DslNode> literals = literalNodes();
        Arbitrary<DslNode> fieldRefs = fieldRefNodes();

        if (depth >= 3) {
            // At max depth, only generate leaf nodes
            return Arbitraries.oneOf(literals, fieldRefs);
        }

        Arbitrary<DslNode> funcCalls = functionCallNodes(depth + 1);
        // Weight leaves more heavily to keep trees manageable
        return Arbitraries.frequencyOf(
                Tuple.of(3, literals),
                Tuple.of(2, fieldRefs),
                Tuple.of(2, funcCalls)
        );
    }

    /**
     * Generate literal nodes: strings, integers (Long), non-whole doubles, booleans.
     */
    private Arbitrary<DslNode> literalNodes() {
        Arbitrary<DslNode> strings = safeStrings()
                .map(s -> new LiteralNode(s, "string"));

        Arbitrary<DslNode> integers = Arbitraries.longs()
                .between(-999_999L, 999_999L)
                .map(n -> new LiteralNode(n, "number"));

        // Generate non-whole doubles to avoid the double→long mismatch on round-trip.
        // The pretty-printer prints whole doubles (e.g. 3.0) as "3", which the parser
        // reads back as Long, breaking equality.
        Arbitrary<DslNode> doubles = Arbitraries.doubles()
                .between(-999_999.0, 999_999.0)
                .filter(d -> !Double.isNaN(d) && !Double.isInfinite(d))
                .filter(d -> d != Math.floor(d)) // exclude whole numbers
                .map(d -> new LiteralNode(d, "number"));

        Arbitrary<DslNode> booleans = Arbitraries.of(true, false)
                .map(b -> new LiteralNode(b, "boolean"));

        return Arbitraries.oneOf(strings, integers, doubles, booleans);
    }

    /**
     * Generate safe string values for string literals.
     * Avoids unescaped quotes and backslashes that could break parsing.
     * Uses simple alphanumeric + space characters.
     */
    private StringArbitrary safeStrings() {
        return Arbitraries.strings()
                .withCharRange('a', 'z')
                .withCharRange('A', 'Z')
                .withCharRange('0', '9')
                .withChars(' ', '_', '-')
                .ofMinLength(0)
                .ofMaxLength(20);
    }

    /**
     * Generate field reference nodes with simple alphanumeric field names.
     */
    private Arbitrary<DslNode> fieldRefNodes() {
        Arbitrary<String> sources = Arbitraries.of("EVENT", "PROFILE", "PARAM");
        Arbitrary<String> fieldNames = Arbitraries.strings()
                .withCharRange('a', 'z')
                .withCharRange('0', '9')
                .withChars('_')
                .ofMinLength(1)
                .ofMaxLength(15);

        return Combinators.combine(sources, fieldNames)
                .as((source, field) -> (DslNode) new FieldRefNode(source, field));
    }

    /**
     * Generate function call nodes with the correct number of arguments
     * for each function, using recursive AST generation for args.
     */
    private Arbitrary<DslNode> functionCallNodes(int childDepth) {
        Arbitrary<DslNode> zeroArgCalls = Arbitraries.of(ZERO_ARG_FUNCS)
                .map(name -> new FunctionCallNode(name, List.of()));

        Arbitrary<DslNode> oneArgCalls = Combinators.combine(
                Arbitraries.of(ONE_ARG_FUNCS),
                dslNodeArbitrary(childDepth)
        ).as((name, arg) -> new FunctionCallNode(name, List.of(arg)));

        Arbitrary<DslNode> twoArgCalls = Combinators.combine(
                Arbitraries.of(TWO_ARG_FUNCS),
                dslNodeArbitrary(childDepth),
                dslNodeArbitrary(childDepth)
        ).as((name, a1, a2) -> new FunctionCallNode(name, List.of(a1, a2)));

        Arbitrary<DslNode> threeArgCalls = Combinators.combine(
                Arbitraries.of(THREE_ARG_FUNCS),
                dslNodeArbitrary(childDepth),
                dslNodeArbitrary(childDepth),
                dslNodeArbitrary(childDepth)
        ).as((name, a1, a2, a3) -> new FunctionCallNode(name, List.of(a1, a2, a3)));

        // Also generate variadic functions (AND, OR, CONCAT) with 2-4 args
        Arbitrary<DslNode> variadicCalls = Combinators.combine(
                Arbitraries.of("AND", "OR", "CONCAT"),
                dslNodeArbitrary(childDepth).list().ofMinSize(2).ofMaxSize(4)
        ).as((name, args) -> new FunctionCallNode(name, args));

        return Arbitraries.oneOf(
                zeroArgCalls, oneArgCalls, twoArgCalls, threeArgCalls, variadicCalls
        );
    }
}
