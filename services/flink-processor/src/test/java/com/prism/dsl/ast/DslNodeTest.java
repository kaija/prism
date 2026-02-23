package com.prism.dsl.ast;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for DSL AST node types.
 */
class DslNodeTest {

    @Test
    void literalNodeStoresStringValue() {
        var node = new LiteralNode("hello", "string");
        assertEquals("hello", node.value());
        assertEquals("string", node.type());
    }

    @Test
    void literalNodeStoresNumericValue() {
        var intNode = new LiteralNode(42L, "number");
        assertEquals(42L, intNode.value());
        assertEquals("number", intNode.type());

        var doubleNode = new LiteralNode(3.14, "number");
        assertEquals(3.14, doubleNode.value());
    }

    @Test
    void literalNodeStoresBooleanValue() {
        var node = new LiteralNode(true, "boolean");
        assertEquals(true, node.value());
        assertEquals("boolean", node.type());
    }

    @Test
    void fieldRefNodeStoresSourceAndField() {
        var event = new FieldRefNode("EVENT", "user_id");
        assertEquals("EVENT", event.source());
        assertEquals("user_id", event.field());

        var profile = new FieldRefNode("PROFILE", "name");
        assertEquals("PROFILE", profile.source());
        assertEquals("name", profile.field());

        var param = new FieldRefNode("PARAM", "threshold");
        assertEquals("PARAM", param.source());
        assertEquals("threshold", param.field());
    }

    @Test
    void functionCallNodeStoresNameAndArgs() {
        var arg1 = new LiteralNode(1L, "number");
        var arg2 = new LiteralNode(2L, "number");
        var node = new FunctionCallNode("ADD", List.of(arg1, arg2));

        assertEquals("ADD", node.name());
        assertEquals(2, node.args().size());
        assertEquals(arg1, node.args().get(0));
        assertEquals(arg2, node.args().get(1));
    }

    @Test
    void functionCallNodeSupportsEmptyArgs() {
        var node = new FunctionCallNode("NOW", List.of());
        assertEquals("NOW", node.name());
        assertTrue(node.args().isEmpty());
    }

    @Test
    void nestedFunctionCallNodes() {
        // DIVIDE(COUNT(UNIQUE(EVENT("action"))), 30)
        var fieldRef = new FieldRefNode("EVENT", "action");
        var unique = new FunctionCallNode("UNIQUE", List.of(fieldRef));
        var count = new FunctionCallNode("COUNT", List.of(unique));
        var literal = new LiteralNode(30L, "number");
        var divide = new FunctionCallNode("DIVIDE", List.of(count, literal));

        assertEquals("DIVIDE", divide.name());
        assertInstanceOf(FunctionCallNode.class, divide.args().get(0));
        assertInstanceOf(LiteralNode.class, divide.args().get(1));

        var countNode = (FunctionCallNode) divide.args().get(0);
        assertEquals("COUNT", countNode.name());
        assertInstanceOf(FunctionCallNode.class, countNode.args().get(0));
    }

    @Test
    void sealedInterfacePermitsOnlyDefinedTypes() {
        // Verify all node types implement DslNode
        DslNode literal = new LiteralNode("test", "string");
        DslNode fieldRef = new FieldRefNode("EVENT", "field");
        DslNode funcCall = new FunctionCallNode("EQ", List.of(literal, fieldRef));

        assertInstanceOf(DslNode.class, literal);
        assertInstanceOf(DslNode.class, fieldRef);
        assertInstanceOf(DslNode.class, funcCall);
    }

    @Test
    void recordEqualityWorks() {
        var a = new LiteralNode("hello", "string");
        var b = new LiteralNode("hello", "string");
        assertEquals(a, b);
        assertEquals(a.hashCode(), b.hashCode());

        var ref1 = new FieldRefNode("EVENT", "x");
        var ref2 = new FieldRefNode("EVENT", "x");
        assertEquals(ref1, ref2);

        var func1 = new FunctionCallNode("ADD", List.of(a, ref1));
        var func2 = new FunctionCallNode("ADD", List.of(b, ref2));
        assertEquals(func1, func2);
    }

    @Test
    void recordInequalityWorks() {
        var a = new LiteralNode("hello", "string");
        var b = new LiteralNode("world", "string");
        assertNotEquals(a, b);

        var ref1 = new FieldRefNode("EVENT", "x");
        var ref2 = new FieldRefNode("PROFILE", "x");
        assertNotEquals(ref1, ref2);
    }

    @Test
    void instanceofChecksWithSealedInterface() {
        DslNode node = new FunctionCallNode("COUNT", List.of(new FieldRefNode("EVENT", "id")));

        assertInstanceOf(FunctionCallNode.class, node);
        if (node instanceof FunctionCallNode f) {
            assertEquals("COUNT", f.name());
        }
    }
}
