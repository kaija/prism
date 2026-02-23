"""Internal config endpoints consumed by the Flink processor.

Serves attribute definitions and trigger rules in the format
expected by com.prism.clients.BackendApiClient.
"""

from __future__ import annotations

import json

from fastapi import APIRouter, Request

router = APIRouter(
    prefix="/api/v1/config/projects/{project_id}",
    tags=["flink-config"],
)


@router.get("/attributes")
async def get_attributes(project_id: str, request: Request) -> list[dict]:
    """Return attribute definitions for a project.

    Response format matches Flink's AttributeDefinition model:
    [{name, type, entity_type, indexed, computed, formula}]
    """
    pg = request.app.state.pg_repo
    rows = await pg.fetch_all(
        "SELECT attr_name AS name, attr_type AS type, entity_type, indexed, "
        "COALESCE(computed, false) AS computed, formula "
        "FROM attribute_definitions WHERE project_id = $1",
        project_id,
    )
    return [
        {
            "name": r["name"],
            "type": r["type"],
            "entity_type": r["entity_type"],
            "indexed": r["indexed"],
            "computed": r["computed"],
            "formula": r["formula"],
        }
        for r in rows
    ]


@router.get("/trigger-rules")
async def get_trigger_rules(project_id: str, request: Request) -> list[dict]:
    """Return active trigger rules for a project.

    Response format matches Flink's TriggerRule model:
    [{rule_id, project_id, name, description, dsl, status, actions, ...}]
    """

    def _parse_json(val: object) -> list:
        if isinstance(val, list):
            return val
        if isinstance(val, str):
            try:
                parsed = json.loads(val)
                return parsed if isinstance(parsed, list) else []
            except (json.JSONDecodeError, TypeError):
                return []
        return []

    pg = request.app.state.pg_repo
    rows = await pg.fetch_all(
        "SELECT rule_id, project_id, name, description, dsl, status, actions "
        "FROM trigger_settings WHERE project_id = $1 AND status = 'active'",
        project_id,
    )
    return [
        {
            "rule_id": r["rule_id"],
            "project_id": r["project_id"],
            "name": r["name"],
            "description": r["description"],
            "dsl": r["dsl"],
            "status": r["status"],
            "actions": _parse_json(r["actions"]),
            "frequency": None,
            "timeframe": None,
            "selected_event_names": None,
            "constraints": None,
        }
        for r in rows
    ]
