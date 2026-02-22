"""Unit tests for Pydantic v2 models."""

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from app.models.common import ErrorResponse, PaginatedResult
from app.models.config import ConfigValue, ReportingConfig
from app.models.profile import ProfileSummaryRequest, TimelineRequest
from app.models.report import (
    Aggregation,
    ConditionFilter,
    ConditionGroup,
    EventSelection,
    JobResponse,
    JobStatus,
    ReportRequest,
    Timeframe,
)
from app.models.trigger import (
    TriggerAction,
    TriggerCreate,
    TriggerSetting,
    TriggerUpdate,
)


# --- ConfigValue ---


class TestConfigValue:
    def test_valid(self):
        cv = ConfigValue(key="feature_flag", value="true")
        assert cv.key == "feature_flag"
        assert cv.value == "true"

    def test_empty_key_rejected(self):
        with pytest.raises(ValidationError):
            ConfigValue(key="", value="v")

    def test_key_max_length(self):
        cv = ConfigValue(key="k" * 255, value="v")
        assert len(cv.key) == 255

    def test_key_exceeds_max_length(self):
        with pytest.raises(ValidationError):
            ConfigValue(key="k" * 256, value="v")


# --- ReportingConfig ---


class TestReportingConfig:
    def test_defaults(self):
        rc = ReportingConfig()
        assert rc.default_timeframe == "last_30_days"
        assert rc.max_concurrent_reports == 3
        assert rc.default_report_type == "trend"

    def test_custom_values(self):
        rc = ReportingConfig(
            default_timeframe="last_7_days",
            max_concurrent_reports=10,
            default_report_type="cohort",
        )
        assert rc.max_concurrent_reports == 10

    def test_concurrent_reports_below_min(self):
        with pytest.raises(ValidationError):
            ReportingConfig(max_concurrent_reports=0)

    def test_concurrent_reports_above_max(self):
        with pytest.raises(ValidationError):
            ReportingConfig(max_concurrent_reports=21)


# --- TriggerAction ---


class TestTriggerAction:
    def test_webhook_action(self):
        a = TriggerAction(
            type="webhook",
            url="https://example.com/hook",
            headers={"Authorization": "Bearer tok"},
        )
        assert a.type == "webhook"
        assert a.enabled is True

    def test_invalid_type(self):
        with pytest.raises(ValidationError):
            TriggerAction(type="invalid_type")


# --- TriggerCreate ---


class TestTriggerCreate:
    def test_valid_create(self):
        tc = TriggerCreate(
            name="My Trigger",
            dsl="event.name == 'signup'",
            actions=[TriggerAction(type="notification")],
        )
        assert tc.status == "draft"
        assert len(tc.actions) == 1

    def test_empty_name_rejected(self):
        with pytest.raises(ValidationError):
            TriggerCreate(
                name="",
                dsl="x",
                actions=[TriggerAction(type="notification")],
            )

    def test_empty_dsl_rejected(self):
        with pytest.raises(ValidationError):
            TriggerCreate(
                name="t",
                dsl="",
                actions=[TriggerAction(type="notification")],
            )

    def test_empty_actions_rejected(self):
        with pytest.raises(ValidationError):
            TriggerCreate(name="t", dsl="x", actions=[])


# --- TriggerUpdate ---


class TestTriggerUpdate:
    def test_partial_update(self):
        tu = TriggerUpdate(name="Updated Name")
        assert tu.name == "Updated Name"
        assert tu.dsl is None
        assert tu.status is None
        assert tu.actions is None

    def test_all_none(self):
        tu = TriggerUpdate()
        assert tu.name is None


# --- TriggerSetting ---


class TestTriggerSetting:
    def test_full_setting(self):
        now = datetime.now(timezone.utc)
        ts = TriggerSetting(
            rule_id="r1",
            project_id="p1",
            name="Test",
            description=None,
            dsl="event.name == 'click'",
            status="active",
            actions=[TriggerAction(type="webhook", url="https://example.com")],
            created_at=now,
            updated_at=now,
        )
        assert ts.rule_id == "r1"


# --- Timeframe ---


class TestTimeframe:
    def test_absolute(self):
        tf = Timeframe(type="absolute", start=1000, end=2000)
        assert tf.type == "absolute"

    def test_relative(self):
        tf = Timeframe(type="relative", relative="last_7_days")
        assert tf.relative == "last_7_days"

    def test_invalid_type(self):
        with pytest.raises(ValidationError):
            Timeframe(type="custom")


# --- EventSelection ---


class TestEventSelection:
    def test_all_events(self):
        es = EventSelection(type="all")
        assert es.event_names is None

    def test_specific_events(self):
        es = EventSelection(type="specific", event_names=["signup", "login"])
        assert len(es.event_names) == 2


# --- ConditionFilter ---


