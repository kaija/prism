package com.prism.dsl;

import com.prism.dsl.ast.DslNode;
import com.prism.dsl.ast.FieldRefNode;
import com.prism.dsl.ast.FunctionCallNode;
import com.prism.dsl.ast.LiteralNode;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for {@link AviatorCodeGenerator}.
 * Validates: Requirements 2.2, 19.2, 19.3, 19.4
 */
class AviatorCodeGeneratorTest {

    // ── Literals ──────────────────────────────────────────────────────

    @Nested
    class Literals {

        @Test
        void stringLiteral() {
            var node = new LiteralNode("hello", "string");
            assertEquals("'hello'", AviatorCodeGenerator.generate(node));
        }

        @Test
        void stringLiteralWithSingleQuote() {
            var node = new LiteralNode("it's", "string");
            assertEquals("'it\\'s'", AviatorCodeGenerator.generate(node));
        }

        @Test
        void emptyStringLiteral() {
            var node = new LiteralNode("", "string");
            assertEquals("''", AviatorCodeGenerator.generate(node));
        }

        @Test
        void integerLiteral() {
            var node = new LiteralNode(42L, "number");
            assertEquals("42", AviatorCodeGenerator.generate(node));
        }

        @Test
        void doubleLiteral() {
            var node = new LiteralNode(3.14, "number");
            assertEquals("3.14", AviatorCodeGenerator.generate(node));
        }

        @Test
        void negativeLiteral() {
            var node = new LiteralNode(-7L, "number");
            assertEquals("-7", AviatorCodeGenerator.generate(node));
        }

        @Test
        void booleanTrue() {
            var node = new LiteralNode(true, "boolean");
            assertEquals("true", AviatorCodeGenerator.generate(node));
        }

        @Test
        void booleanFalse() {
            var node = new LiteralNode(false, "boolean");
            assertEquals("false", AviatorCodeGenerator.generate(node));
        }

        @Test
        void unknownTypeThrows() {
            var node = new LiteralNode("x", "unknown");
            assertThrows(IllegalArgumentException.class,
                    () -> AviatorCodeGenerator.generate(node));
        }
    }

    // ── Field References ──────────────────────────────────────────────

    @Nested
    class FieldReferences {

        @Test
        void eventField() {
            var node = new FieldRefNode("EVENT", "amount");
            assertEquals("event_props.amount", AviatorCodeGenerator.generate(node));
        }

        @Test
        void profileField() {
            var node = new FieldRefNode("PROFILE", "age");
            assertEquals("profile_props.age", AviatorCodeGenerator.generate(node));
        }

        @Test
        void paramField() {
            var node = new FieldRefNode("PARAM", "threshold");
            assertEquals("params.threshold", AviatorCodeGenerator.generate(node));
        }

        @Test
        void unknownSourceThrows() {
            var node = new FieldRefNode("UNKNOWN", "x");
            assertThrows(IllegalArgumentException.class,
                    () -> AviatorCodeGenerator.generate(node));
        }
    }

    // ── Arithmetic Operators ──────────────────────────────────────────

    @Nested
    class Arithmetic {

        @Test
        void add() {
            var node = fn("ADD", num(1), num(2));
            assertEquals("(1 + 2)", AviatorCodeGenerator.generate(node));
        }

        @Test
        void subtract() {
            var node = fn("SUBTRACT", num(5), num(3));
            assertEquals("(5 - 3)", AviatorCodeGenerator.generate(node));
        }

        @Test
        void multiply() {
            var node = fn("MULTIPLY", num(4), num(6));
            assertEquals("(4 * 6)", AviatorCodeGenerator.generate(node));
        }

        @Test
        void divideUsesCustomFunction() {
            var node = fn("DIVIDE", num(10), num(3));
            assertEquals("dsl_divide(10, 3)", AviatorCodeGenerator.generate(node));
        }

        @Test
        void mod() {
            var node = fn("MOD", num(10), num(3));
            assertEquals("(10 % 3)", AviatorCodeGenerator.generate(node));
        }
    }

    // ── Comparison Operators ──────────────────────────────────────────

    @Nested
    class Comparison {

        @Test
        void eq() {
            var node = fn("EQ", num(1), num(1));
            assertEquals("(1 == 1)", AviatorCodeGenerator.generate(node));
        }

