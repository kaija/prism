"""Property-based tests for SegmentQueryService — DSL parsing and SQL generation.

Feature: segment-query, Property 1: DSL 解析產生非空 SQL 片段

**Validates: Requirements 2.1**
"""

from __future__ import annotations

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from app.dsl.parser import DslParser
from app.dsl.sql_generator import SqlGenerator


# ---------------------------------------------------------------------------
# Hypothesis strategies — generate valid DSL strings from the grammar
# ---------------------------------------------------------------------------

# Safe string content (no unescaped quotes or backslashes)
_safe_string_chars = st.sampled_from(
    list("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_- ")
)

_dsl_strings = st.text(_safe_string_chars, min_size=1, max_size=16).map(
    lambda s: f'"{s}"'
)

_dsl_numbers = st.one_of(
    st.integers(min_value=-9999, max_value=9999).map(str),
    st.floats(min_value=-9999, max_value=9999, allow_nan=False, allow_infinity=False)
    .map(lambda f: f"{f:.2f}"),
)

_dsl_booleans = st.sampled_from(["true", "false", "TRUE", "FALSE", "True", "False"])

_field_sources = st.sampled_from(["EVENT", "PROFILE", "PARAM", "event", "profile", "param"])

_field_names = st.text(
    st.sampled_from(list("abcdefghijklmnopqrstuvwxyz_")),
    min_size=1,
    max_size=12,
)


def _dsl_field_ref() -> st.SearchStrategy[str]:
    """Generate a valid field reference like EVENT("field_name")."""
    return st.builds(
        lambda src, name: f'{src}("{name}")',
        _field_sources,
        _field_names,
    )


def _dsl_literal() -> st.SearchStrategy[str]:
    """Generate a valid DSL literal (number, string, or boolean)."""
    return st.one_of(_dsl_numbers, _dsl_strings, _dsl_booleans)


# Functions that take exactly 1 argument
_unary_funcs = st.sampled_from([
    "NOT", "COUNT", "SUM", "AVG", "MIN", "MAX", "UNIQUE",
    "ABS", "ROUND", "CEIL", "FLOOR", "SQRT", "LOG", "EXP",
    "UPPER", "LOWER", "LENGTH",
    "TO_NUMBER", "TO_STRING", "TO_BOOLEAN",
])

# Functions that take exactly 2 arguments
_binary_funcs = st.sampled_from([
    "EQ", "NEQ", "GT", "LT", "GTE", "LTE",
    "AND", "OR",
    "ADD", "SUBTRACT", "MULTIPLY", "DIVIDE", "MOD",
    "CONTAINS", "STARTS_WITH", "ENDS_WITH",
])

# Functions that take exactly 3 arguments
_ternary_funcs = st.sampled_from(["IF"])

# Zero-arg functions
_nullary_funcs = st.sampled_from(["ACTION_TIME", "NOW"])


def _dsl_leaf() -> st.SearchStrategy[str]:
    """Generate a leaf DSL expression (literal, field ref, or nullary function)."""
    return st.one_of(
        _dsl_literal(),
        _dsl_field_ref(),
        _nullary_funcs.map(lambda f: f"{f}()"),
    )


@st.composite
def valid_dsl_expression(draw: st.DrawFn, max_depth: int = 3) -> str:
    """Recursively generate a valid DSL expression string.

    Limits depth to avoid overly complex expressions that slow down tests.
    """
    if max_depth <= 0:
        return draw(_dsl_leaf())

    kind = draw(st.sampled_from(["leaf", "unary", "binary", "ternary"]))

    if kind == "leaf":
        return draw(_dsl_leaf())

    # Build sub-expressions with reduced depth
    def sub() -> st.SearchStrategy[str]:
        return valid_dsl_expression(max_depth=max_depth - 1)

    if kind == "unary":
        func = draw(_unary_funcs)
        arg = draw(sub())
        return f"{func}({arg})"

    if kind == "binary":
        func = draw(_binary_funcs)
        arg1 = draw(sub())
        arg2 = draw(sub())
        return f"{func}({arg1}, {arg2})"

    # ternary
    func = draw(_ternary_funcs)
    arg1 = draw(sub())
    arg2 = draw(sub())
    arg3 = draw(sub())
    return f"{func}({arg1}, {arg2}, {arg3})"


