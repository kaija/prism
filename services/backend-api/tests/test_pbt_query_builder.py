"""Property-based tests for QueryBuilderService.

# Feature: backend-api, Property 7: Aggregation SQL Mapping
"""

from hypothesis import given, settings, strategies as st

from app.models.report import (
    Aggregation,
    EventSelection,
    ReportRequest,
    Timeframe,
)
from app.services.query_builder import QueryBuilderService

# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

# Valid SQL identifier: starts with letter/underscore, then alphanumeric/underscore
valid_attribute = st.from_regex(r"[a-z][a-z0-9_]{0,19}", fullmatch=True)

# Aggregation functions that require an attribute
ATTR_REQUIRED_FUNCS = ["sum", "count_unique", "min", "max", "mean", "average", "tops"]

# Aggregation functions that don't require an attribute (or it's optional)
NO_ATTR_FUNCS = ["count", "last_event", "first_event"]

ALL_FUNCS = ATTR_REQUIRED_FUNCS + NO_ATTR_FUNCS

# Strategy: aggregation with attribute (for functions that need one)
agg_with_attr = st.tuples(
    st.sampled_from(ATTR_REQUIRED_FUNCS),
    valid_attribute,
).map(lambda t: Aggregation(function=t[0], attribute=t[1]))

# Strategy: aggregation without attribute requirement
agg_no_attr = st.sampled_from(NO_ATTR_FUNCS).map(
    lambda f: Aggregation(function=f, attribute=None)
)

# Strategy: count can also have an attribute (it's ignored but valid)
agg_count_with_attr = valid_attribute.map(
    lambda a: Aggregation(function="count", attribute=a)
)

# Combined strategy for any valid aggregation
any_aggregation = st.one_of(agg_with_attr, agg_no_attr, agg_count_with_attr)

# Mapping from aggregation function to expected SQL keyword in SELECT expression
SELECT_KEYWORD_MAP = {
    "count": "COUNT",
    "sum": "SUM",
    "count_unique": "COUNT(DISTINCT",
    "min": "MIN",
    "max": "MAX",
    "mean": "AVG",
    "average": "AVG",
    "tops": "COUNT(*) AS count",
    "last_event": "*",
    "first_event": "*",
}

# Mapping for full-query level SQL constructs (ORDER BY / LIMIT)
QUERY_KEYWORD_MAP = {
    "tops": "ORDER BY count DESC",
    "last_event": "ORDER BY",
    "first_event": "ORDER BY",
}

QUERY_DIRECTION_MAP = {
    "last_event": "DESC LIMIT 1",
    "first_event": "ASC LIMIT 1",
}


def _make_report_request(aggregation: Aggregation) -> ReportRequest:
    """Build a minimal ReportRequest wrapping the given aggregation."""
    return ReportRequest(
        report_type="trend",
        timeframe=Timeframe(type="absolute", start=1000, end=2000),
        event_selection=EventSelection(type="all"),
        aggregation=aggregation,
    )


# ---------------------------------------------------------------------------
# Property 7: Aggregation SQL Mapping
# **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6**
# ---------------------------------------------------------------------------


class TestAggregationSQLMapping:
    """Property 7: For any aggregation function and valid attribute,
    the generated SQL should contain the corresponding SQL construct."""

    @given(aggregation=any_aggregation)
    @settings(max_examples=100)
    def test_select_expression_contains_expected_keyword(
        self, aggregation: Aggregation
    ):
        """The SELECT expression from build_aggregation_select must contain
        the expected SQL keyword for the given aggregation function.

        **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6**
        """
        qb = QueryBuilderService()
        select_expr = qb.build_aggregation_select(aggregation)
        expected = SELECT_KEYWORD_MAP[aggregation.function]
        assert expected in select_expr, (
            f"Expected '{expected}' in SELECT expression for "
            f"function={aggregation.function!r}, got: {select_expr!r}"
        )

    @given(aggregation=agg_with_attr)
    @settings(max_examples=100)
    def test_attribute_requiring_functions_include_attribute(
        self, aggregation: Aggregation
    ):
        """For functions that require an attribute, the SELECT expression
        must reference that attribute.

        **Validates: Requirements 6.2, 6.3, 6.5, 6.6**
        """
        qb = QueryBuilderService()
        select_expr = qb.build_aggregation_select(aggregation)
        assert aggregation.attribute in select_expr, (
            f"Expected attribute '{aggregation.attribute}' in SELECT "
            f"expression for function={aggregation.function!r}, got: {select_expr!r}"
        )

    @given(aggregation=any_aggregation)
    @settings(max_examples=100)
    def test_full_query_contains_expected_sql_construct(
        self, aggregation: Aggregation
    ):
        """The full SQL query from build_query must contain the expected
        SQL constructs for tops, last_event, and first_event (ORDER BY, LIMIT).

        **Validates: Requirements 6.4, 6.6**
        """
        qb = QueryBuilderService()
        request = _make_report_request(aggregation)
        sql, _params = qb.build_query(request)
        func = aggregation.function

        # Every function's SELECT keyword should appear in the full query
        select_kw = SELECT_KEYWORD_MAP[func]
        assert select_kw in sql, (
            f"Expected '{select_kw}' in full SQL for "
            f"function={func!r}, got: {sql!r}"
        )

        # Check ORDER BY / LIMIT constructs for special functions
        if func in QUERY_KEYWORD_MAP:
            assert QUERY_KEYWORD_MAP[func] in sql, (
                f"Expected '{QUERY_KEYWORD_MAP[func]}' in full SQL for "
                f"function={func!r}, got: {sql!r}"
            )

        if func in QUERY_DIRECTION_MAP:
            assert QUERY_DIRECTION_MAP[func] in sql, (
                f"Expected '{QUERY_DIRECTION_MAP[func]}' in full SQL for "
                f"function={func!r}, got: {sql!r}"
            )

    @given(
        func=st.sampled_from(ATTR_REQUIRED_FUNCS),
    )
    @settings(max_examples=50)
    def test_attribute_required_functions_reject_none(self, func: str):
        """Functions that require an attribute must raise ValueError
        when attribute is None.

        **Validates: Requirements 6.2, 6.3, 6.5, 6.6**
        """
        qb = QueryBuilderService()
        agg = Aggregation(function=func, attribute=None)
        try:
            qb.build_aggregation_select(agg)
            assert False, f"{func} should have raised ValueError with no attribute"
        except ValueError:
            pass  # expected


