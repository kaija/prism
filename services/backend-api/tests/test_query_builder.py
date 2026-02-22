"""Unit tests for QueryBuilderService.

Tests each method individually and the top-level build_query composition.
"""

import json

import pytest

from app.models.report import (
    Aggregation,
    ConditionFilter,
    ConditionGroup,
    EventSelection,
    ReportRequest,
    Timeframe,
)
from app.services.query_builder import QueryBuilderService, _quote_identifier


# Fixed "now" for deterministic relative timeframe tests (epoch ms)
FIXED_NOW_MS = 1_700_000_000_000  # ~Nov 14 2023


@pytest.fixture
def qb() -> QueryBuilderService:
    return QueryBuilderService(now_ms=FIXED_NOW_MS)


# ------------------------------------------------------------------
# _quote_identifier
# ------------------------------------------------------------------


class TestQuoteIdentifier:
    def test_simple_name(self):
        assert _quote_identifier("country") == '"country"'

    def test_underscore_name(self):
        assert _quote_identifier("event_name") == '"event_name"'

    def test_leading_underscore(self):
        assert _quote_identifier("_private") == '"_private"'

    def test_alphanumeric(self):
        assert _quote_identifier("col2") == '"col2"'

    def test_rejects_spaces(self):
        with pytest.raises(ValueError, match="Invalid identifier"):
            _quote_identifier("bad name")

    def test_rejects_sql_injection_attempt(self):
        with pytest.raises(ValueError, match="Invalid identifier"):
            _quote_identifier('"; DROP TABLE--')

    def test_rejects_empty(self):
        with pytest.raises(ValueError, match="Invalid identifier"):
            _quote_identifier("")

    def test_rejects_leading_digit(self):
        with pytest.raises(ValueError, match="Invalid identifier"):
            _quote_identifier("1col")


# ------------------------------------------------------------------
# build_timeframe_clause
# ------------------------------------------------------------------


class TestBuildTimeframeClause:
    def test_absolute_timeframe(self, qb: QueryBuilderService):
        tf = Timeframe(type="absolute", start=1000, end=2000)
        sql, params = qb.build_timeframe_clause(tf)
        assert sql == '"timestamp" >= ? AND "timestamp" <= ?'
        assert params == [1000, 2000]

    def test_absolute_same_start_end(self, qb: QueryBuilderService):
        tf = Timeframe(type="absolute", start=5000, end=5000)
        sql, params = qb.build_timeframe_clause(tf)
        assert params == [5000, 5000]

    def test_absolute_missing_start(self, qb: QueryBuilderService):
        tf = Timeframe(type="absolute", end=2000)
        with pytest.raises(ValueError, match="requires start and end"):
            qb.build_timeframe_clause(tf)

    def test_absolute_missing_end(self, qb: QueryBuilderService):
        tf = Timeframe(type="absolute", start=1000)
        with pytest.raises(ValueError, match="requires start and end"):
            qb.build_timeframe_clause(tf)

    def test_absolute_start_after_end(self, qb: QueryBuilderService):
        tf = Timeframe(type="absolute", start=3000, end=1000)
        with pytest.raises(ValueError, match="start must be <= end"):
            qb.build_timeframe_clause(tf)

    def test_relative_last_7_days(self, qb: QueryBuilderService):
        tf = Timeframe(type="relative", relative="last_7_days")
        sql, params = qb.build_timeframe_clause(tf)
        assert sql == '"timestamp" >= ? AND "timestamp" <= ?'
        expected_start = FIXED_NOW_MS - 7 * 24 * 60 * 60 * 1000
        assert params == [expected_start, FIXED_NOW_MS]

    def test_relative_last_30_days(self, qb: QueryBuilderService):
        tf = Timeframe(type="relative", relative="last_30_days")
        sql, params = qb.build_timeframe_clause(tf)
        expected_start = FIXED_NOW_MS - 30 * 24 * 60 * 60 * 1000
        assert params == [expected_start, FIXED_NOW_MS]

    def test_relative_last_1_hour(self, qb: QueryBuilderService):
        tf = Timeframe(type="relative", relative="last_1_hour")
        sql, params = qb.build_timeframe_clause(tf)
        expected_start = FIXED_NOW_MS - 60 * 60 * 1000
        assert params == [expected_start, FIXED_NOW_MS]

    def test_relative_missing_value(self, qb: QueryBuilderService):
        tf = Timeframe(type="relative")
        with pytest.raises(ValueError, match="requires a relative value"):
            qb.build_timeframe_clause(tf)

    def test_relative_unsupported_value(self, qb: QueryBuilderService):
        tf = Timeframe(type="relative", relative="last_999_years")
        with pytest.raises(ValueError, match="Unsupported relative timeframe"):
            qb.build_timeframe_clause(tf)

    def test_relative_start_less_than_end(self, qb: QueryBuilderService):
        """Relative timeframes always produce start < end."""
        tf = Timeframe(type="relative", relative="last_7_days")
        _, params = qb.build_timeframe_clause(tf)
        assert params[0] < params[1]