        @Test
        void neq() {
            var node = fn("NEQ", num(1), num(2));
            assertEquals("(1 != 2)", AviatorCodeGenerator.generate(node));
        }

        @Test
        void gt() {
            var node = fn("GT", num(5), num(3));
            assertEquals("(5 > 3)", AviatorCodeGenerator.generate(node));
        }

        @Test
        void lt() {
            var node = fn("LT", num(3), num(5));
            assertEquals("(3 < 5)", AviatorCodeGenerator.generate(node));
        }

        @Test
        void gte() {
            var node = fn("GTE", num(5), num(5));
            assertEquals("(5 >= 5)", AviatorCodeGenerator.generate(node));
        }

        @Test
        void lte() {
            var node = fn("LTE", num(3), num(5));
            assertEquals("(3 <= 5)", AviatorCodeGenerator.generate(node));
        }
    }

    // ── Logical Operators ─────────────────────────────────────────────

    @Nested
    class Logical {

        @Test
        void andTwoArgs() {
            var node = fn("AND", bool(true), bool(false));
            assertEquals("(true && false)", AviatorCodeGenerator.generate(node));
        }

        @Test
        void andVariadic() {
            var node = new FunctionCallNode("AND", List.of(bool(true), bool(false), bool(true)));
            assertEquals("(true && false && true)", AviatorCodeGenerator.generate(node));
        }

        @Test
        void orTwoArgs() {
            var node = fn("OR", bool(false), bool(true));
            assertEquals("(false || true)", AviatorCodeGenerator.generate(node));
        }

        @Test
        void orVariadic() {
            var node = new FunctionCallNode("OR", List.of(bool(false), bool(false), bool(true)));
            assertEquals("(false || false || true)", AviatorCodeGenerator.generate(node));
        }

        @Test
        void not() {
            var node = new FunctionCallNode("NOT", List.of(bool(true)));
            assertEquals("(!true)", AviatorCodeGenerator.generate(node));
        }
    }

    // ── Math Built-ins ────────────────────────────────────────────────

    @Nested
    class MathBuiltins {

        @Test
        void pow() {
            var node = fn("POW", num(2), num(3));
            assertEquals("math.pow(2, 3)", AviatorCodeGenerator.generate(node));
        }

        @Test
        void abs() {
            var node = new FunctionCallNode("ABS", List.of(num(-5)));
            assertEquals("math.abs(-5)", AviatorCodeGenerator.generate(node));
        }

        @Test
        void round() {
            var node = new FunctionCallNode("ROUND", List.of(num(3.7)));
            assertEquals("math.round(3.7)", AviatorCodeGenerator.generate(node));
        }

        @Test
        void ceil() {
            var node = new FunctionCallNode("CEIL", List.of(num(3.2)));
            assertEquals("math.ceil(3.2)", AviatorCodeGenerator.generate(node));
        }

        @Test
        void floor() {
            var node = new FunctionCallNode("FLOOR", List.of(num(3.9)));
            assertEquals("math.floor(3.9)", AviatorCodeGenerator.generate(node));
        }

        @Test
        void sqrt() {
            var node = new FunctionCallNode("SQRT", List.of(num(16)));
            assertEquals("math.sqrt(16)", AviatorCodeGenerator.generate(node));
        }

        @Test
        void log() {
            var node = new FunctionCallNode("LOG", List.of(num(10)));
            assertEquals("math.log(10)", AviatorCodeGenerator.generate(node));
        }

        @Test
        void exp() {
            var node = new FunctionCallNode("EXP", List.of(num(1)));
            assertEquals("dsl_exp(1)", AviatorCodeGenerator.generate(node));
        }
    }

    // ── Conditional ───────────────────────────────────────────────────

    @Nested
    class Conditional {

        @Test
        void ifTernary() {
            var node = new FunctionCallNode("IF", List.of(bool(true), num(1), num(0)));
            assertEquals("((true) ? (1) : (0))", AviatorCodeGenerator.generate(node));
        }

        @Test
        void ifWithNestedExpressions() {
            var cond = fn("GT", new FieldRefNode("EVENT", "amount"), num(100));
            var then = str("high");
            var els = str("low");
            var node = new FunctionCallNode("IF", List.of(cond, then, els));
            assertEquals("(((event_props.amount > 100)) ? ('high') : ('low'))",
                    AviatorCodeGenerator.generate(node));
        }
    }