# ---------------------------------------------------------------------------
# Feature: backend-api, Property 8: Condition Filter SQL Generation
# ---------------------------------------------------------------------------

from app.models.report import ConditionFilter, ConditionGroup

# All supported operators
STRING_OPS = ["is", "is_not", "contains", "not_contains",
              "starts_with", "not_starts_with", "ends_with", "not_ends_with"]
NUMERIC_OPS = ["equals", "not_equals", "greater_than", "less_than"]
BOOLEAN_OPS = ["true", "false"]
ALL_OPS = STRING_OPS + NUMERIC_OPS + BOOLEAN_OPS

# Expected SQL operator fragment for each condition operator
OPERATOR_SQL_MAP = {
    "is": "= ?",
    "is_not": "!= ?",
    "contains": "LIKE ?",
    "not_contains": "NOT LIKE ?",
    "starts_with": "LIKE ?",
    "not_starts_with": "NOT LIKE ?",
    "ends_with": "LIKE ?",
    "not_ends_with": "NOT LIKE ?",
    "equals": "= ?",
    "not_equals": "!= ?",
    "greater_than": "> ?",
    "less_than": "< ?",
    "true": "= TRUE",
    "false": "= FALSE",
}

# Strategy: generate a value appropriate for the operator
def _value_for_operator(op):
    """Return a hypothesis strategy producing a value suitable for *op*."""
    if op in BOOLEAN_OPS:
        return st.just(None)
    if op in NUMERIC_OPS:
        return st.one_of(st.integers(min_value=-10000, max_value=10000),
                         st.floats(min_value=-1e4, max_value=1e4,
                                   allow_nan=False, allow_infinity=False))
    # String operators
    return st.text(min_size=1, max_size=20,
                   alphabet=st.characters(whitelist_categories=("L", "N")))


# Strategy: single ConditionFilter with a random valid operator
condition_filter_strategy = st.sampled_from(ALL_OPS).flatmap(
    lambda op: st.tuples(
        st.just(op),
        valid_attribute,
        _value_for_operator(op),
    )
).map(lambda t: ConditionFilter(attribute=t[1], operator=t[0], value=t[2]))

# Strategy: a leaf-level ConditionGroup containing 1-4 filters
leaf_condition_group = st.tuples(
    st.sampled_from(["and", "or"]),
    st.lists(condition_filter_strategy, min_size=1, max_size=4),
).map(lambda t: ConditionGroup(logic=t[0], conditions=t[1]))

# Recursive strategy: nested ConditionGroups up to depth 3
def _nested_condition_group():
    return st.recursive(
        leaf_condition_group,
        lambda children: st.tuples(
            st.sampled_from(["and", "or"]),
            st.lists(
                st.one_of(condition_filter_strategy, children),
                min_size=1, max_size=4,
            ),
        ).map(lambda t: ConditionGroup(logic=t[0], conditions=t[1])),
        max_leaves=10,
    )

nested_condition_group = _nested_condition_group()


