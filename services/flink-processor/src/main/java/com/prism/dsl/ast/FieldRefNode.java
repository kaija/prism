package com.prism.dsl.ast;

/**
 * AST node representing a field reference (data access).
 *
 * @param source the data source: "EVENT", "PROFILE", or "PARAM"
 * @param field  the field name to resolve from the source
 */
public record FieldRefNode(String source, String field) implements DslNode {}
