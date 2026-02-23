from app.dsl.ast_nodes import DslNode, FunctionCall, Literal, FieldRef


class TestLiteral:
    def test_number_int(self):
        node = Literal(value=42, type="number")
        assert node.value == 42
        assert node.type == "number"

    def test_number_float(self):
        node = Literal(value=3.14, type="number")
        assert node.value == 3.14
        assert node.type == "number"

    def test_string(self):
        node = Literal(value="hello", type="string")
        assert node.value == "hello"
        assert node.type == "string"

    def test_boolean(self):
        node = Literal(value=True, type="boolean")
        assert node.value is True
        assert node.type == "boolean"

    def test_frozen(self):
        node = Literal(value=1, type="number")
        try:
            node.value = 2  # type: ignore
            assert False, "Should have raised FrozenInstanceError"
        except AttributeError:
            pass

    def test_equality(self):
        a = Literal(value=42, type="number")
        b = Literal(value=42, type="number")
        assert a == b

    def test_inequality(self):
        a = Literal(value=42, type="number")
        b = Literal(value=43, type="number")
        assert a != b


class TestFieldRef:
    def test_event_ref(self):
        node = FieldRef(source="EVENT", field="user_id")
        assert node.source == "EVENT"
        assert node.field == "user_id"

    def test_profile_ref(self):
        node = FieldRef(source="PROFILE", field="age")
        assert node.source == "PROFILE"
        assert node.field == "age"

    def test_param_ref(self):
        node = FieldRef(source="PARAM", field="threshold")
        assert node.source == "PARAM"
        assert node.field == "threshold"

    def test_frozen(self):
        node = FieldRef(source="EVENT", field="x")
        try:
            node.source = "PROFILE"  # type: ignore
            assert False, "Should have raised FrozenInstanceError"
        except AttributeError:
            pass

    def test_equality(self):
        a = FieldRef(source="EVENT", field="x")
        b = FieldRef(source="EVENT", field="x")
        assert a == b


class TestFunctionCall:
    def test_simple_call(self):
        arg = Literal(value=1, type="number")
        node = FunctionCall(name="ABS", args=(arg,))
        assert node.name == "ABS"
        assert node.args == (arg,)

    def test_no_args(self):
        node = FunctionCall(name="NOW", args=())
        assert node.name == "NOW"
        assert node.args == ()

    def test_nested_call(self):
        inner = FunctionCall(
            name="EVENT",
            args=(Literal(value="clicks", type="string"),),
        )
        outer = FunctionCall(name="COUNT", args=(inner,))
        assert outer.args[0] == inner

    def test_frozen(self):
        node = FunctionCall(name="ABS", args=())
        try:
            node.name = "ROUND"  # type: ignore
            assert False, "Should have raised FrozenInstanceError"
        except AttributeError:
            pass

    def test_equality(self):
        a = FunctionCall(name="ABS", args=(Literal(value=1, type="number"),))
        b = FunctionCall(name="ABS", args=(Literal(value=1, type="number"),))
        assert a == b

    def test_deeply_nested(self):
        """Verify arbitrary nesting depth works (Requirement 1.6)."""
        leaf = Literal(value=1, type="number")
        node = leaf
        for _ in range(10):
            node = FunctionCall(name="ABS", args=(node,))
        # Unwrap and verify the leaf is still there
        current = node
        for _ in range(10):
            assert isinstance(current, FunctionCall)
            current = current.args[0]
        assert current == leaf


class TestDslNodeUnion:
    def test_function_call_is_dsl_node(self):
        node: DslNode = FunctionCall(name="NOW", args=())
        assert isinstance(node, FunctionCall)

    def test_literal_is_dsl_node(self):
        node: DslNode = Literal(value=1, type="number")
        assert isinstance(node, Literal)

    def test_field_ref_is_dsl_node(self):
        node: DslNode = FieldRef(source="EVENT", field="x")
        assert isinstance(node, FieldRef)