class TestConditionFilterSQLGeneration:
    """Property 8: For any condition filter with a supported operator and value,
    the generated SQL should contain the correct SQL operator. For nested AND/OR
    condition groups, the generated SQL should produce correctly parenthesized
    expressions where AND groups join with AND and OR groups join with OR."""

    # --- Sub-property 1: single conditions produce the correct SQL operator ---

    @given(condition=condition_filter_strategy)
    @settings(max_examples=100)
    def test_single_condition_produces_correct_sql_operator(
        self, condition: ConditionFilter
    ):
        """A single ConditionFilter must produce SQL containing the expected
        operator fragment (=, !=, LIKE, NOT LIKE, >, <, TRUE, FALSE).

        **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
        """
        qb = QueryBuilderService()
        sql, params = qb._build_single_condition(condition)
        expected_fragment = OPERATOR_SQL_MAP[condition.operator]
        assert expected_fragment in sql, (
            f"Expected '{expected_fragment}' in SQL for operator "
            f"'{condition.operator}', got: {sql!r}"
        )

    @given(condition=condition_filter_strategy)
    @settings(max_examples=100)
    def test_single_condition_attribute_appears_quoted(
        self, condition: ConditionFilter
    ):
        """The attribute name must appear double-quoted in the SQL output.

        **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
        """
        qb = QueryBuilderService()
        sql, _params = qb._build_single_condition(condition)
        quoted = f'"{condition.attribute}"'
        assert quoted in sql, (
            f"Expected quoted attribute {quoted} in SQL, got: {sql!r}"
        )

    @given(
        op=st.sampled_from(BOOLEAN_OPS),
        attr=valid_attribute,
    )
    @settings(max_examples=100)
    def test_boolean_operators_produce_no_params(self, op: str, attr: str):
        """Boolean operators (true/false) should produce SQL with no parameters.

        **Validates: Requirements 9.3**
        """
        qb = QueryBuilderService()
        cond = ConditionFilter(attribute=attr, operator=op, value=None)
        sql, params = qb._build_single_condition(cond)
        assert params == [], (
            f"Boolean operator '{op}' should produce no params, got: {params}"
        )
        expected = OPERATOR_SQL_MAP[op]
        assert expected in sql

    # --- Sub-property 2: AND groups join with " AND " ---

    @given(group=leaf_condition_group.filter(lambda g: g.logic == "and" and len(g.conditions) >= 2))
    @settings(max_examples=100)
    def test_and_group_joins_with_and(self, group: ConditionGroup):
        """An AND condition group with multiple conditions must join them
        with ' AND '.

        **Validates: Requirements 9.5**
        """
        qb = QueryBuilderService()
        sql, _params = qb.build_condition_clause(group)
        assert " AND " in sql, (
            f"Expected ' AND ' in SQL for AND group, got: {sql!r}"
        )
        # Should NOT contain ' OR ' at the top level (no nested groups here)
        assert " OR " not in sql, (
            f"Unexpected ' OR ' in SQL for AND-only group, got: {sql!r}"
        )

    # --- Sub-property 3: OR groups join with " OR " ---

    @given(group=leaf_condition_group.filter(lambda g: g.logic == "or" and len(g.conditions) >= 2))
    @settings(max_examples=100)
    def test_or_group_joins_with_or(self, group: ConditionGroup):
        """An OR condition group with multiple conditions must join them
        with ' OR '.

        **Validates: Requirements 9.6**
        """
        qb = QueryBuilderService()
        sql, _params = qb.build_condition_clause(group)
        assert " OR " in sql, (
            f"Expected ' OR ' in SQL for OR group, got: {sql!r}"
        )
        assert " AND " not in sql, (
            f"Unexpected ' AND ' in SQL for OR-only group, got: {sql!r}"
        )

    # --- Sub-property 4: nested groups are wrapped in parentheses ---

    @given(group=nested_condition_group)
    @settings(max_examples=100)
    def test_nested_groups_produce_parenthesized_sql(
        self, group: ConditionGroup
    ):
        """For any nested condition group, sub-groups must be wrapped in
        parentheses in the generated SQL.

        **Validates: Requirements 9.7**
        """
        qb = QueryBuilderService()
        sql, _params = qb.build_condition_clause(group)

        # Count how many sub-groups exist (ConditionGroup children)
        nested_count = sum(
            1 for c in group.conditions if isinstance(c, ConditionGroup)
        )
        # Each nested sub-group should introduce a pair of parentheses
        assert sql.count("(") >= nested_count, (
            f"Expected at least {nested_count} '(' for nested groups, "
            f"got {sql.count('(')} in: {sql!r}"
        )
        assert sql.count(")") >= nested_count, (
            f"Expected at least {nested_count} ')' for nested groups, "
            f"got {sql.count(')')} in: {sql!r}"
        )

    @given(group=nested_condition_group)
    @settings(max_examples=100)
    def test_balanced_parentheses(self, group: ConditionGroup):
        """The generated SQL must have balanced parentheses.

        **Validates: Requirements 9.7**
        """
        qb = QueryBuilderService()
        sql, _params = qb.build_condition_clause(group)
        assert sql.count("(") == sql.count(")"), (
            f"Unbalanced parentheses in SQL: {sql!r}"
        )

    @given(group=nested_condition_group)
    @settings(max_examples=100)
    def test_params_count_matches_non_boolean_conditions(
        self, group: ConditionGroup
    ):
        """The number of parameters should equal the number of non-boolean
        condition filters in the tree (boolean ops produce no params).

        **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
        """
        qb = QueryBuilderService()
        _sql, params = qb.build_condition_clause(group)

        def _count_non_bool(g: ConditionGroup) -> int:
            total = 0
            for c in g.conditions:
                if isinstance(c, ConditionGroup):
                    total += _count_non_bool(c)
                elif c.operator not in BOOLEAN_OPS:
                    total += 1
            return total

        expected = _count_non_bool(group)
        assert len(params) == expected, (
            f"Expected {expected} params, got {len(params)}"
        )


# ---------------------------------------------------------------------------
# Feature: backend-api, Property 9: Timeframe Resolution
# ---------------------------------------------------------------------------

SUPPORTED_RELATIVE_TIMEFRAMES = [
    "last_1_hour",
    "last_24_hours",
    "last_7_days",
    "last_14_days",
    "last_30_days",
    "last_60_days",
    "last_90_days",
]

# Strategy: absolute timeframe where start <= end (positive epoch ms)
absolute_timeframe = st.tuples(
    st.integers(min_value=0, max_value=10**13),
    st.integers(min_value=0, max_value=10**13),
).map(
    lambda t: Timeframe(type="absolute", start=min(t), end=max(t))
)

