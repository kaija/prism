package com.prism.dsl.ast;

/**
 * Sealed interface representing a node in the DSL abstract syntax tree.
 *
 * <p>All DSL expressions parse into a tree of {@code DslNode} instances.
 * The three permitted subtypes cover the full DSL grammar:
 * function calls, literals, and field references.</p>
 */
public sealed interface DslNode permits FunctionCallNode, LiteralNode, FieldRefNode {}
