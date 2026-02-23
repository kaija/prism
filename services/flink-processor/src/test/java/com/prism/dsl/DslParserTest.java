package com.prism.dsl;

import com.prism.dsl.ast.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Nested;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for the Java DSL parser.
 */
class DslParserTest {

    // ── String literals ──────────────────────────────────────────────

    @Nested
    class StringLiterals {

        @Test
        void parsesSimpleString() {
            DslNode node = DslParser.parse("\"hello\"");
            assertEquals(new LiteralNode("hello", "string"), node);
        }

        @Test
        void parsesEmptyString() {
            DslNode node = DslParser.parse("\"\"");
            assertEquals(new LiteralNode("", "string"), node);
        }

        @Test
        void parsesStringWithEscapedQuote() {
            DslNode node = DslParser.parse("\"say \\\"hi\\\"\"");
            assertEquals(new LiteralNode("say \"hi\"", "string"), node);
        }

        @Test
        void parsesStringWithWhitespace() {
            DslNode node = DslParser.parse("  \"spaced\"  ");
            assertEquals(new LiteralNode("spaced", "string"), node);
        }
    }

    // ── Number literals ──────────────────────────────────────────────

    @Nested
    class NumberLiterals {

        @Test
        void parsesInteger() {
            DslNode node = DslParser.parse("42");
            assertEquals(new LiteralNode(42L, "number"), node);
        }

        @Test
        void parsesNegativeInteger() {
            DslNode node = DslParser.parse("-7");
            assertEquals(new LiteralNode(-7L, "number"), node);
        }

        @Test
        void parsesZero() {
            DslNode node = DslParser.parse("0");
            assertEquals(new LiteralNode(0L, "number"), node);
        }

        @Test
        void parsesDecimal() {
            DslNode node = DslParser.parse("3.14");
            assertEquals(new LiteralNode(3.14, "number"), node);
        }

        @Test
        void parsesNegativeDecimal() {
            DslNode node = DslParser.parse("-0.5");
            assertEquals(new LiteralNode(-0.5, "number"), node);
        }
    }

    // ── Boolean literals ─────────────────────────────────────────────

    @Nested
    class BooleanLiterals {

        @Test
        void parsesTrue() {
            DslNode node = DslParser.parse("true");
            assertEquals(new LiteralNode(true, "boolean"), node);
        }

        @Test
        void parsesFalse() {
            DslNode node = DslParser.parse("false");
            assertEquals(new LiteralNode(false, "boolean"), node);
        }

        @Test
        void parsesCaseInsensitiveBoolean() {
            assertEquals(new LiteralNode(true, "boolean"), DslParser.parse("TRUE"));
            assertEquals(new LiteralNode(true, "boolean"), DslParser.parse("True"));
            assertEquals(new LiteralNode(false, "boolean"), DslParser.parse("FALSE"));
            assertEquals(new LiteralNode(false, "boolean"), DslParser.parse("False"));
        }
    }

    // ── Field references ─────────────────────────────────────────────

    @Nested
    class FieldReferences {

        @Test
        void parsesEventFieldRef() {
            DslNode node = DslParser.parse("EVENT(\"user_id\")");
            assertEquals(new FieldRefNode("EVENT", "user_id"), node);
        }

        @Test
        void parsesProfileFieldRef() {
            DslNode node = DslParser.parse("PROFILE(\"name\")");
            assertEquals(new FieldRefNode("PROFILE", "name"), node);
        }

        @Test
        void parsesParamFieldRef() {
            DslNode node = DslParser.parse("PARAM(\"threshold\")");
            assertEquals(new FieldRefNode("PARAM", "threshold"), node);
        }

        @Test
        void fieldRefIsCaseInsensitive() {
            assertEquals(new FieldRefNode("EVENT", "x"), DslParser.parse("event(\"x\")"));
            assertEquals(new FieldRefNode("PROFILE", "x"), DslParser.parse("profile(\"x\")"));
            assertEquals(new FieldRefNode("PARAM", "x"), DslParser.parse("param(\"x\")"));
        }