# Strategy: relative timeframe from supported strings
relative_timeframe = st.sampled_from(SUPPORTED_RELATIVE_TIMEFRAMES).map(
    lambda r: Timeframe(type="relative", relative=r)
)

# Fixed "now" for deterministic relative resolution
FIXED_NOW_MS = 1_700_000_000_000  # a reasonable epoch ms value


class TestTimeframeResolution:
    """Property 9: For any valid absolute timeframe (start <= end), the generated
    SQL WHERE clause should contain timestamp comparisons bounding the range.
    For any valid relative timeframe string, the resolver should produce absolute
    timestamps where start < end.

    **Validates: Requirements 7.1, 7.2**
    """

    # --- Absolute timeframe tests ---

    @given(tf=absolute_timeframe)
    @settings(max_examples=100)
    def test_absolute_sql_contains_timestamp_bounds(self, tf: Timeframe):
        """For any absolute timeframe with start <= end, the SQL clause must
        contain '"timestamp" >= ? AND "timestamp" <= ?' with two parameters.

        **Validates: Requirements 7.1**
        """
        qb = QueryBuilderService()
        sql, params = qb.build_timeframe_clause(tf)
        assert '"timestamp" >= ?' in sql, (
            f"Expected '\"timestamp\" >= ?' in SQL, got: {sql!r}"
        )
        assert '"timestamp" <= ?' in sql, (
            f"Expected '\"timestamp\" <= ?' in SQL, got: {sql!r}"
        )
        assert len(params) == 2, (
            f"Expected 2 params, got {len(params)}"
        )

    @given(tf=absolute_timeframe)
    @settings(max_examples=100)
    def test_absolute_params_preserve_ordering(self, tf: Timeframe):
        """For any absolute timeframe, params[0] <= params[1] (start <= end).

        **Validates: Requirements 7.1**
        """
        qb = QueryBuilderService()
        _sql, params = qb.build_timeframe_clause(tf)
        assert params[0] <= params[1], (
            f"Expected params[0] <= params[1], got {params[0]} > {params[1]}"
        )

    @given(tf=absolute_timeframe)
    @settings(max_examples=100)
    def test_absolute_params_match_input(self, tf: Timeframe):
        """For any absolute timeframe, the params should exactly match the
        input start and end values.

        **Validates: Requirements 7.1**
        """
        qb = QueryBuilderService()
        _sql, params = qb.build_timeframe_clause(tf)
        assert params[0] == tf.start, (
            f"Expected params[0] == {tf.start}, got {params[0]}"
        )
        assert params[1] == tf.end, (
            f"Expected params[1] == {tf.end}, got {params[1]}"
        )

    # --- Relative timeframe tests ---

    @given(tf=relative_timeframe)
    @settings(max_examples=100)
    def test_relative_sql_contains_timestamp_bounds(self, tf: Timeframe):
        """For any relative timeframe, the SQL clause must contain
        '"timestamp" >= ? AND "timestamp" <= ?' with two parameters.

        **Validates: Requirements 7.2**
        """
        qb = QueryBuilderService(now_ms=FIXED_NOW_MS)
        sql, params = qb.build_timeframe_clause(tf)
        assert '"timestamp" >= ?' in sql, (
            f"Expected '\"timestamp\" >= ?' in SQL, got: {sql!r}"
        )
        assert '"timestamp" <= ?' in sql, (
            f"Expected '\"timestamp\" <= ?' in SQL, got: {sql!r}"
        )
        assert len(params) == 2, (
            f"Expected 2 params, got {len(params)}"
        )

    @given(tf=relative_timeframe)
    @settings(max_examples=100)
    def test_relative_params_have_strict_ordering(self, tf: Timeframe):
        """For any relative timeframe, params[0] < params[1] (start < end)
        because the duration is always positive.

        **Validates: Requirements 7.2**
        """
        qb = QueryBuilderService(now_ms=FIXED_NOW_MS)
        _sql, params = qb.build_timeframe_clause(tf)
        assert params[0] < params[1], (
            f"Expected params[0] < params[1], got {params[0]} >= {params[1]}"
        )

    @given(tf=relative_timeframe)
    @settings(max_examples=100)
    def test_relative_end_equals_now(self, tf: Timeframe):
        """For any relative timeframe, the end parameter should equal the
        current time (now_ms) since relative ranges go from (now - duration) to now.

        **Validates: Requirements 7.2**
        """
        qb = QueryBuilderService(now_ms=FIXED_NOW_MS)
        _sql, params = qb.build_timeframe_clause(tf)
        assert params[1] == FIXED_NOW_MS, (
            f"Expected end param == {FIXED_NOW_MS}, got {params[1]}"
        )

    @given(tf=relative_timeframe)
    @settings(max_examples=100)
    def test_relative_start_is_now_minus_duration(self, tf: Timeframe):
        """For any relative timeframe, the start parameter should equal
        now_ms minus the expected duration in milliseconds.

        **Validates: Requirements 7.2**
        """
        duration_map = {
            "last_1_hour": 60 * 60 * 1000,
            "last_24_hours": 24 * 60 * 60 * 1000,
            "last_7_days": 7 * 24 * 60 * 60 * 1000,
            "last_14_days": 14 * 24 * 60 * 60 * 1000,
            "last_30_days": 30 * 24 * 60 * 60 * 1000,
            "last_60_days": 60 * 24 * 60 * 60 * 1000,
            "last_90_days": 90 * 24 * 60 * 60 * 1000,
        }
        qb = QueryBuilderService(now_ms=FIXED_NOW_MS)
        _sql, params = qb.build_timeframe_clause(tf)
        expected_start = FIXED_NOW_MS - duration_map[tf.relative]
        assert params[0] == expected_start, (
            f"Expected start param == {expected_start}, got {params[0]}"
        )