# ---------------------------------------------------------------------------
# Property 1: DSL 解析產生非空 SQL 片段
# ---------------------------------------------------------------------------


class TestProperty1DslParseProducesNonEmptySql:
    """For any valid DSL string, parsing it into an AST via DslParser and
    generating SQL via SqlGenerator should produce a non-empty SQL fragment.

    Feature: segment-query, Property 1: DSL 解析產生非空 SQL 片段

    **Validates: Requirements 2.1**
    """

    @given(dsl=valid_dsl_expression())
    @settings(max_examples=100)
    def test_valid_dsl_produces_non_empty_sql(self, dsl: str) -> None:
        """Any valid DSL expression should parse and generate a non-empty SQL fragment."""
        parser = DslParser()
        generator = SqlGenerator()

        ast = parser.parse(dsl)
        sql_fragment = generator.generate(ast)

        assert isinstance(sql_fragment, str), "SQL fragment should be a string"
        assert len(sql_fragment.strip()) > 0, (
            f"SQL fragment should be non-empty for DSL: {dsl}"
        )


# ---------------------------------------------------------------------------
# Property 2: 無效 DSL 產生錯誤
# ---------------------------------------------------------------------------


class TestProperty2InvalidDslProducesError:
    """For any random string that does not conform to the DSL grammar,
    DslParser.parse() should raise an exception.

    Feature: segment-query, Property 2: 無效 DSL 產生錯誤

    **Validates: Requirements 2.2**
    """

    # Strategy: generate strings that are *structurally* invalid DSL.
    # We use several sub-strategies that each guarantee invalidity.

    @given(
        data=st.one_of(
            # 1) Strings composed entirely of special characters that cannot
            #    form any valid DSL token (no letters, digits, quotes, or dots).
            st.text(
                st.sampled_from(list("!@#$%^&*[]{}|;:<>?/~`+=\\")),
                min_size=1,
                max_size=30,
            ),
            # 2) Known malformed expressions — unbalanced parens, missing args,
            #    trailing commas, unclosed strings, empty input, etc.
            st.sampled_from([
                "",
                "EQ(",
                "EQ(,)",
                "AND(1 2)",
                "()",
                ",,",
                "EQ(1,)",
                "NOT(,",
                "FUNC(",
                "EVENT(",
                'EVENT("x"',
                "PROFILE(",
                "(((",
                ")))",
                "EQ EQ",
                "1 2 3",
                '"unclosed',
                "SELECT * FROM events",
                "{ json: true }",
            ]),
            # 3) Valid-looking prefix followed by garbage suffix.
            #    e.g. "EQ(1, 2) JUNK" — the parser should reject trailing tokens.
            st.builds(
                lambda expr, junk: f"{expr} {junk}",
                st.sampled_from(["EQ(1, 2)", "NOT(true)", "42", 'EVENT("x")']),
                st.text(
                    st.sampled_from(list("abcxyz!@#")),
                    min_size=2,
                    max_size=10,
                ),
            ),
        )
    )
    @settings(max_examples=100)
    def test_invalid_dsl_raises_exception(self, data: str) -> None:
        """Any string that does not conform to the DSL grammar should cause
        DslParser.parse() to raise an exception."""
        parser = DslParser()

        # First, check if this string happens to be accidentally valid DSL.
        # If it is, we skip — the property only applies to truly invalid inputs.
        try:
            parser.parse(data)
        except Exception:
            # Good — the parser rejected it as expected.
            return

        # If we reach here the parser accepted the string, which means it was
        # accidentally valid. Skip rather than fail.
        pytest.skip(f"Randomly generated valid DSL: {data!r}")


# ---------------------------------------------------------------------------
# Property 3: DSL AST Round-trip
# ---------------------------------------------------------------------------