# ------------------------------------------------------------------
# build_event_selection_clause
# ------------------------------------------------------------------


class TestBuildEventSelectionClause:
    def test_all_events(self, qb: QueryBuilderService):
        sel = EventSelection(type="all")
        sql, params = qb.build_event_selection_clause(sel)
        assert sql == ""
        assert params == []

    def test_specific_single_event(self, qb: QueryBuilderService):
        sel = EventSelection(type="specific", event_names=["signup"])
        sql, params = qb.build_event_selection_clause(sel)
        assert sql == '"event_name" IN (?)'
        assert params == ["signup"]

    def test_specific_multiple_events(self, qb: QueryBuilderService):
        sel = EventSelection(type="specific", event_names=["signup", "login", "purchase"])
        sql, params = qb.build_event_selection_clause(sel)
        assert sql == '"event_name" IN (?, ?, ?)'
        assert params == ["signup", "login", "purchase"]

    def test_specific_empty_list(self, qb: QueryBuilderService):
        sel = EventSelection(type="specific", event_names=[])
        with pytest.raises(ValueError, match="at least one event name"):
            qb.build_event_selection_clause(sel)

    def test_specific_none_list(self, qb: QueryBuilderService):
        sel = EventSelection(type="specific", event_names=None)
        with pytest.raises(ValueError, match="at least one event name"):
            qb.build_event_selection_clause(sel)


# ------------------------------------------------------------------
# build_condition_clause
# ------------------------------------------------------------------