# ---------------------------------------------------------------------------
# Feature: backend-api, Property 10: Event Selection SQL
# ---------------------------------------------------------------------------

# Strategy: "all" event selection
all_event_selection = st.just(EventSelection(type="all"))

# Strategy: "specific" event selection with 1-10 random event names
# Event names are non-empty alphanumeric strings (realistic event identifiers)
event_name_strategy = st.text(
    min_size=1,
    max_size=30,
    alphabet=st.characters(whitelist_categories=("L", "N"), whitelist_characters="_-."),
)

specific_event_selection = st.lists(
    event_name_strategy, min_size=1, max_size=10
).map(lambda names: EventSelection(type="specific", event_names=names))

# Combined strategy for any valid event selection
any_event_selection = st.one_of(all_event_selection, specific_event_selection)


class TestEventSelectionSQL:
    """Property 10: For any event selection of type "all", the generated SQL
    should not contain an event_name filter. For any event selection with a
    non-empty list of event names, the generated SQL should contain an IN clause
    with exactly those names as parameters.

    **Validates: Requirements 8.1, 8.2**
    """

    # --- Sub-property 1: "all" selection produces empty SQL and empty params ---

    @given(selection=all_event_selection)
    @settings(max_examples=100)
    def test_all_selection_produces_empty_sql_and_params(
        self, selection: EventSelection
    ):
        """For type="all", build_event_selection_clause must return an empty
        SQL string and an empty params list.

        **Validates: Requirements 8.1**
        """
        qb = QueryBuilderService()
        sql, params = qb.build_event_selection_clause(selection)
        assert sql == "", (
            f"Expected empty SQL for 'all' selection, got: {sql!r}"
        )
        assert params == [], (
            f"Expected empty params for 'all' selection, got: {params!r}"
        )

    # --- Sub-property 2: "specific" selection produces IN clause ---

    @given(selection=specific_event_selection)
    @settings(max_examples=100)
    def test_specific_selection_contains_in_clause(
        self, selection: EventSelection
    ):
        """For type="specific" with a non-empty event_names list, the SQL must
        contain '"event_name" IN (...)'.

        **Validates: Requirements 8.2**
        """
        qb = QueryBuilderService()
        sql, params = qb.build_event_selection_clause(selection)
        assert '"event_name" IN (' in sql, (
            f"Expected '\"event_name\" IN (' in SQL, got: {sql!r}"
        )

    @given(selection=specific_event_selection)
    @settings(max_examples=100)
    def test_specific_selection_placeholder_count_matches_event_names(
        self, selection: EventSelection
    ):
        """The number of '?' placeholders in the IN clause must equal the
        number of event names in the selection.

        **Validates: Requirements 8.2**
        """
        qb = QueryBuilderService()
        sql, params = qb.build_event_selection_clause(selection)
        expected_count = len(selection.event_names)
        placeholder_count = sql.count("?")
        assert placeholder_count == expected_count, (
            f"Expected {expected_count} placeholders, got {placeholder_count} "
            f"in SQL: {sql!r}"
        )

    @given(selection=specific_event_selection)
    @settings(max_examples=100)
    def test_specific_selection_params_match_event_names(
        self, selection: EventSelection
    ):
        """The params list must exactly match the event_names list.

        **Validates: Requirements 8.2**
        """
        qb = QueryBuilderService()
        _sql, params = qb.build_event_selection_clause(selection)
        assert params == list(selection.event_names), (
            f"Expected params {selection.event_names}, got {params}"
        )

    # --- Sub-property 3: full query integration ---

    @given(selection=all_event_selection)
    @settings(max_examples=100)
    def test_all_selection_full_query_has_no_event_name_filter(
        self, selection: EventSelection
    ):
        """When type="all" is used in a full query, the SQL must not contain
        any 'event_name' filter.

        **Validates: Requirements 8.1**
        """
        qb = QueryBuilderService()
        request = ReportRequest(
            report_type="trend",
            timeframe=Timeframe(type="absolute", start=1000, end=2000),
            event_selection=selection,
            aggregation=Aggregation(function="count"),
        )
        sql, _params = qb.build_query(request)
        assert "event_name" not in sql, (
            f"Expected no 'event_name' in full SQL for 'all' selection, "
            f"got: {sql!r}"
        )

    @given(selection=specific_event_selection)
    @settings(max_examples=100)
    def test_specific_selection_full_query_contains_in_clause(
        self, selection: EventSelection
    ):
        """When type="specific" is used in a full query, the SQL must contain
        the '"event_name" IN (...)' clause.

        **Validates: Requirements 8.2**
        """
        qb = QueryBuilderService()
        request = ReportRequest(
            report_type="trend",
            timeframe=Timeframe(type="absolute", start=1000, end=2000),
            event_selection=selection,
            aggregation=Aggregation(function="count"),
        )
        sql, params = qb.build_query(request)
        assert '"event_name" IN (' in sql, (
            f"Expected '\"event_name\" IN (' in full SQL, got: {sql!r}"
        )
        # The event name params should be present in the full params list
        for name in selection.event_names:
            assert name in params, (
                f"Expected event name {name!r} in params, got: {params}"
            )