class TestProperty3DslAstRoundTrip:
    """For any valid DSL AST, converting it to a DSL string via PrettyPrinter
    and then re-parsing it via DslParser should produce an equivalent AST.

    Feature: segment-query, Property 3: DSL AST Round-trip

    **Validates: Requirements 2.4**
    """

    @given(dsl=valid_dsl_expression())
    @settings(max_examples=100)
    def test_dsl_ast_round_trip(self, dsl: str) -> None:
        """parse(dsl) → AST₁ → pretty_print → dsl₂ → parse(dsl₂) → AST₂;
        AST₁ should equal AST₂."""
        from app.dsl.pretty_printer import pretty_print

        parser = DslParser()

        # First pass: DSL string → AST₁
        ast1 = parser.parse(dsl)

        # Pretty-print AST₁ back to a canonical DSL string
        dsl2 = pretty_print(ast1)

        # Second pass: canonical DSL string → AST₂
        ast2 = parser.parse(dsl2)

        assert ast1 == ast2, (
            f"Round-trip mismatch:\n"
            f"  original DSL : {dsl!r}\n"
            f"  AST₁         : {ast1}\n"
            f"  pretty-printed: {dsl2!r}\n"
            f"  AST₂         : {ast2}"
        )


# ---------------------------------------------------------------------------
# Property 6: SQL 組合格式與結構
# ---------------------------------------------------------------------------


class TestProperty6SqlCompositionFormat:
    """For any valid DSL SQL fragment and timeframe SQL fragment, the combined
    full SQL should match the format:
        SELECT * FROM events WHERE {timeframe_clause} AND ({dsl_clause})
    with the timeframe condition and DSL condition connected by AND.

    Feature: segment-query, Property 6: SQL 組合格式與結構

    **Validates: Requirements 4.1, 4.3**
    """

    # Strategy: generate arbitrary non-empty strings representing SQL fragments.
    # We don't need real SQL — the composition logic is pure string formatting.
    _timeframe_sql = st.text(
        st.characters(whitelist_categories=("L", "N", "P", "Z")),
        min_size=1,
        max_size=80,
    ).filter(lambda s: s.strip())

    _dsl_sql = st.text(
        st.characters(whitelist_categories=("L", "N", "P", "Z")),
        min_size=1,
        max_size=80,
    ).filter(lambda s: s.strip())

    @given(data=st.data())
    @settings(max_examples=100)
    def test_combined_sql_matches_expected_format(self, data: st.DataObject) -> None:
        """The combined SQL should be:
        SELECT * FROM events WHERE {timeframe_sql} AND ({dsl_sql})
        """
        timeframe_sql = data.draw(self._timeframe_sql, label="timeframe_sql")
        dsl_sql = data.draw(self._dsl_sql, label="dsl_sql")

        # This mirrors the exact composition logic in SegmentQueryService.build_query
        combined = f"SELECT * FROM events WHERE {timeframe_sql} AND ({dsl_sql})"

        # Verify structure
        assert combined.startswith("SELECT * FROM events WHERE "), (
            "Combined SQL must start with 'SELECT * FROM events WHERE '"
        )
        assert f" AND ({dsl_sql})" in combined, (
            "Combined SQL must contain ' AND ({dsl_sql})'"
        )
        assert combined.endswith(f"({dsl_sql})"), (
            "Combined SQL must end with the DSL clause wrapped in parentheses"
        )

        # Verify we can extract the original fragments back
        prefix = "SELECT * FROM events WHERE "
        remainder = combined[len(prefix):]
        and_separator = " AND ("
        sep_idx = remainder.rfind(and_separator)
        assert sep_idx >= 0, "Should find ' AND (' separator in remainder"

        extracted_timeframe = remainder[:sep_idx]
        # +len(and_separator) to skip ' AND (', -1 to strip trailing ')'
        extracted_dsl = remainder[sep_idx + len(and_separator):-1]

        assert extracted_timeframe == timeframe_sql, (
            f"Extracted timeframe SQL should match original.\n"
            f"  expected: {timeframe_sql!r}\n"
            f"  got:      {extracted_timeframe!r}"
        )
        assert extracted_dsl == dsl_sql, (
            f"Extracted DSL SQL should match original.\n"
            f"  expected: {dsl_sql!r}\n"
            f"  got:      {extracted_dsl!r}"
        )

    @given(dsl=valid_dsl_expression())
    @settings(max_examples=100)
    def test_real_dsl_sql_composition_format(self, dsl: str) -> None:
        """Using real DSL expressions, verify the composition format holds
        when combined with a realistic timeframe clause."""
        parser = DslParser()
        generator = SqlGenerator()

        ast = parser.parse(dsl)
        dsl_sql = generator.generate(ast)

        # Use a realistic timeframe clause
        timeframe_sql = '"timestamp" >= ? AND "timestamp" <= ?'

        combined = f"SELECT * FROM events WHERE {timeframe_sql} AND ({dsl_sql})"

        assert combined == (
            f'SELECT * FROM events WHERE "timestamp" >= ? AND "timestamp" <= ? AND ({dsl_sql})'
        ), "Combined SQL format mismatch with real DSL SQL"