class TestBuildConditionClause:
    # --- String operators ---

    def test_is_operator(self, qb: QueryBuilderService):
        group = ConditionGroup(
            logic="and",
            conditions=[ConditionFilter(attribute="country", operator="is", value="US")],
        )
        sql, params = qb.build_condition_clause(group)
        assert sql == '"country" = ?'
        assert params == ["US"]

    def test_is_not_operator(self, qb: QueryBuilderService):
        group = ConditionGroup(
            logic="and",
            conditions=[ConditionFilter(attribute="country", operator="is_not", value="US")],
        )
        sql, params = qb.build_condition_clause(group)
        assert sql == '"country" != ?'
        assert params == ["US"]

    def test_contains_operator(self, qb: QueryBuilderService):
        group = ConditionGroup(
            logic="and",
            conditions=[ConditionFilter(attribute="name", operator="contains", value="john")],
        )
        sql, params = qb.build_condition_clause(group)
        assert sql == '"name" LIKE ?'
        assert params == ["%john%"]

    def test_not_contains_operator(self, qb: QueryBuilderService):
        group = ConditionGroup(
            logic="and",
            conditions=[ConditionFilter(attribute="name", operator="not_contains", value="test")],
        )
        sql, params = qb.build_condition_clause(group)
        assert sql == '"name" NOT LIKE ?'
        assert params == ["%test%"]

    def test_starts_with_operator(self, qb: QueryBuilderService):
        group = ConditionGroup(
            logic="and",
            conditions=[ConditionFilter(attribute="email", operator="starts_with", value="admin")],
        )
        sql, params = qb.build_condition_clause(group)
        assert sql == '"email" LIKE ?'
        assert params == ["admin%"]

    def test_not_starts_with_operator(self, qb: QueryBuilderService):
        group = ConditionGroup(
            logic="and",
            conditions=[ConditionFilter(attribute="email", operator="not_starts_with", value="admin")],
        )
        sql, params = qb.build_condition_clause(group)
        assert sql == '"email" NOT LIKE ?'
        assert params == ["admin%"]

    def test_ends_with_operator(self, qb: QueryBuilderService):
        group = ConditionGroup(
            logic="and",
            conditions=[ConditionFilter(attribute="domain", operator="ends_with", value=".com")],
        )
        sql, params = qb.build_condition_clause(group)
        assert sql == '"domain" LIKE ?'
        assert params == ["%.com"]

    def test_not_ends_with_operator(self, qb: QueryBuilderService):
        group = ConditionGroup(
            logic="and",
            conditions=[ConditionFilter(attribute="domain", operator="not_ends_with", value=".com")],
        )
        sql, params = qb.build_condition_clause(group)
        assert sql == '"domain" NOT LIKE ?'
        assert params == ["%.com"]

    # --- Numeric operators ---

    def test_equals_operator(self, qb: QueryBuilderService):
        group = ConditionGroup(
            logic="and",
            conditions=[ConditionFilter(attribute="age", operator="equals", value=25)],
        )
        sql, params = qb.build_condition_clause(group)
        assert sql == '"age" = ?'
        assert params == [25]

    def test_not_equals_operator(self, qb: QueryBuilderService):
        group = ConditionGroup(
            logic="and",
            conditions=[ConditionFilter(attribute="age", operator="not_equals", value=0)],
        )
        sql, params = qb.build_condition_clause(group)
        assert sql == '"age" != ?'
        assert params == [0]

    def test_greater_than_operator(self, qb: QueryBuilderService):
        group = ConditionGroup(
            logic="and",
            conditions=[ConditionFilter(attribute="score", operator="greater_than", value=100)],
        )
        sql, params = qb.build_condition_clause(group)
        assert sql == '"score" > ?'
        assert params == [100]

    def test_less_than_operator(self, qb: QueryBuilderService):
        group = ConditionGroup(
            logic="and",
            conditions=[ConditionFilter(attribute="score", operator="less_than", value=50)],
        )
        sql, params = qb.build_condition_clause(group)
        assert sql == '"score" < ?'
        assert params == [50]

    # --- Boolean operators ---

    def test_true_operator(self, qb: QueryBuilderService):
        group = ConditionGroup(
            logic="and",
            conditions=[ConditionFilter(attribute="is_active", operator="true")],
        )
        sql, params = qb.build_condition_clause(group)
        assert sql == '"is_active" = TRUE'
        assert params == []

    def test_false_operator(self, qb: QueryBuilderService):
        group = ConditionGroup(
            logic="and",
            conditions=[ConditionFilter(attribute="is_deleted", operator="false")],
        )
        sql, params = qb.build_condition_clause(group)
        assert sql == '"is_deleted" = FALSE'
        assert params == []

    # --- AND/OR logic ---

    def test_and_logic_multiple_conditions(self, qb: QueryBuilderService):
        group = ConditionGroup(
            logic="and",
            conditions=[
                ConditionFilter(attribute="country", operator="is", value="US"),
                ConditionFilter(attribute="age", operator="greater_than", value=18),
            ],
        )
        sql, params = qb.build_condition_clause(group)
        assert sql == '"country" = ? AND "age" > ?'
        assert params == ["US", 18]

    def test_or_logic_multiple_conditions(self, qb: QueryBuilderService):
        group = ConditionGroup(
            logic="or",
            conditions=[
                ConditionFilter(attribute="plan", operator="is", value="pro"),
                ConditionFilter(attribute="plan", operator="is", value="enterprise"),
            ],
        )
        sql, params = qb.build_condition_clause(group)
        assert sql == '"plan" = ? OR "plan" = ?'
        assert params == ["pro", "enterprise"]

    # --- Nested groups ---

    def test_nested_and_or(self, qb: QueryBuilderService):
        """AND group containing an OR sub-group produces parenthesized output."""
        inner = ConditionGroup(
            logic="or",
            conditions=[
                ConditionFilter(attribute="plan", operator="is", value="pro"),
                ConditionFilter(attribute="plan", operator="is", value="enterprise"),
            ],
        )
        outer = ConditionGroup(
            logic="and",
            conditions=[
                ConditionFilter(attribute="country", operator="is", value="US"),
                inner,
            ],
        )
        sql, params = qb.build_condition_clause(outer)
        assert sql == '"country" = ? AND ("plan" = ? OR "plan" = ?)'
        assert params == ["US", "pro", "enterprise"]

    def test_deeply_nested(self, qb: QueryBuilderService):
        """Three levels of nesting."""
        level3 = ConditionGroup(
            logic="and",
            conditions=[
                ConditionFilter(attribute="a", operator="is", value="1"),
                ConditionFilter(attribute="b", operator="is", value="2"),
            ],
        )
        level2 = ConditionGroup(
            logic="or",
            conditions=[
                level3,
                ConditionFilter(attribute="c", operator="is", value="3"),
            ],
        )
        level1 = ConditionGroup(
            logic="and",
            conditions=[
                ConditionFilter(attribute="d", operator="is", value="4"),
                level2,
            ],
        )
        sql, params = qb.build_condition_clause(level1)
        assert sql == '"d" = ? AND (("a" = ? AND "b" = ?) OR "c" = ?)'
        assert params == ["4", "1", "2", "3"]

    def test_single_condition_group(self, qb: QueryBuilderService):
        group = ConditionGroup(
            logic="and",
            conditions=[ConditionFilter(attribute="x", operator="equals", value=42)],
        )
        sql, params = qb.build_condition_clause(group)
        assert sql == '"x" = ?'
        assert params == [42]