# ---------------------------------------------------------------------------
# Feature: backend-api, Property 11: SQL Generation Validity
# ---------------------------------------------------------------------------


# Strategy: optional group_by dimensions (None or a list of 1-3 valid attributes)
optional_group_by = st.one_of(
    st.none(),
    st.lists(valid_attribute, min_size=1, max_size=3),
)

# Strategy: optional condition filters (None or a nested condition group)
optional_filters = st.one_of(st.none(), nested_condition_group)

# Strategy: any valid timeframe (absolute or relative)
any_timeframe = st.one_of(absolute_timeframe, relative_timeframe)

# Strategy: full ReportRequest with random valid combinations
report_request_strategy = st.tuples(
    st.sampled_from(["trend", "attribution", "cohort"]),
    any_timeframe,
    any_event_selection,
    optional_filters,
    any_aggregation,
    optional_group_by,
).map(
    lambda t: ReportRequest(
        report_type=t[0],
        timeframe=t[1],
        event_selection=t[2],
        filters=t[3],
        aggregation=t[4],
        group_by=t[5],
    )
)


class TestSQLGenerationValidity:
    """Property 11: For any valid combination of report type, timeframe,
    event selection, filters, aggregation, and group_by parameters, the query
    builder should produce a syntactically valid SQL string.

    **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 14.3**
    """

    @given(request=report_request_strategy)
    @settings(max_examples=100)
    def test_build_query_does_not_raise(self, request: ReportRequest):
        """build_query must not raise an exception for any valid ReportRequest.

        **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 14.3**
        """
        qb = QueryBuilderService(now_ms=FIXED_NOW_MS)
        sql, params = qb.build_query(request)
        assert isinstance(sql, str)
        assert isinstance(params, list)

    @given(request=report_request_strategy)
    @settings(max_examples=100)
    def test_sql_starts_with_select(self, request: ReportRequest):
        """The generated SQL must start with 'SELECT'.

        **Validates: Requirements 5.1, 5.2, 5.3, 14.3**
        """
        qb = QueryBuilderService(now_ms=FIXED_NOW_MS)
        sql, _params = qb.build_query(request)
        assert sql.startswith("SELECT"), (
            f"Expected SQL to start with 'SELECT', got: {sql[:50]!r}"
        )

    @given(request=report_request_strategy)
    @settings(max_examples=100)
    def test_sql_contains_from_events(self, request: ReportRequest):
        """The generated SQL must contain 'FROM events'.

        **Validates: Requirements 5.1, 5.2, 5.3, 14.3**
        """
        qb = QueryBuilderService(now_ms=FIXED_NOW_MS)
        sql, _params = qb.build_query(request)
        assert "FROM events" in sql, (
            f"Expected 'FROM events' in SQL, got: {sql!r}"
        )

    @given(request=report_request_strategy)
    @settings(max_examples=100)
    def test_sql_contains_where(self, request: ReportRequest):
        """The generated SQL must contain a WHERE clause (at minimum the
        timeframe clause is always present).

        **Validates: Requirements 5.1, 5.2, 5.3, 14.3**
        """
        qb = QueryBuilderService(now_ms=FIXED_NOW_MS)
        sql, _params = qb.build_query(request)
        assert "WHERE" in sql, (
            f"Expected 'WHERE' in SQL, got: {sql!r}"
        )

    @given(request=report_request_strategy)
    @settings(max_examples=100)
    def test_placeholder_count_matches_params_length(
        self, request: ReportRequest
    ):
        """The number of '?' placeholders in the SQL must equal the length
        of the params list.

        **Validates: Requirements 14.3**
        """
        qb = QueryBuilderService(now_ms=FIXED_NOW_MS)
        sql, params = qb.build_query(request)
        placeholder_count = sql.count("?")
        assert placeholder_count == len(params), (
            f"Expected {len(params)} placeholders, got {placeholder_count} "
            f"in SQL: {sql!r}"
        )

    @given(request=report_request_strategy)
    @settings(max_examples=100)
    def test_balanced_parentheses_in_full_query(self, request: ReportRequest):
        """The generated SQL must have balanced parentheses.

        **Validates: Requirements 5.4, 14.3**
        """
        qb = QueryBuilderService(now_ms=FIXED_NOW_MS)
        sql, _params = qb.build_query(request)
        assert sql.count("(") == sql.count(")"), (
            f"Unbalanced parentheses in SQL: {sql!r}"
        )

# ---------------------------------------------------------------------------
# Feature: backend-api, Property 12: SQL Injection Prevention
# ---------------------------------------------------------------------------

# Classic SQL injection patterns — strings that would be dangerous if
# interpolated directly into SQL.  These are long enough to never
# accidentally match structural SQL keywords.
_INJECTION_PATTERNS = [
    "'; DROP TABLE events; --",
    "1 OR 1=1",
    "' OR ''='",
    "'; DELETE FROM events; --",
    "UNION SELECT * FROM users --",
    "/* comment */ DROP TABLE events",
    "value'; INSERT INTO events VALUES('hack'); --",
    "1; UPDATE events SET data='pwned'",
    "Robert'); DROP TABLE students;--",
    "admin'--",
    "' UNION ALL SELECT NULL,NULL,NULL--",
    "1'; EXEC xp_cmdshell('dir');--",
]

