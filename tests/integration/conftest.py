"""
Shared fixtures for integration tests.

Expects the docker-compose.test.yml stack to be running:
    docker compose -f docker-compose.test.yml up -d

Fixtures:
    - api_url: base URL for the Event Ingest API
    - wait_for_api: blocks until /healthz returns 200
    - kafka_consumer: confluent-kafka Consumer subscribed to event.raw
"""

import os
import time

import pytest
import requests
from confluent_kafka import Consumer, KafkaError


API_HOST = os.getenv("INGEST_API_HOST", "localhost")
API_PORT = os.getenv("INGEST_API_PORT", "8080")
KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:29092")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "event.raw")


@pytest.fixture(scope="session")
def api_url():
    """Base URL for the Event Ingest API."""
    return f"http://{API_HOST}:{API_PORT}"


@pytest.fixture(scope="session", autouse=True)
def wait_for_api(api_url):
    """Wait up to 60s for the API to become healthy before running tests."""
    deadline = time.time() + 60
    while time.time() < deadline:
        try:
            resp = requests.get(f"{api_url}/healthz", timeout=2)
            if resp.status_code == 200:
                return
        except requests.ConnectionError:
            pass
        time.sleep(1)
    pytest.fail("Event Ingest API did not become healthy within 60s")


@pytest.fixture(scope="session")
def kafka_consumer():
    """
    A Kafka consumer subscribed to the raw events topic.

    Uses a unique group id per test session so we always read from the
    beginning of the topic.
    """
    conf = {
        "bootstrap.servers": KAFKA_BOOTSTRAP,
        "group.id": f"integration-test-{int(time.time())}",
        "auto.offset.reset": "earliest",
        "enable.auto.commit": True,
    }
    consumer = Consumer(conf)
    consumer.subscribe([KAFKA_TOPIC])
    yield consumer
    consumer.close()


def drain_kafka(consumer, timeout=5.0, max_messages=500):
    """
    Drain all available messages from the consumer within *timeout* seconds.

    Returns a list of decoded JSON strings (message values).
    """
    import json

    messages = []
    deadline = time.time() + timeout
    while time.time() < deadline:
        msg = consumer.poll(timeout=1.0)
        if msg is None:
            continue
        if msg.error():
            if msg.error().code() == KafkaError._PARTITION_EOF:
                continue
            raise Exception(f"Kafka error: {msg.error()}")
        try:
            messages.append(json.loads(msg.value().decode("utf-8")))
        except (json.JSONDecodeError, UnicodeDecodeError):
            messages.append(msg.value().decode("utf-8", errors="replace"))
        if len(messages) >= max_messages:
            break
    return messages