# ------------------------------------------------------------------
# build_aggregation_select
# ------------------------------------------------------------------


class TestBuildAggregationSelect:
    def test_count(self, qb: QueryBuilderService):
        agg = Aggregation(function="count")
        assert qb.build_aggregation_select(agg) == "COUNT(*)"

    def test_sum(self, qb: QueryBuilderService):
        agg = Aggregation(function="sum", attribute="revenue")
        assert qb.build_aggregation_select(agg) == 'SUM("revenue")'

    def test_sum_missing_attribute(self, qb: QueryBuilderService):
        agg = Aggregation(function="sum")
        with pytest.raises(ValueError, match="requires an attribute"):
            qb.build_aggregation_select(agg)

    def test_count_unique(self, qb: QueryBuilderService):
        agg = Aggregation(function="count_unique", attribute="user_id")
        assert qb.build_aggregation_select(agg) == 'COUNT(DISTINCT "user_id")'

    def test_min(self, qb: QueryBuilderService):
        agg = Aggregation(function="min", attribute="price")
        assert qb.build_aggregation_select(agg) == 'MIN("price")'

    def test_max(self, qb: QueryBuilderService):
        agg = Aggregation(function="max", attribute="price")
        assert qb.build_aggregation_select(agg) == 'MAX("price")'

    def test_mean(self, qb: QueryBuilderService):
        agg = Aggregation(function="mean", attribute="score")
        assert qb.build_aggregation_select(agg) == 'AVG("score")'

    def test_average(self, qb: QueryBuilderService):
        agg = Aggregation(function="average", attribute="score")
        assert qb.build_aggregation_select(agg) == 'AVG("score")'

    def test_tops(self, qb: QueryBuilderService):
        agg = Aggregation(function="tops", attribute="browser")
        assert qb.build_aggregation_select(agg) == '"browser", COUNT(*) AS count'

    def test_tops_missing_attribute(self, qb: QueryBuilderService):
        agg = Aggregation(function="tops")
        with pytest.raises(ValueError, match="requires an attribute"):
            qb.build_aggregation_select(agg)

    def test_last_event(self, qb: QueryBuilderService):
        agg = Aggregation(function="last_event")
        assert qb.build_aggregation_select(agg) == "*"

    def test_first_event(self, qb: QueryBuilderService):
        agg = Aggregation(function="first_event")
        assert qb.build_aggregation_select(agg) == "*"


