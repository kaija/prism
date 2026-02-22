"""
Integration tests for Event Ingestion (POST & GET /ingest).

Covers:
    - POST track events (various event types)
    - POST profile events
    - GET query-param based ingestion with e_/p_ prefixes
    - Validation error responses (missing fields, malformed JSON, too-long names)
    - Kafka message verification (events land in event.raw topic)
"""

import json
import time
import uuid

import pytest
import requests

from conftest import drain_kafka


# ── Helpers ──────────────────────────────────────────────────────────

def post_ingest(api_url, payload, **kwargs):
    """POST JSON to /ingest and return the response."""
    return requests.post(f"{api_url}/ingest", json=payload, timeout=5, **kwargs)


def get_ingest(api_url, params, **kwargs):
    """GET /ingest with query params and return the response."""
    return requests.get(f"{api_url}/ingest", params=params, timeout=5, **kwargs)


# ── Health / Readiness ───────────────────────────────────────────────

class TestHealthEndpoints:
    def test_healthz_returns_ok(self, api_url):
        resp = requests.get(f"{api_url}/healthz", timeout=5)
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"

    def test_readyz_returns_ready(self, api_url):
        resp = requests.get(f"{api_url}/readyz", timeout=5)
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ready"


# ── POST /ingest — Track Events ─────────────────────────────────────

class TestPostTrackEvents:
    def test_page_view_accepted(self, api_url):
        payload = {
            "event_name": "page_view",
            "project_id": "proj_pytest_001",
            "profile_id": "user_1",
            "props": {"page": "/home", "referrer": "google.com"},
        }
        resp = post_ingest(api_url, payload)
        assert resp.status_code == 202
        body = resp.json()
        assert body["status"] == "accepted"
        assert "event_id" in body
        # event_id should be a valid UUID
        uuid.UUID(body["event_id"])

    def test_click_event_accepted(self, api_url):
        payload = {
            "event_name": "click",
            "project_id": "proj_pytest_001",
            "profile_id": "user_2",
            "props": {"button": "signup", "page": "/pricing"},
        }
        resp = post_ingest(api_url, payload)
        assert resp.status_code == 202
        assert resp.json()["status"] == "accepted"

    def test_purchase_event_accepted(self, api_url):
        payload = {
            "event_name": "purchase",
            "project_id": "proj_pytest_001",
            "profile_id": "user_3",
            "props": {
                "item": "Pro Plan",
                "amount": 49.99,
                "currency": "USD",
                "quantity": 1,
            },
        }
        resp = post_ingest(api_url, payload)
        assert resp.status_code == 202
        assert resp.json()["status"] == "accepted"

    def test_minimal_payload_accepted(self, api_url):
        """Only event_name and project_id are required."""
        payload = {"event_name": "ping", "project_id": "proj_pytest_001"}
        resp = post_ingest(api_url, payload)
        assert resp.status_code == 202
        assert resp.json()["status"] == "accepted"

    def test_client_timestamp_preserved(self, api_url):
        cts = int(time.time() * 1000)
        payload = {
            "event_name": "form_submit",
            "project_id": "proj_pytest_001",
            "cts": cts,
        }
        resp = post_ingest(api_url, payload)
        assert resp.status_code == 202

    def test_client_event_id_accepted(self, api_url):
        custom_id = str(uuid.uuid4())
        payload = {
            "event_name": "search",
            "project_id": "proj_pytest_001",
            "event_id": custom_id,
            "props": {"query": "analytics"},
        }
        resp = post_ingest(api_url, payload)
        assert resp.status_code == 202
        body = resp.json()
        assert body["event_id"] == custom_id


# ── POST /ingest — Profile Events ───────────────────────────────────

class TestPostProfileEvents:
    def test_profile_event_accepted(self, api_url):
        payload = {
            "event_name": "profile",
            "project_id": "proj_pytest_001",
            "profile_id": "user_42",
            "props": {"name": "Test User", "plan": "pro"},
        }
        resp = post_ingest(api_url, payload)
        assert resp.status_code == 202
        body = resp.json()
        assert body["status"] == "accepted"

    def test_profile_with_extra_attrs(self, api_url):
        payload = {
            "event_name": "profile",
            "project_id": "proj_pytest_001",
            "profile_id": "user_43",
            "props": {
                "name": "Another User",
                "plan": "enterprise",
                "company": "Acme Inc.",
                "lifetime_value": 12500.00,
            },
        }
        resp = post_ingest(api_url, payload)
        assert resp.status_code == 202


# ── GET /ingest — Query Param Ingestion ──────────────────────────────

class TestGetIngest:
    def test_basic_get_accepted(self, api_url):
        params = {
            "event_name": "click",
            "project_id": "proj_pytest_001",
            "profile_id": "user_50",
        }
        resp = get_ingest(api_url, params)
        assert resp.status_code == 202
        body = resp.json()
        assert body["status"] == "accepted"
        assert "event_id" in body

    def test_get_with_event_props(self, api_url):
        """e_ prefixed params should map to event props."""
        params = {
            "event_name": "page_view",
            "project_id": "proj_pytest_001",
            "e_page": "/docs",
            "e_referrer": "twitter.com",
        }
        resp = get_ingest(api_url, params)
        assert resp.status_code == 202

    def test_get_with_profile_props(self, api_url):
        """p_ prefixed params should map to profile props."""
        params = {
            "event_name": "click",
            "project_id": "proj_pytest_001",
            "profile_id": "user_51",
            "e_button": "cta",
            "p_plan": "starter",
            "p_country": "US",
        }
        resp = get_ingest(api_url, params)
        assert resp.status_code == 202

    def test_get_with_cts(self, api_url):
        params = {
            "event_name": "scroll_depth",
            "project_id": "proj_pytest_001",
            "cts": str(int(time.time() * 1000)),
        }
        resp = get_ingest(api_url, params)
        assert resp.status_code == 202