    // ── Custom dsl_* Functions ────────────────────────────────────────

    @Nested
    class CustomFunctions {

        @Test
        void countMapsToCustom() {
            var node = new FunctionCallNode("COUNT", List.of(new FieldRefNode("EVENT", "id")));
            assertEquals("dsl_count(event_props.id)", AviatorCodeGenerator.generate(node));
        }

        @Test
        void uniqueMapsToCustom() {
            var node = new FunctionCallNode("UNIQUE", List.of(new FieldRefNode("EVENT", "user")));
            assertEquals("dsl_unique(event_props.user)", AviatorCodeGenerator.generate(node));
        }

        @Test
        void containsMapsToCustom() {
            var node = fn("CONTAINS", str("hello world"), str("world"));
            assertEquals("dsl_contains('hello world', 'world')", AviatorCodeGenerator.generate(node));
        }

        @Test
        void upperMapsToCustom() {
            var node = new FunctionCallNode("UPPER", List.of(str("hello")));
            assertEquals("dsl_upper('hello')", AviatorCodeGenerator.generate(node));
        }

        @Test
        void dateFormatMapsToCustom() {
            var node = fn("DATE_FORMAT", num(1000), str("yyyy-MM-dd"));
            assertEquals("dsl_date_format(1000, 'yyyy-MM-dd')", AviatorCodeGenerator.generate(node));
        }

        @Test
        void toNumberMapsToCustom() {
            var node = new FunctionCallNode("TO_NUMBER", List.of(str("42")));
            assertEquals("dsl_to_number('42')", AviatorCodeGenerator.generate(node));
        }

        @Test
        void bucketMapsToCustom() {
            var node = fn("BUCKET", num(50), num(100));
            assertEquals("dsl_bucket(50, 100)", AviatorCodeGenerator.generate(node));
        }
    }

    // ── Nested / Complex Expressions ──────────────────────────────────

    @Nested
    class ComplexExpressions {

        @Test
        void nestedArithmetic() {
            // ADD(MULTIPLY(2, 3), 4) → ((2 * 3) + 4)
            var inner = fn("MULTIPLY", num(2), num(3));
            var outer = fn("ADD", inner, num(4));
            assertEquals("((2 * 3) + 4)", AviatorCodeGenerator.generate(outer));
        }

        @Test
        void comparisonWithFieldRefs() {
            // GT(EVENT("amount"), PARAM("threshold"))
            var left = new FieldRefNode("EVENT", "amount");
            var right = new FieldRefNode("PARAM", "threshold");
            var node = fn("GT", left, right);
            assertEquals("(event_props.amount > params.threshold)",
                    AviatorCodeGenerator.generate(node));
        }

        @Test
        void logicalWithComparisons() {
            // AND(GT(EVENT("age"), 18), LT(EVENT("age"), 65))
            var gt = fn("GT", new FieldRefNode("EVENT", "age"), num(18));
            var lt = fn("LT", new FieldRefNode("EVENT", "age"), num(65));
            var node = fn("AND", gt, lt);
            assertEquals("((event_props.age > 18) && (event_props.age < 65))",
                    AviatorCodeGenerator.generate(node));
        }

        @Test
        void divideCountByLiteral() {
            // DIVIDE(COUNT(UNIQUE(EVENT("user_id"))), 30)
            var field = new FieldRefNode("EVENT", "user_id");
            var unique = new FunctionCallNode("UNIQUE", List.of(field));
            var count = new FunctionCallNode("COUNT", List.of(unique));
            var node = fn("DIVIDE", count, num(30));
            assertEquals("dsl_divide(dsl_count(dsl_unique(event_props.user_id)), 30)",
                    AviatorCodeGenerator.generate(node));
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private static LiteralNode num(long v) {
        return new LiteralNode(v, "number");
    }

    private static LiteralNode num(double v) {
        return new LiteralNode(v, "number");
    }

    private static LiteralNode str(String v) {
        return new LiteralNode(v, "string");
    }

    private static LiteralNode bool(boolean v) {
        return new LiteralNode(v, "boolean");
    }

    private static FunctionCallNode fn(String name, DslNode a, DslNode b) {
        return new FunctionCallNode(name, List.of(a, b));
    }
}