# ------------------------------------------------------------------
# build_group_by
# ------------------------------------------------------------------


class TestBuildGroupBy:
    def test_empty_dimensions(self, qb: QueryBuilderService):
        assert qb.build_group_by([]) == ""

    def test_single_dimension(self, qb: QueryBuilderService):
        assert qb.build_group_by(["country"]) == 'GROUP BY "country"'

    def test_multiple_dimensions(self, qb: QueryBuilderService):
        result = qb.build_group_by(["country", "browser"])
        assert result == 'GROUP BY "country", "browser"'

    def test_invalid_dimension_name(self, qb: QueryBuilderService):
        with pytest.raises(ValueError, match="Invalid identifier"):
            qb.build_group_by(["bad name"])


# ------------------------------------------------------------------
# build_query (top-level composition)
# ------------------------------------------------------------------


class TestBuildQuery:
    def test_simple_count_all_events(self, qb: QueryBuilderService):
        req = ReportRequest(
            report_type="trend",
            timeframe=Timeframe(type="absolute", start=1000, end=2000),
            event_selection=EventSelection(type="all"),
            aggregation=Aggregation(function="count"),
        )
        sql, params = qb.build_query(req)
        assert sql == (
            'SELECT COUNT(*) FROM events'
            ' WHERE "timestamp" >= ? AND "timestamp" <= ?'
        )
        assert params == [1000, 2000]

    def test_count_with_specific_events(self, qb: QueryBuilderService):
        req = ReportRequest(
            report_type="trend",
            timeframe=Timeframe(type="absolute", start=1000, end=2000),
            event_selection=EventSelection(type="specific", event_names=["signup", "login"]),
            aggregation=Aggregation(function="count"),
        )
        sql, params = qb.build_query(req)
        assert '"event_name" IN (?, ?)' in sql
        assert params == [1000, 2000, "signup", "login"]

    def test_sum_with_filters(self, qb: QueryBuilderService):
        req = ReportRequest(
            report_type="trend",
            timeframe=Timeframe(type="absolute", start=1000, end=2000),
            event_selection=EventSelection(type="all"),
            aggregation=Aggregation(function="sum", attribute="revenue"),
            filters=ConditionGroup(
                logic="and",
                conditions=[
                    ConditionFilter(attribute="country", operator="is", value="US"),
                ],
            ),
        )
        sql, params = qb.build_query(req)
        assert sql.startswith('SELECT SUM("revenue") FROM events WHERE')
        assert '"country" = ?' in sql
        assert params == [1000, 2000, "US"]

    def test_tops_aggregation_adds_group_by_and_order(self, qb: QueryBuilderService):
        req = ReportRequest(
            report_type="trend",
            timeframe=Timeframe(type="absolute", start=1000, end=2000),
            event_selection=EventSelection(type="all"),
            aggregation=Aggregation(function="tops", attribute="browser"),
        )
        sql, params = qb.build_query(req)
        assert 'GROUP BY "browser"' in sql
        assert "ORDER BY count DESC" in sql

    def test_last_event_adds_order_limit(self, qb: QueryBuilderService):
        req = ReportRequest(
            report_type="trend",
            timeframe=Timeframe(type="absolute", start=1000, end=2000),
            event_selection=EventSelection(type="all"),
            aggregation=Aggregation(function="last_event"),
        )
        sql, params = qb.build_query(req)
        assert "SELECT * FROM events" in sql
        assert 'ORDER BY "timestamp" DESC LIMIT 1' in sql

    def test_first_event_adds_order_limit(self, qb: QueryBuilderService):
        req = ReportRequest(
            report_type="trend",
            timeframe=Timeframe(type="absolute", start=1000, end=2000),
            event_selection=EventSelection(type="all"),
            aggregation=Aggregation(function="first_event"),
        )
        sql, params = qb.build_query(req)
        assert 'ORDER BY "timestamp" ASC LIMIT 1' in sql

    def test_group_by_dimensions(self, qb: QueryBuilderService):
        req = ReportRequest(
            report_type="trend",
            timeframe=Timeframe(type="absolute", start=1000, end=2000),
            event_selection=EventSelection(type="all"),
            aggregation=Aggregation(function="count"),
            group_by=["country", "browser"],
        )
        sql, params = qb.build_query(req)
        assert 'GROUP BY "country", "browser"' in sql

    def test_relative_timeframe_in_full_query(self, qb: QueryBuilderService):
        req = ReportRequest(
            report_type="trend",
            timeframe=Timeframe(type="relative", relative="last_7_days"),
            event_selection=EventSelection(type="all"),
            aggregation=Aggregation(function="count"),
        )
        sql, params = qb.build_query(req)
        assert '"timestamp" >= ? AND "timestamp" <= ?' in sql
        assert len(params) == 2
        assert params[0] < params[1]

    def test_full_complex_query(self, qb: QueryBuilderService):
        """Full query with all clauses: timeframe, events, filters, group_by."""
        req = ReportRequest(
            report_type="trend",
            timeframe=Timeframe(type="absolute", start=1000, end=2000),
            event_selection=EventSelection(type="specific", event_names=["purchase"]),
            aggregation=Aggregation(function="sum", attribute="amount"),
            filters=ConditionGroup(
                logic="and",
                conditions=[
                    ConditionFilter(attribute="country", operator="is", value="US"),
                    ConditionGroup(
                        logic="or",
                        conditions=[
                            ConditionFilter(attribute="plan", operator="is", value="pro"),
                            ConditionFilter(attribute="plan", operator="is", value="enterprise"),
                        ],
                    ),
                ],
            ),
            group_by=["country"],
        )
        sql, params = qb.build_query(req)

        # Verify structure
        assert sql.startswith('SELECT SUM("amount") FROM events WHERE')
        assert '"timestamp" >= ? AND "timestamp" <= ?' in sql
        assert '"event_name" IN (?)' in sql
        assert '"country" = ?' in sql
        assert '"plan" = ? OR "plan" = ?' in sql
        assert 'GROUP BY "country"' in sql

        # Verify params order: timeframe, event_selection, filters
        assert params == [1000, 2000, "purchase", "US", "pro", "enterprise"]

    def test_tops_with_extra_group_by(self, qb: QueryBuilderService):
        """Tops aggregation with additional group_by dimensions."""
        req = ReportRequest(
            report_type="trend",
            timeframe=Timeframe(type="absolute", start=1000, end=2000),
            event_selection=EventSelection(type="all"),
            aggregation=Aggregation(function="tops", attribute="browser"),
            group_by=["country"],
        )
        sql, params = qb.build_query(req)
        # browser should be first in GROUP BY, then country
        assert 'GROUP BY "browser", "country"' in sql
        assert "ORDER BY count DESC" in sql

    def test_tops_attribute_already_in_group_by(self, qb: QueryBuilderService):
        """Tops attribute already in group_by should not be duplicated."""
        req = ReportRequest(
            report_type="trend",
            timeframe=Timeframe(type="absolute", start=1000, end=2000),
            event_selection=EventSelection(type="all"),
            aggregation=Aggregation(function="tops", attribute="browser"),
            group_by=["browser", "country"],
        )
        sql, params = qb.build_query(req)
        assert 'GROUP BY "browser", "country"' in sql

    def test_parameterization_no_value_interpolation(self, qb: QueryBuilderService):
        """User values must never appear in the SQL string itself."""
        req = ReportRequest(
            report_type="trend",
            timeframe=Timeframe(type="absolute", start=1000, end=2000),
            event_selection=EventSelection(type="specific", event_names=["DROP TABLE events"]),
            aggregation=Aggregation(function="count"),
            filters=ConditionGroup(
                logic="and",
                conditions=[
                    ConditionFilter(
                        attribute="name",
                        operator="is",
                        value="'; DROP TABLE users; --",
                    ),
                ],
            ),
        )
        sql, params = qb.build_query(req)
        # The malicious strings should only be in params, not in SQL
        assert "DROP TABLE" not in sql
        assert "'; DROP TABLE users; --" in params
        assert "DROP TABLE events" in params


