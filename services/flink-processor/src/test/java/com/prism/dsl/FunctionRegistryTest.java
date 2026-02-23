package com.prism.dsl;

import com.prism.dsl.FunctionRegistry.FunctionSignature;
import com.prism.dsl.FunctionRegistry.ValidationResult;
import com.prism.dsl.ast.DslNode;
import com.prism.dsl.ast.FieldRefNode;
import com.prism.dsl.ast.FunctionCallNode;
import com.prism.dsl.ast.LiteralNode;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for the Java DSL Function Registry.
 * Mirrors the Python test_function_registry.py to ensure parity.
 */
class FunctionRegistryTest {

    @Test
    void registryIsNonEmpty() {
        assertFalse(FunctionRegistry.getRegistry().isEmpty());
    }

    @Test
    void registryHasAtLeast50Functions() {
        assertTrue(FunctionRegistry.getRegistry().size() >= 50,
                "Expected at least 50 functions, got " + FunctionRegistry.getRegistry().size());
    }

    @Test
    void allKeysMatchSignatureNames() {
        for (var entry : FunctionRegistry.getRegistry().entrySet()) {
            assertEquals(entry.getKey(), entry.getValue().name());
        }
    }

    @Test
    void logicalFunctionsPresent() {
        for (String name : List.of("AND", "OR", "NOT")) {
            assertNotNull(FunctionRegistry.lookup(name), name + " should be in registry");
        }
    }

    @Test
    void comparisonFunctionsPresent() {
        for (String name : List.of("EQ", "NEQ", "GT", "LT", "GTE", "LTE")) {
            assertNotNull(FunctionRegistry.lookup(name), name + " should be in registry");
        }
    }

    @Test
    void aggregationFunctionsPresent() {
        for (String name : List.of("COUNT", "SUM", "AVG", "MIN", "MAX", "UNIQUE", "TOP")) {
            assertNotNull(FunctionRegistry.lookup(name), name + " should be in registry");
        }
    }

    @Test
    void mathFunctionsPresent() {
        for (String name : List.of("ADD", "SUBTRACT", "MULTIPLY", "DIVIDE", "MOD", "POW",
                "ABS", "ROUND", "CEIL", "FLOOR", "SQRT", "LOG", "EXP")) {
            assertNotNull(FunctionRegistry.lookup(name), name + " should be in registry");
        }
    }

    @Test
    void dateTimeFunctionsPresent() {
        for (String name : List.of("ACTION_TIME", "NOW", "DATE_FORMAT", "DATE_DIFF",
                "WEEKDAY", "IN_RECENT_DAYS", "IS_RECURRING")) {
            assertNotNull(FunctionRegistry.lookup(name), name + " should be in registry");
        }
    }

    @Test
    void dataAccessFunctionsPresent() {
        for (String name : List.of("EVENT", "PROFILE", "PARAM")) {
            assertNotNull(FunctionRegistry.lookup(name), name + " should be in registry");
        }
    }

    @Test
    void stringFunctionsPresent() {
        for (String name : List.of("CONTAINS", "STARTS_WITH", "ENDS_WITH", "REGEX_MATCH",
                "UPPER", "LOWER", "TRIM", "SUBSTRING", "REPLACE", "CONCAT", "SPLIT", "LENGTH")) {
            assertNotNull(FunctionRegistry.lookup(name), name + " should be in registry");
        }
    }

    @Test
    void filteringFunctionsPresent() {
        for (String name : List.of("IF", "WHERE", "BY")) {
            assertNotNull(FunctionRegistry.lookup(name), name + " should be in registry");
        }
    }

    @Test
    void conversionFunctionsPresent() {
        for (String name : List.of("TO_NUMBER", "TO_STRING", "TO_BOOLEAN", "CONVERT_UNIT")) {
            assertNotNull(FunctionRegistry.lookup(name), name + " should be in registry");
        }
    }

    @Test
    void segmentationFunctionsPresent() {
        assertNotNull(FunctionRegistry.lookup("BUCKET"));
    }

    @Test
    void variadicFunctionsHaveNullMaxArgs() {
        for (String name : List.of("AND", "OR", "CONCAT")) {
            FunctionSignature sig = FunctionRegistry.lookup(name);
            assertNotNull(sig);
            assertNull(sig.maxArgs(), name + " should be variadic (maxArgs=null)");
        }
    }

    @Test
    void zeroArgFunctions() {
        for (String name : List.of("ACTION_TIME", "NOW")) {
            FunctionSignature sig = FunctionRegistry.lookup(name);
            assertNotNull(sig);
            assertEquals(0, sig.minArgs());
            assertEquals(0, sig.maxArgs());
            assertTrue(sig.argTypes().isEmpty());
        }
    }

