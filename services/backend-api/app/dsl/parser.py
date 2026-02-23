"""DSL parser using Lark LALR(1) grammar with transformer-based AST construction."""

from lark import Lark, Transformer

from app.dsl.ast_nodes import DslNode, FieldRef, FunctionCall, Literal

DSL_GRAMMAR = r"""
start: expression

expression: function_call
          | literal
          | field_ref

function_call: FUNC_NAME "(" [arg_list] ")"
arg_list: expression ("," expression)*

field_ref: FIELD_SOURCE "(" STRING ")"
FIELD_SOURCE.2: "EVENT"i | "PROFILE"i | "PARAM"i

literal: NUMBER       -> number_literal
       | STRING       -> string_literal
       | BOOLEAN      -> boolean_literal

FUNC_NAME: /[A-Z_][A-Z0-9_]*/i
NUMBER: /[-]?[0-9]+(\.[0-9]+)?/
STRING: /\"([^\"\\]|\\.)*\"/
BOOLEAN.2: "true"i | "false"i

%ignore /\s+/
"""


class DslTransformer(Transformer):
    """Transforms Lark parse tree into DSL AST nodes."""

    def start(self, args):
        return args[0]

    def expression(self, args):
        return args[0]

    def function_call(self, args):
        name = str(args[0]).upper()
        func_args = args[1] if len(args) > 1 and args[1] is not None else []
        return FunctionCall(
            name=name,
            args=tuple(func_args) if isinstance(func_args, list) else (func_args,),
        )

    def arg_list(self, args):
        return list(args)

    def field_ref(self, args):
        source = str(args[0]).upper()
        raw = str(args[1])
        field = raw[1:-1].replace('\\"', '"')
        return FieldRef(source=source, field=field)

    def number_literal(self, args):
        val = float(args[0]) if "." in str(args[0]) else int(args[0])
        return Literal(value=val, type="number")

    def string_literal(self, args):
        raw = str(args[0])
        val = raw[1:-1].replace('\\"', '"')
        return Literal(value=val, type="string")

    def boolean_literal(self, args):
        return Literal(value=str(args[0]).lower() == "true", type="boolean")


class DslParser:
    """Parses DSL expression strings into AST nodes using Lark LALR(1)."""

    def __init__(self):
        self._parser = Lark(DSL_GRAMMAR, parser="lalr", transformer=DslTransformer())

    def parse(self, expression: str) -> DslNode:
        """Parse a DSL expression string into an AST."""
        return self._parser.parse(expression)