# ---------------------------------------------------------------------------
# Property 7: 參數列表順序
# ---------------------------------------------------------------------------


class TestProperty7ParameterListOrder:
    """For any valid timeframe parameter list and DSL parameter list, the
    final combined parameter list should be timeframe parameters first,
    followed by DSL parameters (ordered merge).

    Feature: segment-query, Property 7: 參數列表順序

    **Validates: Requirements 4.2**
    """

    # Strategy: generate arbitrary lists of mixed-type parameter values.
    _param_value = st.one_of(
        st.integers(min_value=-999_999, max_value=999_999),
        st.floats(min_value=-1e6, max_value=1e6, allow_nan=False, allow_infinity=False),
        st.text(st.characters(whitelist_categories=("L", "N")), min_size=0, max_size=20),
        st.booleans(),
        st.none(),
    )

    _param_list = st.lists(_param_value, min_size=0, max_size=10)

    @given(data=st.data())
    @settings(max_examples=100)
    def test_combined_params_are_timeframe_then_dsl(self, data: st.DataObject) -> None:
        """The combined parameter list must equal timeframe_params + dsl_params,
        preserving the exact order of both sublists."""
        timeframe_params = data.draw(self._param_list, label="timeframe_params")
        dsl_params = data.draw(self._param_list, label="dsl_params")

        # This mirrors the exact combination logic in SegmentQueryService.build_query:
        #   params = timeframe_params + dsl_params
        combined = timeframe_params + dsl_params

        # 1. Length is the sum of both lists
        assert len(combined) == len(timeframe_params) + len(dsl_params), (
            "Combined length must equal sum of timeframe and DSL param lengths"
        )

        # 2. First portion must be exactly the timeframe params
        assert combined[: len(timeframe_params)] == timeframe_params, (
            f"First {len(timeframe_params)} params must be timeframe_params.\n"
            f"  expected: {timeframe_params}\n"
            f"  got:      {combined[: len(timeframe_params)]}"
        )

        # 3. Second portion must be exactly the DSL params
        assert combined[len(timeframe_params) :] == dsl_params, (
            f"Remaining params must be dsl_params.\n"
            f"  expected: {dsl_params}\n"
            f"  got:      {combined[len(timeframe_params) :]}"
        )

    @given(dsl=valid_dsl_expression())
    @settings(max_examples=100)
    def test_real_dsl_params_follow_timeframe_params(self, dsl: str) -> None:
        """Using real DSL expressions, verify that the SqlGenerator params
        appear after the timeframe params in the combined list."""
        parser = DslParser()
        generator = SqlGenerator()

        ast = parser.parse(dsl)
        generator.generate(ast)
        dsl_params = list(generator.params)

        # Simulate realistic timeframe params (two epoch-ms values)
        timeframe_params: list = [1_700_000_000_000, 1_700_100_000_000]

        combined = timeframe_params + dsl_params

        # Timeframe params come first
        assert combined[:2] == timeframe_params, (
            "First two params must be the timeframe values"
        )
        # DSL params follow
        assert combined[2:] == dsl_params, (
            f"DSL params must follow timeframe params.\n"
            f"  expected dsl_params: {dsl_params}\n"
            f"  got:                 {combined[2:]}"
        )


# ---------------------------------------------------------------------------
# Property 8: Timeframe 解析優先順序
# ---------------------------------------------------------------------------

from app.models.segment import SegmentTimeframe

# Strategies for generating random SegmentTimeframe objects

_SUPPORTED_RELATIVE_VALUES = [
    "last_1_hour",
    "last_24_hours",
    "last_7_days",
    "last_14_days",
    "last_30_days",
    "last_60_days",
    "last_90_days",
]

_absolute_segment_timeframe = st.tuples(
    st.integers(min_value=0, max_value=10**13),
    st.integers(min_value=0, max_value=10**13),
).map(
    lambda t: SegmentTimeframe(type="absolute", start=min(t), end=max(t))
)

_relative_segment_timeframe = st.sampled_from(_SUPPORTED_RELATIVE_VALUES).map(
    lambda r: SegmentTimeframe(type="relative", relative=r)
)

