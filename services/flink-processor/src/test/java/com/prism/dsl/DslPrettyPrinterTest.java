package com.prism.dsl;

import com.prism.dsl.ast.*;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for the Java DSL pretty-printer.
 */
class DslPrettyPrinterTest {

    // ── String literals ──────────────────────────────────────────────

    @Nested
    class StringLiterals {

        @Test
        void printsSimpleString() {
            DslNode node = new LiteralNode("hello", "string");
            assertEquals("\"hello\"", DslPrettyPrinter.print(node));
        }

        @Test
        void printsEmptyString() {
            DslNode node = new LiteralNode("", "string");
            assertEquals("\"\"", DslPrettyPrinter.print(node));
        }

        @Test
        void escapesEmbeddedQuotes() {
            DslNode node = new LiteralNode("say \"hi\"", "string");
            assertEquals("\"say \\\"hi\\\"\"", DslPrettyPrinter.print(node));
        }
    }

    // ── Number literals ──────────────────────────────────────────────

    @Nested
    class NumberLiterals {

        @Test
        void printsInteger() {
            DslNode node = new LiteralNode(42L, "number");
            assertEquals("42", DslPrettyPrinter.print(node));
        }

        @Test
        void printsNegativeInteger() {
            DslNode node = new LiteralNode(-7L, "number");
            assertEquals("-7", DslPrettyPrinter.print(node));
        }

        @Test
        void printsZero() {
            DslNode node = new LiteralNode(0L, "number");
            assertEquals("0", DslPrettyPrinter.print(node));
        }

        @Test
        void printsDoubleWithDecimal() {
            DslNode node = new LiteralNode(3.14, "number");
            assertEquals("3.14", DslPrettyPrinter.print(node));
        }

        @Test
        void printsWholeDoubleAsInteger() {
            // 3.0 should print as "3", not "3.0"
            DslNode node = new LiteralNode(3.0, "number");
            assertEquals("3", DslPrettyPrinter.print(node));
        }

        @Test
        void printsNegativeDouble() {
            DslNode node = new LiteralNode(-2.5, "number");
            assertEquals("-2.5", DslPrettyPrinter.print(node));
        }

        @Test
        void printsNegativeWholeDoubleAsInteger() {
            DslNode node = new LiteralNode(-5.0, "number");
            assertEquals("-5", DslPrettyPrinter.print(node));
        }
    }

    // ── Boolean literals ─────────────────────────────────────────────

    @Nested
    class BooleanLiterals {

        @Test
        void printsTrue() {
            DslNode node = new LiteralNode(true, "boolean");
            assertEquals("true", DslPrettyPrinter.print(node));
        }

        @Test
        void printsFalse() {
            DslNode node = new LiteralNode(false, "boolean");
            assertEquals("false", DslPrettyPrinter.print(node));
        }
    }

    // ── Field references ─────────────────────────────────────────────

    @Nested
    class FieldReferences {

        @Test
        void printsEventFieldRef() {
            DslNode node = new FieldRefNode("EVENT", "user_id");
            assertEquals("EVENT(\"user_id\")", DslPrettyPrinter.print(node));
        }

        @Test
        void printsProfileFieldRef() {
            DslNode node = new FieldRefNode("PROFILE", "age");
            assertEquals("PROFILE(\"age\")", DslPrettyPrinter.print(node));
        }

        @Test
        void printsParamFieldRef() {
            DslNode node = new FieldRefNode("PARAM", "threshold");
            assertEquals("PARAM(\"threshold\")", DslPrettyPrinter.print(node));
        }

        @Test
        void escapesQuotesInFieldName() {
            DslNode node = new FieldRefNode("EVENT", "field\"name");
            assertEquals("EVENT(\"field\\\"name\")", DslPrettyPrinter.print(node));
        }
    }

    // ── Function calls ───────────────────────────────────────────────

    @Nested
    class FunctionCalls {

        @Test
        void printsNoArgFunction() {
            DslNode node = new FunctionCallNode("NOW", List.of());
            assertEquals("NOW()", DslPrettyPrinter.print(node));
        }

        @Test
        void printsSingleArgFunction() {
            DslNode node = new FunctionCallNode("ABS", List.of(
                    new LiteralNode(-5L, "number")
            ));
            assertEquals("ABS(-5)", DslPrettyPrinter.print(node));
        }

        @Test
        void printsMultiArgFunction() {
            DslNode node = new FunctionCallNode("ADD", List.of(
                    new LiteralNode(1L, "number"),
                    new LiteralNode(2L, "number")
            ));
            assertEquals("ADD(1, 2)", DslPrettyPrinter.print(node));
        }

        @Test
        void printsNestedFunctionCalls() {
            DslNode node = new FunctionCallNode("DIVIDE", List.of(
                    new FunctionCallNode("COUNT", List.of(
                            new FieldRefNode("EVENT", "user_id")
                    )),
                    new LiteralNode(30L, "number")
            ));
            assertEquals("DIVIDE(COUNT(EVENT(\"user_id\")), 30)", DslPrettyPrinter.print(node));
        }

        @Test
        void printsVariadicFunction() {
            DslNode node = new FunctionCallNode("AND", List.of(
                    new LiteralNode(true, "boolean"),
                    new LiteralNode(false, "boolean"),
                    new LiteralNode(true, "boolean")
            ));
            assertEquals("AND(true, false, true)", DslPrettyPrinter.print(node));
        }
    }

    // ── Round-trip with parser ───────────────────────────────────────

    @Nested
    class RoundTrip {

        @Test
        void roundTripsSimpleExpression() {
            String expr = "ADD(1, 2)";
            DslNode ast = DslParser.parse(expr);
            assertEquals(expr, DslPrettyPrinter.print(ast));
        }

        @Test
        void roundTripsNestedExpression() {
            String expr = "DIVIDE(COUNT(EVENT(\"user_id\")), 30)";
            DslNode ast = DslParser.parse(expr);
            assertEquals(expr, DslPrettyPrinter.print(ast));
        }

        @Test
        void roundTripsStringLiteral() {
            String expr = "\"hello world\"";
            DslNode ast = DslParser.parse(expr);
            assertEquals(expr, DslPrettyPrinter.print(ast));
        }

        @Test
        void roundTripsBooleanLiteral() {
            DslNode ast = DslParser.parse("true");
            assertEquals("true", DslPrettyPrinter.print(ast));
        }

        @Test
        void roundTripsComplexExpression() {
            String expr = "AND(EQ(EVENT(\"event_name\"), \"action\"), IN_RECENT_DAYS(30))";
            DslNode ast = DslParser.parse(expr);
            assertEquals(expr, DslPrettyPrinter.print(ast));
        }
    }

    // ── Error handling ───────────────────────────────────────────────

    @Nested
    class ErrorHandling {

        @Test
        void throwsOnUnknownLiteralType() {
            DslNode node = new LiteralNode("x", "unknown");
            assertThrows(IllegalArgumentException.class, () -> DslPrettyPrinter.print(node));
        }
    }
}