# ------------------------------------------------------------------
# serialize / parse round-trip (Req 14.4)
# ------------------------------------------------------------------


class TestSerialize:
    def test_serialize_simple_request(self, qb: QueryBuilderService):
        req = ReportRequest(
            report_type="trend",
            timeframe=Timeframe(type="absolute", start=1000, end=2000),
            event_selection=EventSelection(type="all"),
            aggregation=Aggregation(function="count"),
        )
        result = qb.serialize(req)
        assert isinstance(result, str)
        # Should be valid JSON
        data = json.loads(result)
        assert data["report_type"] == "trend"
        assert data["aggregation"]["function"] == "count"

    def test_serialize_with_filters(self, qb: QueryBuilderService):
        req = ReportRequest(
            report_type="attribution",
            timeframe=Timeframe(type="relative", relative="last_7_days"),
            event_selection=EventSelection(type="specific", event_names=["signup"]),
            aggregation=Aggregation(function="sum", attribute="revenue"),
            filters=ConditionGroup(
                logic="and",
                conditions=[
                    ConditionFilter(attribute="country", operator="is", value="US"),
                ],
            ),
            group_by=["country"],
        )
        result = qb.serialize(req)
        data = json.loads(result)
        assert data["report_type"] == "attribution"
        assert data["filters"]["logic"] == "and"
        assert data["group_by"] == ["country"]

    def test_serialize_with_nested_conditions(self, qb: QueryBuilderService):
        req = ReportRequest(
            report_type="cohort",
            timeframe=Timeframe(type="absolute", start=0, end=5000),
            event_selection=EventSelection(type="all"),
            aggregation=Aggregation(function="count"),
            filters=ConditionGroup(
                logic="and",
                conditions=[
                    ConditionFilter(attribute="a", operator="is", value="x"),
                    ConditionGroup(
                        logic="or",
                        conditions=[
                            ConditionFilter(attribute="b", operator="equals", value=1),
                            ConditionFilter(attribute="c", operator="true"),
                        ],
                    ),
                ],
            ),
        )
        result = qb.serialize(req)
        data = json.loads(result)
        assert data["filters"]["conditions"][1]["logic"] == "or"


