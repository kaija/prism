# Tests

All tests require the docker compose test stack running:

```bash
docker compose -f docker-compose.test.yml up -d --build
```

Wait for healthy status:

```bash
docker compose -f docker-compose.test.yml ps
```

## Integration Tests (pytest)

```bash
# Setup virtualenv (first time only)
python3 -m venv tests/integration/.venv
tests/integration/.venv/bin/pip install -r tests/integration/requirements.txt

# Run all integration tests
tests/integration/.venv/bin/pytest tests/integration/ -v

# Run a specific test class
tests/integration/.venv/bin/pytest tests/integration/test_event_ingestion.py::TestKafkaDelivery -v

# Run a single test
tests/integration/.venv/bin/pytest tests/integration/test_event_ingestion.py::TestValidationErrors::test_malformed_json -v
```

## Performance Tests (Locust)

```bash
# Setup virtualenv (first time only)
python3 -m venv tests/performance/.venv
tests/performance/.venv/bin/pip install locust

# Headless — 50 users, ramp 10/s, run 30s
tests/performance/.venv/bin/locust \
  -f tests/performance/locustfile.py \
  --headless -u 50 -r 10 --run-time 30s \
  --host http://localhost:8080 \
  --csv tests/performance/results

# Web UI — open http://localhost:8089
tests/performance/.venv/bin/locust \
  -f tests/performance/locustfile.py \
  --host http://localhost:8080

# Run only track event tests (by tag)
tests/performance/.venv/bin/locust \
  -f tests/performance/locustfile.py \
  --headless -u 20 -r 5 --run-time 15s \
  --host http://localhost:8080 \
  --tags track
```

## Capacity Tests (aiohttp)

Pure async throughput test — finds the QPS ceiling with zero artificial wait.

```bash
# Setup virtualenv (first time only)
python3 -m venv tests/capacity/.venv
tests/capacity/.venv/bin/pip install -r tests/capacity/requirements.txt

# Default: 200 concurrent, 15s duration, 3s ramp
tests/capacity/.venv/bin/python tests/capacity/run.py

# Push harder: 500 concurrent, 30s
tests/capacity/.venv/bin/python tests/capacity/run.py -c 500 -d 30 -r 5

# Custom target
tests/capacity/.venv/bin/python tests/capacity/run.py --url http://your-host:8080 -c 1000 -d 60
```

## Teardown

```bash
docker compose -f docker-compose.test.yml down -v
```
