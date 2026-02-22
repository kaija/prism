-- Backend API PostgreSQL Schema Migration
-- Tables for project configuration, reporting config, async jobs, request logging, and trigger settings

-- Project key-value configuration (Req 1)
CREATE TABLE IF NOT EXISTS project_config (
    project_id    VARCHAR(64) REFERENCES projects(project_id),
    config_key    VARCHAR(255) NOT NULL,
    config_value  TEXT NOT NULL,
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (project_id, config_key)
);

-- Reporting configuration (Req 2)
CREATE TABLE IF NOT EXISTS project_reporting_config (
    project_id    VARCHAR(64) PRIMARY KEY REFERENCES projects(project_id),
    config        JSONB NOT NULL DEFAULT '{}',
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger settings for event-driven automation rules (Req 3)
CREATE TABLE IF NOT EXISTS trigger_settings (
    rule_id       VARCHAR(64) PRIMARY KEY,
    project_id    VARCHAR(64) REFERENCES projects(project_id),
    name          VARCHAR(255) NOT NULL,
    description   TEXT,
    dsl           TEXT NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'draft',
    actions       JSONB NOT NULL DEFAULT '[]',
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trigger_settings_project ON trigger_settings(project_id);

-- Async job tracking (Req 4, 13)
CREATE TABLE IF NOT EXISTS jobs (
    job_id        VARCHAR(64) PRIMARY KEY,
    project_id    VARCHAR(64) REFERENCES projects(project_id),
    job_type      VARCHAR(50) NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'queued',
    params        JSONB NOT NULL,
    result        JSONB,
    error         TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    started_at    TIMESTAMPTZ,
    completed_at  TIMESTAMPTZ
);

CREATE INDEX idx_jobs_project_status ON jobs(project_id, status);
CREATE INDEX idx_jobs_status ON jobs(status);

-- Request audit log (Req 12)
CREATE TABLE IF NOT EXISTS request_logs (
    id            BIGSERIAL PRIMARY KEY,
    project_id    VARCHAR(64),
    method        VARCHAR(10) NOT NULL,
    path          VARCHAR(512) NOT NULL,
    status_code   INTEGER NOT NULL,
    duration_ms   REAL NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_request_logs_project ON request_logs(project_id, created_at);