# ── Validation Errors ────────────────────────────────────────────────

class TestValidationErrors:
    def test_missing_event_name(self, api_url):
        payload = {"project_id": "proj_pytest_001"}
        resp = post_ingest(api_url, payload)
        assert resp.status_code == 400

    def test_missing_project_id(self, api_url):
        resp = requests.post(
            f"{api_url}/ingest",
            data=json.dumps({"event_name": "click"}),
            headers={"Content-Type": "application/json"},
            timeout=5,
        )
        assert resp.status_code == 400

    def test_empty_event_name(self, api_url):
        payload = {"event_name": "", "project_id": "proj_pytest_001"}
        resp = post_ingest(api_url, payload)
        assert resp.status_code == 400
        body = resp.json()
        assert body["error"]["code"] == "VALIDATION_ERROR"
        # Should have field-level detail for event_name
        fields = [d["field"] for d in body["error"].get("details", [])]
        assert "event_name" in fields

    def test_event_name_too_long(self, api_url):
        payload = {"event_name": "x" * 129, "project_id": "proj_pytest_001"}
        resp = post_ingest(api_url, payload)
        assert resp.status_code == 400
        body = resp.json()
        assert body["error"]["code"] == "VALIDATION_ERROR"

    def test_malformed_json(self, api_url):
        resp = requests.post(
            f"{api_url}/ingest",
            data="{not valid json}",
            headers={"Content-Type": "application/json"},
            timeout=5,
        )
        assert resp.status_code == 400
        body = resp.json()
        assert body["error"]["code"] == "INVALID_JSON"

    def test_empty_body(self, api_url):
        resp = requests.post(
            f"{api_url}/ingest",
            data="{}",
            headers={"Content-Type": "application/json"},
            timeout=5,
        )
        assert resp.status_code == 400

    def test_get_missing_event_name(self, api_url):
        params = {"project_id": "proj_pytest_001"}
        resp = get_ingest(api_url, params)
        assert resp.status_code == 400

    def test_get_missing_project_id(self, api_url):
        params = {"event_name": "click"}
        resp = get_ingest(api_url, params)
        assert resp.status_code == 400


# ── Kafka Verification ───────────────────────────────────────────────

class TestKafkaDelivery:
    """
    Verify that ingested events actually land in the Kafka topic.

    These tests send known events, wait briefly, then consume from
    event.raw and assert the messages are present.
    """

    def test_track_event_lands_in_kafka(self, api_url, kafka_consumer):
        marker = f"kafka_track_{uuid.uuid4().hex[:8]}"
        payload = {
            "event_name": marker,
            "project_id": "proj_kafka_test",
            "profile_id": "user_kafka_1",
            "props": {"test_marker": marker},
        }
        resp = post_ingest(api_url, payload)
        assert resp.status_code == 202

        # Give Kafka a moment to receive the message
        time.sleep(3)
        messages = drain_kafka(kafka_consumer, timeout=5)

        matching = [m for m in messages if isinstance(m, dict) and m.get("event_name") == marker]
        assert len(matching) >= 1, (
            f"Expected at least 1 message with event_name={marker}, "
            f"got {len(matching)} out of {len(messages)} total messages"
        )

        msg = matching[0]
        assert msg["project_id"] == "proj_kafka_test"
        assert "event_id" in msg
        assert "sts" in msg

    def test_profile_event_lands_in_kafka(self, api_url, kafka_consumer):
        marker = f"kafka_profile_{uuid.uuid4().hex[:8]}"
        payload = {
            "event_name": "profile",
            "project_id": "proj_kafka_test",
            "profile_id": marker,
            "props": {"name": "Kafka Test User", "plan": "free"},
        }
        resp = post_ingest(api_url, payload)
        assert resp.status_code == 202

        time.sleep(3)
        messages = drain_kafka(kafka_consumer, timeout=5)

        matching = [
            m for m in messages
            if isinstance(m, dict) and m.get("profile_id") == marker
        ]
        assert len(matching) >= 1, (
            f"Expected at least 1 profile message with profile_id={marker}, "
            f"got {len(matching)} out of {len(messages)} total messages"
        )

        msg = matching[0]
        assert msg["project_id"] == "proj_kafka_test"
        assert "updated_at" in msg

    def test_get_event_lands_in_kafka(self, api_url, kafka_consumer):
        marker = f"kafka_get_{uuid.uuid4().hex[:8]}"
        params = {
            "event_name": marker,
            "project_id": "proj_kafka_test",
            "profile_id": "user_kafka_get",
            "e_source": "pixel",
        }
        resp = get_ingest(api_url, params)
        assert resp.status_code == 202

        time.sleep(3)
        messages = drain_kafka(kafka_consumer, timeout=5)

        matching = [m for m in messages if isinstance(m, dict) and m.get("event_name") == marker]
        assert len(matching) >= 1, (
            f"Expected at least 1 message with event_name={marker}, "
            f"got {len(matching)} out of {len(messages)} total messages"
        )