    @Test
    void returnTypesAreValid() {
        Set<String> validTypes = Set.of("number", "string", "boolean", "array", "any");
        for (FunctionSignature sig : FunctionRegistry.getRegistry().values()) {
            assertTrue(validTypes.contains(sig.returnType()),
                    sig.name() + " has invalid return type: " + sig.returnType());
        }
    }

    @Test
    void argTypesAreValid() {
        Set<String> validTypes = Set.of("number", "string", "boolean", "array", "any");
        for (FunctionSignature sig : FunctionRegistry.getRegistry().values()) {
            for (String t : sig.argTypes()) {
                assertTrue(validTypes.contains(t),
                        sig.name() + " has invalid arg type: " + t);
            }
        }
    }

    @Test
    void lookupIsCaseInsensitive() {
        assertNotNull(FunctionRegistry.lookup("add"));
        assertNotNull(FunctionRegistry.lookup("Add"));
        assertNotNull(FunctionRegistry.lookup("ADD"));
        assertEquals(FunctionRegistry.lookup("add"), FunctionRegistry.lookup("ADD"));
    }

    @Test
    void lookupReturnsNullForUnknown() {
        assertNull(FunctionRegistry.lookup("NONEXISTENT"));
        assertNull(FunctionRegistry.lookup(null));
    }

    @Test
    void signatureMatchesPythonForAdd() {
        FunctionSignature sig = FunctionRegistry.lookup("ADD");
        assertNotNull(sig);
        assertEquals("ADD", sig.name());
        assertEquals(2, sig.minArgs());
        assertEquals(2, sig.maxArgs());
        assertEquals(List.of("number", "number"), sig.argTypes());
        assertEquals("number", sig.returnType());
    }

    @Test
    void signatureMatchesPythonForDateDiff() {
        FunctionSignature sig = FunctionRegistry.lookup("DATE_DIFF");
        assertNotNull(sig);
        assertEquals(3, sig.minArgs());
        assertEquals(3, sig.maxArgs());
        assertEquals(List.of("string", "number", "number"), sig.argTypes());
        assertEquals("number", sig.returnType());
    }

    @Test
    void signatureMatchesPythonForIf() {
        FunctionSignature sig = FunctionRegistry.lookup("IF");
        assertNotNull(sig);
        assertEquals(3, sig.minArgs());
        assertEquals(3, sig.maxArgs());
        assertEquals(List.of("boolean", "any", "any"), sig.argTypes());
        assertEquals("any", sig.returnType());
    }

    @Test
    void registryIsUnmodifiable() {
        Map<String, FunctionSignature> reg = FunctionRegistry.getRegistry();
        assertThrows(UnsupportedOperationException.class, () -> reg.put("FAKE", null));
    }

    @Test
    void argTypesListIsUnmodifiable() {
        FunctionSignature sig = FunctionRegistry.lookup("ADD");
        assertNotNull(sig);
        assertThrows(UnsupportedOperationException.class, () -> sig.argTypes().add("string"));
    }

    @Test
    void registrySizeMatchesPython() {
        // Python registry has exactly 59 entries
        assertEquals(59, FunctionRegistry.getRegistry().size(),
                "Java registry should have the same number of functions as Python");
    }


    // ── Validation tests ──────────────────────────────────────────────

    @Test
    void validateLiteralNode() {
        ValidationResult r = FunctionRegistry.validate(new LiteralNode(42, "number"));
        assertTrue(r.valid());
        assertTrue(r.errors().isEmpty());
        assertEquals("number", r.returnType());
    }

    @Test
    void validateFieldRefNode() {
        ValidationResult r = FunctionRegistry.validate(new FieldRefNode("EVENT", "clicks"));
        assertTrue(r.valid());
        assertTrue(r.errors().isEmpty());
        assertEquals("any", r.returnType());
    }

    @Test
    void validateValidFunctionCall() {
        // ADD(1, 2)
        DslNode ast = new FunctionCallNode("ADD", List.of(
                new LiteralNode(1, "number"),
                new LiteralNode(2, "number")));
        ValidationResult r = FunctionRegistry.validate(ast);
        assertTrue(r.valid());
        assertTrue(r.errors().isEmpty());
        assertEquals("number", r.returnType());
    }

    @Test
    void validateUnknownFunction() {
        DslNode ast = new FunctionCallNode("FOOBAR", List.of(
                new LiteralNode(1, "number")));
        ValidationResult r = FunctionRegistry.validate(ast);
        assertFalse(r.valid());
        assertEquals(1, r.errors().size());
        assertTrue(r.errors().get(0).contains("Unknown function: FOOBAR"));
        assertNull(r.returnType());
    }