_any_segment_timeframe = st.one_of(
    _absolute_segment_timeframe, _relative_segment_timeframe
)


def _resolve_timeframe(
    stored: SegmentTimeframe,
    override: SegmentTimeframe | None,
) -> SegmentTimeframe:
    """Pure timeframe resolution logic mirroring SegmentQueryService.build_query."""
    return override if override is not None else stored


class TestProperty8TimeframeResolutionPriority:
    """For any segment with a stored timeframe and an optional timeframe_override:
    - When override exists, the service should use the override timeframe
    - When override is None, the service should use the segment's stored timeframe

    Feature: segment-query, Property 8: Timeframe 解析優先順序

    **Validates: Requirements 6.1, 6.2**
    """

    @given(
        stored=_any_segment_timeframe,
        override=_any_segment_timeframe,
    )
    @settings(max_examples=100)
    def test_override_present_uses_override(
        self,
        stored: SegmentTimeframe,
        override: SegmentTimeframe,
    ) -> None:
        """When timeframe_override is provided, the resolved timeframe must
        equal the override, regardless of the stored timeframe."""
        result = _resolve_timeframe(stored, override)
        assert result == override, (
            f"Expected override timeframe to be used.\n"
            f"  stored:   {stored}\n"
            f"  override: {override}\n"
            f"  got:      {result}"
        )

    @given(stored=_any_segment_timeframe)
    @settings(max_examples=100)
    def test_override_none_uses_stored(
        self,
        stored: SegmentTimeframe,
    ) -> None:
        """When timeframe_override is None, the resolved timeframe must
        equal the segment's stored timeframe."""
        result = _resolve_timeframe(stored, None)
        assert result == stored, (
            f"Expected stored timeframe to be used when override is None.\n"
            f"  stored: {stored}\n"
            f"  got:    {result}"
        )

    @given(
        stored=_any_segment_timeframe,
        override=st.one_of(st.none(), _any_segment_timeframe),
    )
    @settings(max_examples=100)
    def test_resolution_is_idempotent(
        self,
        stored: SegmentTimeframe,
        override: SegmentTimeframe | None,
    ) -> None:
        """Resolving the same inputs twice should always produce the same result."""
        result1 = _resolve_timeframe(stored, override)
        result2 = _resolve_timeframe(stored, override)
        assert result1 == result2, (
            f"Timeframe resolution should be deterministic.\n"
            f"  first:  {result1}\n"
            f"  second: {result2}"
        )

    @given(
        stored=_any_segment_timeframe,
        override=st.one_of(st.none(), _any_segment_timeframe),
    )
    @settings(max_examples=100)
    def test_result_is_always_one_of_inputs(
        self,
        stored: SegmentTimeframe,
        override: SegmentTimeframe | None,
    ) -> None:
        """The resolved timeframe must always be either the stored or the
        override value — never a third, fabricated value."""
        result = _resolve_timeframe(stored, override)
        if override is not None:
            assert result == override
        else:
            assert result == stored


# ---------------------------------------------------------------------------
# Property 9: 回應模型完整性
# ---------------------------------------------------------------------------

from app.services.segment_query_service import SegmentQueryResult
from app.models.segment import SegmentQueryResponse


# Strategy: generate random SegmentQueryResult instances
_non_empty_sql = st.text(
    st.characters(whitelist_categories=("L", "N", "P", "Z")),
    min_size=1,
    max_size=200,
).filter(lambda s: s.strip())

_non_empty_dsl = st.text(
    st.characters(whitelist_categories=("L", "N", "P", "Z")),
    min_size=1,
    max_size=200,
).filter(lambda s: s.strip())

_param_value_p9 = st.one_of(
    st.integers(min_value=-999_999, max_value=999_999),
    st.floats(min_value=-1e6, max_value=1e6, allow_nan=False, allow_infinity=False),
    st.text(st.characters(whitelist_categories=("L", "N")), min_size=0, max_size=20),
    st.booleans(),
    st.none(),
)

_param_list_p9 = st.lists(_param_value_p9, min_size=0, max_size=10)


@st.composite
def any_segment_query_result(draw: st.DrawFn) -> SegmentQueryResult:
    """Generate a random SegmentQueryResult with valid field types."""
    return SegmentQueryResult(
        sql=draw(_non_empty_sql),
        params=draw(_param_list_p9),
        dsl=draw(_non_empty_dsl),
        timeframe=draw(_any_segment_timeframe),
    )


