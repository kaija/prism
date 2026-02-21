-- Prism DuckDB Schema Initialization

CREATE TABLE IF NOT EXISTS events (
    event_id          VARCHAR PRIMARY KEY,
    project_id        VARCHAR NOT NULL,
    event_name        VARCHAR NOT NULL,
    ts                BIGINT NOT NULL,
    profile_id        VARCHAR,
    props             JSON,
    ctx               JSON,
    ingested_at       BIGINT DEFAULT (EPOCH_MS(NOW()))
);

CREATE TABLE IF NOT EXISTS profiles (
    profile_id        VARCHAR NOT NULL,
    project_id        VARCHAR NOT NULL,
    props             JSON,
    updated_at        BIGINT,
    PRIMARY KEY (project_id, profile_id)
);

CREATE TABLE IF NOT EXISTS trigger_logs (
    log_id            VARCHAR PRIMARY KEY,
    project_id        VARCHAR NOT NULL,
    rule_id           VARCHAR NOT NULL,
    event_id          VARCHAR NOT NULL,
    profile_id        VARCHAR,
    triggered_at      BIGINT NOT NULL,
    result            JSON
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_events_project_type
    ON events(project_id, event_name, ts);

CREATE INDEX IF NOT EXISTS idx_events_project_profile
    ON events(project_id, profile_id, ts);

CREATE INDEX IF NOT EXISTS idx_trigger_logs_project
    ON trigger_logs(project_id, triggered_at);