    @Test
    void validateTooFewArguments() {
        // ADD() — needs at least 2
        DslNode ast = new FunctionCallNode("ADD", List.of());
        ValidationResult r = FunctionRegistry.validate(ast);
        assertFalse(r.valid());
        assertTrue(r.errors().stream().anyMatch(e -> e.contains("at least 2")));
    }

    @Test
    void validateTooManyArguments() {
        // NOT(true, false) — accepts at most 1
        DslNode ast = new FunctionCallNode("NOT", List.of(
                new LiteralNode(true, "boolean"),
                new LiteralNode(false, "boolean")));
        ValidationResult r = FunctionRegistry.validate(ast);
        assertFalse(r.valid());
        assertTrue(r.errors().stream().anyMatch(e -> e.contains("at most 1")));
    }

    @Test
    void validateVariadicAcceptsMany() {
        // AND(true, true, true) — variadic, no max
        DslNode ast = new FunctionCallNode("AND", List.of(
                new LiteralNode(true, "boolean"),
                new LiteralNode(true, "boolean"),
                new LiteralNode(true, "boolean")));
        ValidationResult r = FunctionRegistry.validate(ast);
        assertTrue(r.valid());
        assertEquals("boolean", r.returnType());
    }

    @Test
    void validateNestedExpression() {
        // ADD(MULTIPLY(2, 3), ABS(-1))
        DslNode ast = new FunctionCallNode("ADD", List.of(
                new FunctionCallNode("MULTIPLY", List.of(
                        new LiteralNode(2, "number"),
                        new LiteralNode(3, "number"))),
                new FunctionCallNode("ABS", List.of(
                        new LiteralNode(-1, "number")))));
        ValidationResult r = FunctionRegistry.validate(ast);
        assertTrue(r.valid());
        assertEquals("number", r.returnType());
    }

    @Test
    void validateNestedWithError() {
        // ADD(FOOBAR(1), 2) — nested unknown function
        DslNode ast = new FunctionCallNode("ADD", List.of(
                new FunctionCallNode("FOOBAR", List.of(
                        new LiteralNode(1, "number"))),
                new LiteralNode(2, "number")));
        ValidationResult r = FunctionRegistry.validate(ast);
        assertFalse(r.valid());
        assertTrue(r.errors().stream().anyMatch(e -> e.contains("Unknown function: FOOBAR")));
    }

    @Test
    void validateTypeMismatch() {
        // ADD("hello", 2) — first arg should be number, got string
        DslNode ast = new FunctionCallNode("ADD", List.of(
                new LiteralNode("hello", "string"),
                new LiteralNode(2, "number")));
        ValidationResult r = FunctionRegistry.validate(ast);
        assertFalse(r.valid());
        assertTrue(r.errors().stream().anyMatch(e -> e.contains("expected number, got string")));
    }

    @Test
    void validateAnyTypeIsCompatible() {
        // EQ(EVENT("x"), 42) — EQ accepts (any, any), EVENT returns any
        DslNode ast = new FunctionCallNode("EQ", List.of(
                new FieldRefNode("EVENT", "x"),
                new LiteralNode(42, "number")));
        ValidationResult r = FunctionRegistry.validate(ast);
        assertTrue(r.valid());
        assertEquals("boolean", r.returnType());
    }

    @Test
    void validateZeroArgFunction() {
        // NOW()
        DslNode ast = new FunctionCallNode("NOW", List.of());
        ValidationResult r = FunctionRegistry.validate(ast);
        assertTrue(r.valid());
        assertEquals("number", r.returnType());
    }

    @Test
    void validateZeroArgFunctionWithExtraArgs() {
        // NOW(1) — accepts 0 args
        DslNode ast = new FunctionCallNode("NOW", List.of(
                new LiteralNode(1, "number")));
        ValidationResult r = FunctionRegistry.validate(ast);
        assertFalse(r.valid());
        assertTrue(r.errors().stream().anyMatch(e -> e.contains("at most 0")));
    }

    @Test
    void validateCollectsMultipleErrors() {
        // ADD(FOOBAR(1), BAZQUX(2)) — two nested unknown functions
        DslNode ast = new FunctionCallNode("ADD", List.of(
                new FunctionCallNode("FOOBAR", List.of(new LiteralNode(1, "number"))),
                new FunctionCallNode("BAZQUX", List.of(new LiteralNode(2, "number")))));
        ValidationResult r = FunctionRegistry.validate(ast);
        assertFalse(r.valid());
        assertEquals(2, r.errors().size());
    }

    @Test
    void validateResultErrorsAreUnmodifiable() {
        ValidationResult r = FunctionRegistry.validate(new LiteralNode(1, "number"));
        assertThrows(UnsupportedOperationException.class, () -> r.errors().add("oops"));
    }

}