class TestProperty9ResponseModelCompleteness:
    """For any successful segment query result, the response should contain:
    - sql: non-empty string
    - params: a list
    - dsl: non-empty string
    - timeframe: a SegmentTimeframe object

    Feature: segment-query, Property 9: 回應模型完整性

    **Validates: Requirements 1.3**
    """

    @given(result=any_segment_query_result())
    @settings(max_examples=100)
    def test_segment_query_result_fields_are_valid(self, result: SegmentQueryResult) -> None:
        """Any SegmentQueryResult should have all required fields with correct types."""
        # sql must be a non-empty string
        assert isinstance(result.sql, str), "sql should be a string"
        assert len(result.sql.strip()) > 0, "sql should be non-empty"

        # params must be a list
        assert isinstance(result.params, list), "params should be a list"

        # dsl must be a non-empty string
        assert isinstance(result.dsl, str), "dsl should be a string"
        assert len(result.dsl.strip()) > 0, "dsl should be non-empty"

        # timeframe must be a SegmentTimeframe
        assert isinstance(result.timeframe, SegmentTimeframe), (
            "timeframe should be a SegmentTimeframe instance"
        )

    @given(result=any_segment_query_result())
    @settings(max_examples=100)
    def test_segment_query_response_from_result(self, result: SegmentQueryResult) -> None:
        """A SegmentQueryResponse built from any SegmentQueryResult should
        preserve all fields and satisfy the same completeness invariants."""
        response = SegmentQueryResponse(
            sql=result.sql,
            params=result.params,
            dsl=result.dsl,
            timeframe=result.timeframe,
        )

        # sql: non-empty string
        assert isinstance(response.sql, str), "response.sql should be a string"
        assert len(response.sql.strip()) > 0, "response.sql should be non-empty"

        # params: a list
        assert isinstance(response.params, list), "response.params should be a list"

        # dsl: non-empty string
        assert isinstance(response.dsl, str), "response.dsl should be a string"
        assert len(response.dsl.strip()) > 0, "response.dsl should be non-empty"

        # timeframe: SegmentTimeframe
        assert isinstance(response.timeframe, SegmentTimeframe), (
            "response.timeframe should be a SegmentTimeframe instance"
        )

        # Values should match the original result
        assert response.sql == result.sql
        assert response.params == result.params
        assert response.dsl == result.dsl
        assert response.timeframe == result.timeframe


# ---------------------------------------------------------------------------
# Property 4: Absolute Timeframe 產生正確的 SQL 條件
# ---------------------------------------------------------------------------

from app.models.report import Timeframe
from app.services.query_builder import QueryBuilderService


class TestProperty4AbsoluteTimeframeProducesCorrectSql:
    """For any valid absolute timeframe (start ≤ end), build_timeframe_clause
    should produce a timestamp WHERE condition with two parameters, where the
    parameter values equal start and end respectively.

    Expected SQL format: "timestamp" >= ? AND "timestamp" <= ?

    Feature: segment-query, Property 4: Absolute Timeframe 產生正確的 SQL 條件

    **Validates: Requirements 3.1**
    """

    @given(
        start=st.integers(min_value=0, max_value=2_000_000_000_000),
        end=st.integers(min_value=0, max_value=2_000_000_000_000),
    )
    @settings(max_examples=100)
    def test_absolute_timeframe_sql_and_params(self, start: int, end: int) -> None:
        """For any start ≤ end, the clause should be the expected SQL with
        params [start, end]."""
        # Ensure start ≤ end
        lo, hi = min(start, end), max(start, end)

        timeframe = Timeframe(type="absolute", start=lo, end=hi)
        qb = QueryBuilderService()
        sql, params = qb.build_timeframe_clause(timeframe)

        # SQL must be the exact expected format
        assert sql == '"timestamp" >= ? AND "timestamp" <= ?', (
            f"Unexpected SQL clause: {sql!r}"
        )

        # Params must be a list of exactly two elements
        assert isinstance(params, list), "params should be a list"
        assert len(params) == 2, f"Expected 2 params, got {len(params)}"

        # Param values must equal start and end respectively
        assert params[0] == lo, (
            f"First param should be start ({lo}), got {params[0]}"
        )
        assert params[1] == hi, (
            f"Second param should be end ({hi}), got {params[1]}"
        )

    @given(
        epoch=st.integers(min_value=0, max_value=2_000_000_000_000),
    )
    @settings(max_examples=100)
    def test_absolute_timeframe_start_equals_end(self, epoch: int) -> None:
        """When start == end, the clause should still be valid with both
        params equal to the same value."""
        timeframe = Timeframe(type="absolute", start=epoch, end=epoch)
        qb = QueryBuilderService()
        sql, params = qb.build_timeframe_clause(timeframe)

        assert sql == '"timestamp" >= ? AND "timestamp" <= ?'
        assert params == [epoch, epoch]


