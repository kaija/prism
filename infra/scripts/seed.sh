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

-- Seed plain attribute definitions
INSERT INTO attribute_definitions (project_id, entity_type, attr_name, attr_type, indexed) VALUES
('proj_demo', 'event', 'campaign', 'string', true),
('proj_demo', 'event', 'referral_source', 'string', true),
('proj_demo', 'event', 'ab_test_variant', 'string', false),
('proj_demo', 'profile', 'vip_level', 'number', true),
('proj_demo', 'profile', 'subscription_plan', 'string', true),
('proj_demo', 'profile', 'tags', 'array', false)
ON CONFLICT (project_id, entity_type, attr_name) DO NOTHING;

-- Seed computed attribute definitions with DSL formulas
-- Event-level: total_price = price * quantity
INSERT INTO attribute_definitions (project_id, entity_type, attr_name, attr_type, indexed, computed, formula) VALUES
('proj_demo', 'event', 'total_price', 'number', false, true, 'MULTIPLY(EVENT("price"), EVENT("quantity"))')
ON CONFLICT (project_id, entity_type, attr_name) DO NOTHING;

-- Event-level: discount_price = total_price * 0.9
INSERT INTO attribute_definitions (project_id, entity_type, attr_name, attr_type, indexed, computed, formula) VALUES
('proj_demo', 'event', 'discount_price', 'number', false, true, 'MULTIPLY(EVENT("total_price"), 0.9)')
ON CONFLICT (project_id, entity_type, attr_name) DO NOTHING;

-- Profile-level: total_spent = SUM of amount across event history
INSERT INTO attribute_definitions (project_id, entity_type, attr_name, attr_type, indexed, computed, formula) VALUES
('proj_demo', 'profile', 'total_spent', 'number', false, true, 'SUM("amount")')
ON CONFLICT (project_id, entity_type, attr_name) DO NOTHING;

-- Profile-level: purchase_count = COUNT of events in history
INSERT INTO attribute_definitions (project_id, entity_type, attr_name, attr_type, indexed, computed, formula) VALUES
('proj_demo', 'profile', 'purchase_count', 'number', false, true, 'COUNT()')
ON CONFLICT (project_id, entity_type, attr_name) DO NOTHING;

-- Seed trigger rule with real DSL expression (uses trigger_settings table)
INSERT INTO trigger_settings (rule_id, project_id, name, description, dsl, status, actions) VALUES
('rule_dsl_001', 'proj_demo', 'High Value Purchase',
 'Trigger when purchase amount exceeds 1000',
 'GT(EVENT("amount"), 1000)',
 'active',
 '[{"type": "webhook", "enabled": true, "url": "https://httpbin.org/post", "headers": {}}]')
ON CONFLICT (rule_id) DO NOTHING;

-- Seed a second trigger rule
INSERT INTO trigger_settings (rule_id, project_id, name, description, dsl, status, actions) VALUES
('rule_dsl_002', 'proj_demo', 'Discount Alert',
 'Trigger when discount_price is computed and greater than 500',
 'GT(EVENT("discount_price"), 500)',
 'active',
 '[{"type": "notification", "enabled": true}]')
ON CONFLICT (rule_id) DO NOTHING;

-- Also seed into legacy trigger_rules table
INSERT INTO trigger_rules (rule_id, project_id, name, description, dsl, status, actions) VALUES
('rule_demo_001', 'proj_demo', 'High Value Purchase Alert',
 'Trigger when purchase amount exceeds 10000 TWD',
 'GT(EVENT("amount"), 10000)',
 'active',
 '[{"type": "webhook", "enabled": true, "url": "https://httpbin.org/post", "headers": {}}]')
ON CONFLICT (rule_id) DO NOTHING;
EOF

echo "=== Seed Complete ==="