# Strategy: adversarial strings built from injection patterns, optionally
# prefixed/suffixed with dangerous characters.
adversarial_string = st.one_of(
    st.sampled_from(_INJECTION_PATTERNS),
    # Wrap injection patterns with extra dangerous chars
    st.tuples(
        st.sampled_from(["'", '"', ";", "--", "/*"]),
        st.sampled_from(_INJECTION_PATTERNS),
    ).map(lambda t: f"{t[0]}{t[1]}"),
    # Combine two injection patterns
    st.tuples(
        st.sampled_from(_INJECTION_PATTERNS),
        st.sampled_from(_INJECTION_PATTERNS),
    ).map(lambda t: f"{t[0]} {t[1]}"),
)


def _replace_placeholders(sql: str, params: list) -> str:
    """Replace each ``?`` placeholder in *sql* with the corresponding
    parameter value (as a string) so we can verify that the resulting
    string contains the user-supplied values only after substitution.
    """
    result = sql
    for p in params:
        result = result.replace("?", repr(p), 1)
    return result


class TestSQLInjectionPrevention:
    """Property 12: For any user-supplied string value (including strings
    containing SQL keywords, quotes, semicolons, and comment markers), the
    query builder should produce parameterized output where user values appear
    only in the parameter list, never interpolated into the SQL string.

    **Validates: Requirements 14.1**
    """

    # --- Sub-property 1: adversarial event names only appear in params ---

    @given(adv_name=adversarial_string)
    @settings(max_examples=100)
    def test_adversarial_event_name_in_params_not_sql(self, adv_name: str):
        """When an adversarial string is used as an event_name, it must
        appear in the params list and the SQL must use a ``?`` placeholder
        for it rather than interpolating the value.

        **Validates: Requirements 14.1**
        """
        qb = QueryBuilderService(now_ms=FIXED_NOW_MS)
        request = ReportRequest(
            report_type="trend",
            timeframe=Timeframe(type="absolute", start=1000, end=2000),
            event_selection=EventSelection(type="specific", event_names=[adv_name]),
            aggregation=Aggregation(function="count"),
        )
        sql, params = qb.build_query(request)

        # The adversarial value must be in the params list
        assert adv_name in params, (
            f"Expected adversarial value {adv_name!r} in params, got: {params}"
        )
        # The SQL must use placeholders — substituting params into the SQL
        # should produce a string that contains the adversarial value,
        # proving it was parameterized (not pre-interpolated).
        filled = _replace_placeholders(sql, params)
        assert repr(adv_name) in filled, (
            f"After placeholder substitution the adversarial value "
            f"{adv_name!r} should appear in the filled SQL"
        )

    # --- Sub-property 2: adversarial condition values only appear in params ---

    @given(adv_value=adversarial_string, attr=valid_attribute)
    @settings(max_examples=100)
    def test_adversarial_condition_value_in_params_not_sql(
        self, adv_value: str, attr: str
    ):
        """When an adversarial string is used as a condition filter value
        with the 'is' operator, it must be parameterized.

        **Validates: Requirements 14.1**
        """
        qb = QueryBuilderService(now_ms=FIXED_NOW_MS)
        condition = ConditionFilter(attribute=attr, operator="is", value=adv_value)
        request = ReportRequest(
            report_type="trend",
            timeframe=Timeframe(type="absolute", start=1000, end=2000),
            event_selection=EventSelection(type="all"),
            filters=ConditionGroup(logic="and", conditions=[condition]),
            aggregation=Aggregation(function="count"),
        )
        sql, params = qb.build_query(request)

        # The adversarial value must be in the params list
        assert adv_value in params, (
            f"Expected adversarial value {adv_value!r} in params, got: {params}"
        )
        # Placeholder count must match params length (no extra interpolation)
        assert sql.count("?") == len(params), (
            f"Placeholder count mismatch: {sql.count('?')} vs {len(params)}"
        )

    # --- Sub-property 3: adversarial values in LIKE operators are parameterized ---

    @given(
        adv_value=adversarial_string,
        attr=valid_attribute,
        op=st.sampled_from(["contains", "not_contains", "starts_with",
                            "not_starts_with", "ends_with", "not_ends_with"]),
    )
    @settings(max_examples=100)
    def test_adversarial_like_value_parameterized(
        self, adv_value: str, attr: str, op: str
    ):
        """When an adversarial string is used as a value for LIKE-based
        operators, it must be passed via the params list (possibly wrapped
        with ``%`` for LIKE patterns), never interpolated into the SQL.

        **Validates: Requirements 14.1**
        """
        qb = QueryBuilderService(now_ms=FIXED_NOW_MS)
        condition = ConditionFilter(attribute=attr, operator=op, value=adv_value)
        request = ReportRequest(
            report_type="trend",
            timeframe=Timeframe(type="absolute", start=1000, end=2000),
            event_selection=EventSelection(type="all"),
            filters=ConditionGroup(logic="and", conditions=[condition]),
            aggregation=Aggregation(function="count"),
        )
        sql, params = qb.build_query(request)

        # Placeholder count must match params length
        assert sql.count("?") == len(params), (
            f"Placeholder count mismatch: {sql.count('?')} vs {len(params)}"
        )
        # The params list must contain a value that includes the adversarial string
        # (possibly wrapped with % for LIKE patterns)
        param_str_values = [str(p) for p in params]
        found = any(adv_value in pv for pv in param_str_values)
        assert found, (
            f"Expected adversarial value {adv_value!r} to appear within "
            f"a param value, got params: {params}"
        )

    # --- Sub-property 4: SQL string uses only placeholders, no raw user values ---

    @given(adv_name=adversarial_string)
    @settings(max_examples=100)
    def test_placeholder_count_equals_params_length(self, adv_name: str):
        """The SQL string must use '?' placeholders for all user-supplied
        values. The number of placeholders must match the params count.

        **Validates: Requirements 14.1**
        """
        qb = QueryBuilderService(now_ms=FIXED_NOW_MS)
        request = ReportRequest(
            report_type="trend",
            timeframe=Timeframe(type="absolute", start=1000, end=2000),
            event_selection=EventSelection(type="specific", event_names=[adv_name]),
            aggregation=Aggregation(function="count"),
        )
        sql, params = qb.build_query(request)

        placeholder_count = sql.count("?")
        assert placeholder_count == len(params), (
            f"Placeholder count ({placeholder_count}) != params length "
            f"({len(params)}) for SQL: {sql!r}"
        )

    # --- Sub-property 5: combined adversarial inputs are all parameterized ---

    @given(
        adv_names=st.lists(adversarial_string, min_size=1, max_size=5),
        adv_value=adversarial_string,
        attr=valid_attribute,
    )
    @settings(max_examples=100)
    def test_combined_adversarial_inputs_are_parameterized(
        self, adv_names: list[str], adv_value: str, attr: str
    ):
        """When adversarial strings are used in both event_names and condition
        values simultaneously, all must appear in the params list and the
        placeholder count must match.

        **Validates: Requirements 14.1**
        """
        qb = QueryBuilderService(now_ms=FIXED_NOW_MS)
        condition = ConditionFilter(attribute=attr, operator="is", value=adv_value)
        request = ReportRequest(
            report_type="trend",
            timeframe=Timeframe(type="absolute", start=1000, end=2000),
            event_selection=EventSelection(type="specific", event_names=adv_names),
            filters=ConditionGroup(logic="and", conditions=[condition]),
            aggregation=Aggregation(function="count"),
        )
        sql, params = qb.build_query(request)

        # Placeholder count must match params length
        assert sql.count("?") == len(params), (
            f"Placeholder count mismatch: {sql.count('?')} vs {len(params)}"
        )
        # All adversarial event names should be in the params list
        for name in adv_names:
            assert name in params, (
                f"Expected adversarial event name {name!r} in params: {params}"
            )
        # The adversarial condition value should be in the params list
        assert adv_value in params, (
            f"Expected adversarial condition value {adv_value!r} in params: {params}"
        )