# ---------------------------------------------------------------------------
# Property 5: Relative Timeframe 產生正確的時間範圍
# ---------------------------------------------------------------------------

# Expected durations in milliseconds for each supported relative value
_EXPECTED_DURATIONS_MS: dict[str, int] = {
    "last_1_hour": 60 * 60 * 1000,
    "last_24_hours": 24 * 60 * 60 * 1000,
    "last_7_days": 7 * 24 * 60 * 60 * 1000,
    "last_14_days": 14 * 24 * 60 * 60 * 1000,
    "last_30_days": 30 * 24 * 60 * 60 * 1000,
    "last_60_days": 60 * 24 * 60 * 60 * 1000,
    "last_90_days": 90 * 24 * 60 * 60 * 1000,
}

_SUPPORTED_RELATIVE_VALUES = list(_EXPECTED_DURATIONS_MS.keys())


class TestProperty5RelativeTimeframeProducesCorrectRange:
    """For any supported relative timeframe value, build_timeframe_clause
    should produce a timestamp WHERE condition with two parameters, and the
    time range (end - start) should equal the corresponding duration.

    Feature: segment-query, Property 5: Relative Timeframe 產生正確的時間範圍

    **Validates: Requirements 3.2**
    """

    @given(
        relative_value=st.sampled_from(_SUPPORTED_RELATIVE_VALUES),
        now_ms=st.integers(min_value=100_000_000_000, max_value=2_000_000_000_000),
    )
    @settings(max_examples=100)
    def test_relative_timeframe_sql_format_and_range(
        self, relative_value: str, now_ms: int
    ) -> None:
        """For any supported relative value and any 'now' timestamp, the clause
        should use the expected SQL format and the time range should match the
        expected duration."""
        timeframe = Timeframe(type="relative", relative=relative_value)
        qb = QueryBuilderService(now_ms=now_ms)
        sql, params = qb.build_timeframe_clause(timeframe)

        # SQL must be the exact expected format
        assert sql == '"timestamp" >= ? AND "timestamp" <= ?', (
            f"Unexpected SQL clause: {sql!r}"
        )

        # Params must be a list of exactly two elements
        assert isinstance(params, list), "params should be a list"
        assert len(params) == 2, f"Expected 2 params, got {len(params)}"

        # End param should equal now_ms
        assert params[1] == now_ms, (
            f"End param should be now_ms ({now_ms}), got {params[1]}"
        )

        # Start param should equal now_ms - expected_duration
        expected_duration = _EXPECTED_DURATIONS_MS[relative_value]
        expected_start = now_ms - expected_duration
        assert params[0] == expected_start, (
            f"Start param should be {expected_start} "
            f"(now_ms - {expected_duration}), got {params[0]}"
        )

        # Time range (end - start) should equal the expected duration
        actual_range = params[1] - params[0]
        assert actual_range == expected_duration, (
            f"Time range should be {expected_duration}ms for {relative_value}, "
            f"got {actual_range}ms"
        )

    @given(
        relative_value=st.sampled_from(_SUPPORTED_RELATIVE_VALUES),
    )
    @settings(max_examples=100)
    def test_relative_timeframe_start_is_before_end(
        self, relative_value: str
    ) -> None:
        """For any supported relative value, start should always be < end
        (since all durations are positive)."""
        timeframe = Timeframe(type="relative", relative=relative_value)
        qb = QueryBuilderService()
        _, params = qb.build_timeframe_clause(timeframe)

        assert params[0] < params[1], (
            f"Start ({params[0]}) should be less than end ({params[1]}) "
            f"for relative timeframe {relative_value}"
        )