class TestConditionFilter:
    def test_string_filter(self):
        cf = ConditionFilter(attribute="country", operator="is", value="US")
        assert cf.operator == "is"

    def test_numeric_filter(self):
        cf = ConditionFilter(attribute="age", operator="greater_than", value=18)
        assert cf.value == 18

    def test_boolean_filter(self):
        cf = ConditionFilter(attribute="is_active", operator="true")
        assert cf.value is None

    def test_invalid_operator(self):
        with pytest.raises(ValidationError):
            ConditionFilter(attribute="x", operator="invalid_op", value="y")


# --- ConditionGroup (self-referential) ---


class TestConditionGroup:
    def test_flat_group(self):
        cg = ConditionGroup(
            logic="and",
            conditions=[
                ConditionFilter(attribute="country", operator="is", value="US"),
                ConditionFilter(attribute="age", operator="greater_than", value=18),
            ],
        )
        assert len(cg.conditions) == 2

    def test_nested_group(self):
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
        assert outer.logic == "and"
        assert isinstance(outer.conditions[1], ConditionGroup)


# --- Aggregation ---


class TestAggregation:
    def test_count(self):
        a = Aggregation(function="count")
        assert a.attribute is None

    def test_sum_with_attribute(self):
        a = Aggregation(function="sum", attribute="revenue")
        assert a.attribute == "revenue"

    def test_invalid_function(self):
        with pytest.raises(ValidationError):
            Aggregation(function="median")


# --- ReportRequest ---


class TestReportRequest:
    def test_valid_request(self):
        rr = ReportRequest(
            report_type="trend",
            timeframe=Timeframe(type="relative", relative="last_30_days"),
            event_selection=EventSelection(type="all"),
            aggregation=Aggregation(function="count"),
        )
        assert rr.filters is None
        assert rr.group_by is None

    def test_invalid_report_type(self):
        with pytest.raises(ValidationError):
            ReportRequest(
                report_type="funnel",
                timeframe=Timeframe(type="relative", relative="last_7_days"),
                event_selection=EventSelection(type="all"),
                aggregation=Aggregation(function="count"),
            )


# --- JobResponse / JobStatus ---


class TestJobModels:
    def test_job_response(self):
        jr = JobResponse(job_id="j1", status="queued")
        assert jr.job_id == "j1"

    def test_job_status_completed(self):
        now = datetime.now(timezone.utc)
        js = JobStatus(
            job_id="j1",
            status="completed",
            result={"data": [1, 2, 3]},
            created_at=now,
            completed_at=now,
        )
        assert js.result is not None
        assert js.error is None

    def test_job_status_invalid(self):
        with pytest.raises(ValidationError):
            JobStatus(
                job_id="j1",
                status="unknown",
                created_at=datetime.now(timezone.utc),
            )


# --- ProfileSummaryRequest ---


class TestProfileSummaryRequest:
    def test_defaults(self):
        psr = ProfileSummaryRequest(columns=["name", "email"])
        assert psr.page == 1
        assert psr.page_size == 20
        assert psr.filters is None

    def test_empty_columns_rejected(self):
        with pytest.raises(ValidationError):
            ProfileSummaryRequest(columns=[])

    def test_page_below_min(self):
        with pytest.raises(ValidationError):
            ProfileSummaryRequest(columns=["name"], page=0)

    def test_page_size_above_max(self):
        with pytest.raises(ValidationError):
            ProfileSummaryRequest(columns=["name"], page_size=101)


# --- TimelineRequest ---


class TestTimelineRequest:
    def test_valid_request(self):
        tr = TimelineRequest(
            profile_ids=["p1", "p2"],
            timeframe=Timeframe(type="relative", relative="last_7_days"),
        )
        assert tr.bucket_size == "day"
        assert tr.event_selection is None

    def test_with_filters(self):
        tr = TimelineRequest(
            profile_ids=["p1"],
            timeframe=Timeframe(type="absolute", start=1000, end=2000),
            filters=ConditionGroup(
                logic="and",
                conditions=[
                    ConditionFilter(attribute="country", operator="is", value="US")
                ],
            ),
            bucket_size="hour",
        )
        assert tr.bucket_size == "hour"


# --- PaginatedResult ---


class TestPaginatedResult:
    def test_generic_string(self):
        pr = PaginatedResult[str](items=["a", "b"], total=10, page=1, page_size=2)
        assert pr.items == ["a", "b"]
        assert pr.total == 10

    def test_generic_dict(self):
        pr = PaginatedResult[dict](
            items=[{"id": 1}], total=1, page=1, page_size=20
        )
        assert len(pr.items) == 1


# --- ErrorResponse ---


class TestErrorResponse:
    def test_minimal(self):
        er = ErrorResponse(error="NOT_FOUND")
        assert er.detail is None
        assert er.field_errors is None

    def test_with_details(self):
        er = ErrorResponse(
            error="VALIDATION_ERROR",
            detail="Invalid input",
            field_errors=[{"field": "name", "message": "required"}],
        )
        assert len(er.field_errors) == 1