class TestParse:
    def test_parse_simple_json(self, qb: QueryBuilderService):
        raw = json.dumps({
            "report_type": "trend",
            "timeframe": {"type": "absolute", "start": 1000, "end": 2000},
            "event_selection": {"type": "all"},
            "aggregation": {"function": "count"},
        })
        result = qb.parse(raw)
        assert isinstance(result, ReportRequest)
        assert result.report_type == "trend"
        assert result.timeframe.start == 1000
        assert result.aggregation.function == "count"

    def test_parse_with_filters(self, qb: QueryBuilderService):
        raw = json.dumps({
            "report_type": "attribution",
            "timeframe": {"type": "relative", "relative": "last_7_days"},
            "event_selection": {"type": "specific", "event_names": ["login"]},
            "aggregation": {"function": "sum", "attribute": "revenue"},
            "filters": {
                "logic": "and",
                "conditions": [
                    {"attribute": "country", "operator": "is", "value": "US"},
                ],
            },
            "group_by": ["country"],
        })
        result = qb.parse(raw)
        assert result.report_type == "attribution"
        assert result.filters is not None
        assert result.filters.logic == "and"
        assert result.group_by == ["country"]

    def test_parse_invalid_json(self, qb: QueryBuilderService):
        with pytest.raises(ValueError, match="Failed to parse query"):
            qb.parse("not valid json {{{")

    def test_parse_missing_required_field(self, qb: QueryBuilderService):
        raw = json.dumps({"report_type": "trend"})
        with pytest.raises(ValueError, match="Failed to parse query"):
            qb.parse(raw)

    def test_parse_invalid_report_type(self, qb: QueryBuilderService):
        raw = json.dumps({
            "report_type": "invalid_type",
            "timeframe": {"type": "absolute", "start": 1000, "end": 2000},
            "event_selection": {"type": "all"},
            "aggregation": {"function": "count"},
        })
        with pytest.raises(ValueError, match="Failed to parse query"):
            qb.parse(raw)


