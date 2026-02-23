package com.prism.dsl.ast;

import java.util.List;

/**
 * AST node representing a function call expression.
 *
 * @param name the function name, normalized to uppercase
 * @param args the list of argument expressions
 */
public record FunctionCallNode(String name, List<DslNode> args) implements DslNode {}