# ---------------------------------------------------------------------------
# Feature: backend-api, Property 13: Query Builder Round-Trip
# ---------------------------------------------------------------------------


class TestQueryBuilderRoundTrip:
    """Property 13: For any valid query object, serializing it to a JSON string
    and then parsing that JSON string back should produce an equivalent query
    object.

    **Validates: Requirements 14.4**
    """

    @given(request=report_request_strategy)
    @settings(max_examples=100)
    def test_serialize_parse_round_trip_equivalence(self, request: ReportRequest):
        """Serializing a ReportRequest to JSON and parsing it back must
        produce a structurally equivalent object (model_dump equality).

        **Validates: Requirements 14.4**
        """
        qb = QueryBuilderService()
        serialized = qb.serialize(request)
        restored = qb.parse(serialized)
        assert request.model_dump() == restored.model_dump(), (
            f"Round-trip mismatch:\n"
            f"  original:  {request.model_dump()}\n"
            f"  restored:  {restored.model_dump()}"
        )

    @given(request=report_request_strategy)
    @settings(max_examples=100)
    def test_serialize_produces_valid_json_string(self, request: ReportRequest):
        """serialize() must return a non-empty string that can be parsed
        back without raising an exception.

        **Validates: Requirements 14.4**
        """
        qb = QueryBuilderService()
        serialized = qb.serialize(request)
        assert isinstance(serialized, str)
        assert len(serialized) > 0
        # parse must not raise
        qb.parse(serialized)

    @given(request=report_request_strategy)
    @settings(max_examples=100)
    def test_double_round_trip_is_stable(self, request: ReportRequest):
        """Applying serialize→parse→serialize→parse must yield the same
        result as a single round-trip (idempotency).

        **Validates: Requirements 14.4**
        """
        qb = QueryBuilderService()
        first_json = qb.serialize(request)
        first_restored = qb.parse(first_json)
        second_json = qb.serialize(first_restored)
        second_restored = qb.parse(second_json)
        assert first_restored.model_dump() == second_restored.model_dump(), (
            f"Double round-trip mismatch:\n"
            f"  first:   {first_restored.model_dump()}\n"
            f"  second:  {second_restored.model_dump()}"
        )

    @given(request=report_request_strategy)
    @settings(max_examples=100)
    def test_serialized_json_is_deterministic(self, request: ReportRequest):
        """Serializing the same object twice must produce identical JSON.

        **Validates: Requirements 14.4**
        """
        qb = QueryBuilderService()
        json1 = qb.serialize(request)
        json2 = qb.serialize(request)
        assert json1 == json2, (
            f"Non-deterministic serialization:\n"
            f"  first:  {json1}\n"
            f"  second: {json2}"
        )
