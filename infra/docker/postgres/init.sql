-- Prism PostgreSQL Schema Initialization

CREATE TABLE IF NOT EXISTS projects (
    project_id    VARCHAR(64) PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    description   TEXT,
    status        VARCHAR(20) DEFAULT 'active',
    settings      JSONB NOT NULL DEFAULT '{}',
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_keys (
    key_id        VARCHAR(64) PRIMARY KEY,
    project_id    VARCHAR(64) REFERENCES projects(project_id),
    key_hash      VARCHAR(255) NOT NULL,
    prefix        VARCHAR(20) NOT NULL,
    status        VARCHAR(20) DEFAULT 'active',
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    last_used_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS attribute_definitions (
    id            SERIAL PRIMARY KEY,
    project_id    VARCHAR(64) REFERENCES projects(project_id),
    entity_type   VARCHAR(20) NOT NULL,
    attr_name     VARCHAR(128) NOT NULL,
    attr_type     VARCHAR(20) NOT NULL,
    indexed       BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, entity_type, attr_name)
);

CREATE TABLE IF NOT EXISTS trigger_rules (
    rule_id       VARCHAR(64) PRIMARY KEY,
    project_id    VARCHAR(64) REFERENCES projects(project_id),
    name          VARCHAR(255) NOT NULL,
    description   TEXT,
    dsl           TEXT NOT NULL,
    compiled_hash VARCHAR(64),
    status        VARCHAR(20) DEFAULT 'active',
    actions       JSONB NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_keys_project ON api_keys(project_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(prefix);
CREATE INDEX idx_attr_defs_project ON attribute_definitions(project_id);
CREATE INDEX idx_trigger_rules_project ON trigger_rules(project_id);
CREATE INDEX idx_trigger_rules_status ON trigger_rules(project_id, status);