class TestSerializeParseRoundTrip:
    def test_round_trip_simple(self, qb: QueryBuilderService):
        original = ReportRequest(
            report_type="trend",
            timeframe=Timeframe(type="absolute", start=1000, end=2000),
            event_selection=EventSelection(type="all"),
            aggregation=Aggregation(function="count"),
        )
        serialized = qb.serialize(original)
        restored = qb.parse(serialized)
        assert restored == original

    def test_round_trip_with_all_fields(self, qb: QueryBuilderService):
        original = ReportRequest(
            report_type="cohort",
            timeframe=Timeframe(type="relative", relative="last_30_days"),
            event_selection=EventSelection(type="specific", event_names=["purchase", "refund"]),
            aggregation=Aggregation(function="sum", attribute="amount"),
            filters=ConditionGroup(
                logic="and",
                conditions=[
                    ConditionFilter(attribute="country", operator="is", value="US"),
                    ConditionGroup(
                        logic="or",
                        conditions=[
                            ConditionFilter(attribute="plan", operator="is", value="pro"),
                            ConditionFilter(attribute="age", operator="greater_than", value=18),
                        ],
                    ),
                ],
            ),
            group_by=["country", "plan"],
        )
        serialized = qb.serialize(original)
        restored = qb.parse(serialized)
        assert restored == original

    def test_round_trip_preserves_none_filters(self, qb: QueryBuilderService):
        original = ReportRequest(
            report_type="trend",
            timeframe=Timeframe(type="absolute", start=0, end=100),
            event_selection=EventSelection(type="all"),
            aggregation=Aggregation(function="max", attribute="score"),
            filters=None,
            group_by=None,
        )
        serialized = qb.serialize(original)
        restored = qb.parse(serialized)
        assert restored == original
        assert restored.filters is None
        assert restored.group_by is None

    def test_round_trip_boolean_condition(self, qb: QueryBuilderService):
        original = ReportRequest(
            report_type="trend",
            timeframe=Timeframe(type="absolute", start=100, end=200),
            event_selection=EventSelection(type="all"),
            aggregation=Aggregation(function="count"),
            filters=ConditionGroup(
                logic="and",
                conditions=[
                    ConditionFilter(attribute="is_active", operator="true"),
                ],
            ),
        )
        serialized = qb.serialize(original)
        restored = qb.parse(serialized)
        assert restored == original