        @Test
        void fieldRefWithNonStringArgBecomesFunction() {
            // EVENT(42) is not a field ref — it's a function call
            DslNode node = DslParser.parse("EVENT(42)");
            assertInstanceOf(FunctionCallNode.class, node);
            FunctionCallNode func = (FunctionCallNode) node;
            assertEquals("EVENT", func.name());
            assertEquals(1, func.args().size());
            assertEquals(new LiteralNode(42L, "number"), func.args().get(0));
        }
    }

    // ── Function calls ───────────────────────────────────────────────

    @Nested
    class FunctionCalls {

        @Test
        void parsesZeroArgFunction() {
            DslNode node = DslParser.parse("NOW()");
            assertEquals(new FunctionCallNode("NOW", List.of()), node);
        }

        @Test
        void parsesSingleArgFunction() {
            DslNode node = DslParser.parse("ABS(42)");
            assertEquals(new FunctionCallNode("ABS", List.of(
                    new LiteralNode(42L, "number")
            )), node);
        }

        @Test
        void parsesTwoArgFunction() {
            DslNode node = DslParser.parse("ADD(1, 2)");
            assertEquals(new FunctionCallNode("ADD", List.of(
                    new LiteralNode(1L, "number"),
                    new LiteralNode(2L, "number")
            )), node);
        }

        @Test
        void normalizesNameToUppercase() {
            DslNode node = DslParser.parse("add(1, 2)");
            assertInstanceOf(FunctionCallNode.class, node);
            assertEquals("ADD", ((FunctionCallNode) node).name());
        }

        @Test
        void parsesNestedFunctionCalls() {
            // ADD(1, MULTIPLY(2, 3))
            DslNode node = DslParser.parse("ADD(1, MULTIPLY(2, 3))");
            FunctionCallNode add = (FunctionCallNode) node;
            assertEquals("ADD", add.name());
            assertEquals(2, add.args().size());
            assertEquals(new LiteralNode(1L, "number"), add.args().get(0));

            FunctionCallNode mul = (FunctionCallNode) add.args().get(1);
            assertEquals("MULTIPLY", mul.name());
            assertEquals(List.of(
                    new LiteralNode(2L, "number"),
                    new LiteralNode(3L, "number")
            ), mul.args());
        }

        @Test
        void parsesDeeplyNestedExpression() {
            // DIVIDE(COUNT(UNIQUE(EVENT("action"))), 30)
            DslNode node = DslParser.parse("DIVIDE(COUNT(UNIQUE(EVENT(\"action\"))), 30)");
            FunctionCallNode divide = (FunctionCallNode) node;
            assertEquals("DIVIDE", divide.name());
            assertEquals(2, divide.args().size());

            FunctionCallNode count = (FunctionCallNode) divide.args().get(0);
            assertEquals("COUNT", count.name());

            FunctionCallNode unique = (FunctionCallNode) count.args().get(0);
            assertEquals("UNIQUE", unique.name());

            assertEquals(new FieldRefNode("EVENT", "action"), unique.args().get(0));
            assertEquals(new LiteralNode(30L, "number"), divide.args().get(1));
        }

        @Test
        void parsesVariadicFunction() {
            DslNode node = DslParser.parse("CONCAT(\"a\", \"b\", \"c\")");
            FunctionCallNode concat = (FunctionCallNode) node;
            assertEquals("CONCAT", concat.name());
            assertEquals(3, concat.args().size());
        }
    }

    // ── splitArgs ────────────────────────────────────────────────────

    @Nested
    class SplitArgs {

        @Test
        void splitsSimpleArgs() {
            List<String> result = DslParser.splitArgs("1, 2, 3");
            assertEquals(List.of("1", "2", "3"), result);
        }

        @Test
        void respectsNestedParens() {
            List<String> result = DslParser.splitArgs("1, MULTIPLY(2, 3)");
            assertEquals(List.of("1", "MULTIPLY(2, 3)"), result);
        }

