#!/bin/bash
set -e

echo "=== Seeding Prism Test Data ==="

PGHOST=${POSTGRES_HOST:-localhost}
PGPORT=${POSTGRES_PORT:-5432}
PGDB=${POSTGRES_DB:-prism}
PGUSER=${POSTGRES_USER:-prism}
PGPASSWORD=${POSTGRES_PASSWORD:-prism_dev}

export PGPASSWORD

psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDB" <<'EOF'
-- Seed demo project
INSERT INTO projects (project_id, name, description, settings) VALUES
('proj_demo', 'Demo Project', 'Prism demo project for development', '{
  "timezone": "Asia/Taipei",
  "data_retention_days": 90,
  "max_custom_attributes": 50,
  "allowed_event_names": ["purchase", "login", "page_view", "signup", "logout"]
}')
ON CONFLICT (project_id) DO NOTHING;

-- Seed demo API key (hash of "ef_live_demo_key_123")
INSERT INTO api_keys (key_id, project_id, key_hash, prefix, status) VALUES
('key_demo_001', 'proj_demo', '$2b$12$demo_hash_placeholder', 'ef_live_', 'active')
ON CONFLICT (key_id) DO NOTHING;

-- Seed attribute definitions
INSERT INTO attribute_definitions (project_id, entity_type, attr_name, attr_type, indexed) VALUES
('proj_demo', 'event', 'campaign', 'string', true),
('proj_demo', 'event', 'referral_source', 'string', true),
('proj_demo', 'event', 'ab_test_variant', 'string', false),
('proj_demo', 'profile', 'vip_level', 'number', true),
('proj_demo', 'profile', 'subscription_plan', 'string', true),
('proj_demo', 'profile', 'tags', 'array', false)
ON CONFLICT (project_id, entity_type, attr_name) DO NOTHING;

-- Seed demo trigger rule
INSERT INTO trigger_rules (rule_id, project_id, name, description, dsl, status, actions) VALUES
('rule_demo_001', 'proj_demo', 'High Value Purchase Alert',
 'Trigger when purchase amount exceeds 10000 TWD',
 'event.name == ''purchase'' && event.props.amount > 10000',
 'active',
 '[{"type": "webhook", "enabled": true, "url": "https://httpbin.org/post", "headers": {}}]')
ON CONFLICT (rule_id) DO NOTHING;
EOF

echo "=== Seed Complete ==="
