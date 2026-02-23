package com.prism.dsl.ast;

/**
 * AST node representing a literal value.
 *
 * @param value the literal value (String, Long, Double, or Boolean)
 * @param type  the type identifier: "string", "number", or "boolean"
 */
public record LiteralNode(Object value, String type) implements DslNode {}