        @Test
        void respectsQuotedStringsWithCommas() {
            List<String> result = DslParser.splitArgs("\"hello, world\", \"foo\"");
            assertEquals(List.of("\"hello, world\"", "\"foo\""), result);
        }

        @Test
        void handlesEscapedQuotesInStrings() {
            List<String> result = DslParser.splitArgs("\"say \\\"hi\\\"\", 42");
            assertEquals(List.of("\"say \\\"hi\\\"\"", "42"), result);
        }

        @Test
        void handlesDeeplyNestedParens() {
            List<String> result = DslParser.splitArgs("A(B(C(1, 2), 3), 4), 5");
            assertEquals(List.of("A(B(C(1, 2), 3), 4)", "5"), result);
        }

        @Test
        void handlesSingleArg() {
            List<String> result = DslParser.splitArgs("42");
            assertEquals(List.of("42"), result);
        }

        @Test
        void handlesEmptyString() {
            List<String> result = DslParser.splitArgs("");
            assertTrue(result.isEmpty());
        }
    }

    // ── Error handling ───────────────────────────────────────────────

    @Nested
    class ErrorHandling {

        @Test
        void throwsOnNull() {
            assertThrows(DslParseException.class, () -> DslParser.parse(null));
        }

        @Test
        void throwsOnEmptyString() {
            assertThrows(DslParseException.class, () -> DslParser.parse(""));
        }

        @Test
        void throwsOnBlankString() {
            assertThrows(DslParseException.class, () -> DslParser.parse("   "));
        }

        @Test
        void throwsOnInvalidExpression() {
            assertThrows(DslParseException.class, () -> DslParser.parse("not_a_valid_expr!"));
        }

        @Test
        void throwsOnUnmatchedParens() {
            assertThrows(DslParseException.class, () -> DslParser.parse("ADD(1, 2"));
        }
    }

    // ── Complex / integration-style ──────────────────────────────────

    @Nested
    class ComplexExpressions {

        @Test
        void parsesComplexBooleanExpression() {
            // AND(EQ(EVENT("event_name"), "action"), IN_RECENT_DAYS(30))
            DslNode node = DslParser.parse(
                    "AND(EQ(EVENT(\"event_name\"), \"action\"), IN_RECENT_DAYS(30))");
            FunctionCallNode and = (FunctionCallNode) node;
            assertEquals("AND", and.name());
            assertEquals(2, and.args().size());

            FunctionCallNode eq = (FunctionCallNode) and.args().get(0);
            assertEquals("EQ", eq.name());
            assertEquals(new FieldRefNode("EVENT", "event_name"), eq.args().get(0));
            assertEquals(new LiteralNode("action", "string"), eq.args().get(1));

            FunctionCallNode inRecent = (FunctionCallNode) and.args().get(1);
            assertEquals("IN_RECENT_DAYS", inRecent.name());
            assertEquals(new LiteralNode(30L, "number"), inRecent.args().get(0));
        }

        @Test
        void parsesStringWithCommaInsideFunction() {
            // CONCAT("hello, world", "foo")
            DslNode node = DslParser.parse("CONCAT(\"hello, world\", \"foo\")");
            FunctionCallNode concat = (FunctionCallNode) node;
            assertEquals("CONCAT", concat.name());
            assertEquals(2, concat.args().size());
            assertEquals(new LiteralNode("hello, world", "string"), concat.args().get(0));
            assertEquals(new LiteralNode("foo", "string"), concat.args().get(1));
        }

        @Test
        void parsesMixedCaseFunctionNames() {
            DslNode lower = DslParser.parse("add(1, 2)");
            DslNode upper = DslParser.parse("ADD(1, 2)");
            DslNode mixed = DslParser.parse("Add(1, 2)");
            assertEquals(lower, upper);
            assertEquals(upper, mixed);
        }

        @Test
        void parsesIfExpression() {
            DslNode node = DslParser.parse("IF(GT(EVENT(\"age\"), 18), \"adult\", \"minor\")");
            FunctionCallNode ifNode = (FunctionCallNode) node;
            assertEquals("IF", ifNode.name());
            assertEquals(3, ifNode.args().size());
        }
    }
}
