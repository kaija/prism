"""SchemaService — business logic for Profile & Event Schema property CRUD.

Coordinates validation, persistence, and caching for schema property
definitions.  Follows the same patterns as ``TriggerService``:
Router → Service → Repository, with an additional Redis cache layer.
"""

from __future__ import annotations

import structlog

from app.dsl.parser import DslParser
from app.dsl.validator import validate
from app.models.schema import PropertyCreate, PropertyResponse, PropertyUpdate
from app.repositories.postgres_repo import PostgresRepository
from app.services.schema_cache import SchemaCache

logger = structlog.get_logger()

MAX_FORMULA_LENGTH = 10_000


class SchemaService:
    """Manages schema property CRUD with DSL validation and Redis caching."""

    def __init__(self, repo: PostgresRepository, cache: SchemaCache) -> None:
        self._repo = repo
        self._cache = cache
        self._parser = DslParser()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def create_property(
        self, project_id: str, schema_type: str, payload: PropertyCreate
    ) -> PropertyResponse:
        """Create a new schema property definition.

        Validates property_type/formula consistency, runs DSL validation for
        dynamic properties, inserts into the DB, and invalidates the cache.
        """
        # 1. Validate property_type / formula consistency
        self._validate_type_formula_consistency(payload.property_type, payload.formula)

        # 2. DSL validation for dynamic properties
        if payload.property_type == "dynamic":
            self._run_dsl_validation(payload.formula)

        # 3. Check name uniqueness within (project_id, schema_type)
        existing = await self._repo.fetch_one(
            "SELECT id FROM attribute_definitions "
            "WHERE project_id = $1 AND entity_type = $2 AND attr_name = $3",
            project_id,
            schema_type,
            payload.name,
        )
        if existing is not None:
            raise ValueError(
                f"Property name '{payload.name}' already exists"
            )

        # 4. INSERT
        computed = payload.property_type == "dynamic"
        row = await self._repo.fetch_one(
            """
            INSERT INTO attribute_definitions
                (project_id, entity_type, attr_name, attr_type, data_type,
                 description, computed, formula, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            RETURNING id, project_id, entity_type, attr_name, data_type,
                      description, computed, formula, created_at
            """,
            project_id,
            schema_type,
            payload.name,
            payload.data_type,  # attr_type mirrors data_type for new rows
            payload.data_type,
            payload.description,
            computed,
            payload.formula,
        )

        # 5. Invalidate cache
        await self._cache.invalidate(project_id, schema_type)

        return self._row_to_response(row)

    async def list_properties(
        self, project_id: str, schema_type: str
    ) -> list[PropertyResponse]:
        """List all properties for a project + schema_type.

        Checks the Redis cache first; on miss queries the DB and writes
        the result back to the cache.
        """
        # 1. Check cache
        cached = await self._cache.get(project_id, schema_type)
        if cached is not None:
            return [PropertyResponse(**item) for item in cached]

        # 2. Cache miss — query DB
        rows = await self._repo.fetch_all(
            "SELECT id, project_id, entity_type, attr_name, data_type, "
            "       description, computed, formula, created_at "
            "FROM attribute_definitions "
            "WHERE project_id = $1 AND entity_type = $2 "
            "ORDER BY id",
            project_id,
            schema_type,
        )

        results = [self._row_to_response(r) for r in rows]

        # 3. Write back to cache
        cache_data = [r.model_dump(mode="json") for r in results]
        await self._cache.set(project_id, schema_type, cache_data)

        return results

    async def get_property(
        self, project_id: str, schema_type: str, property_id: int
    ) -> PropertyResponse | None:
        """Get a single property by id. Returns None if not found."""
        row = await self._repo.fetch_one(
            "SELECT id, project_id, entity_type, attr_name, data_type, "
            "       description, computed, formula, created_at "
            "FROM attribute_definitions "
            "WHERE project_id = $1 AND entity_type = $2 AND id = $3",
            project_id,
            schema_type,
            property_id,
        )
        if row is None:
            return None
        return self._row_to_response(row)

    async def update_property(
        self,
        project_id: str,
        schema_type: str,
        property_id: int,
        payload: PropertyUpdate,
    ) -> PropertyResponse:
        """Update an existing property.

        Validates type/formula consistency, runs DSL validation when needed,
        updates the DB, and invalidates the cache.
        """
        # 1. Fetch existing row to verify it exists
        existing = await self._repo.fetch_one(
            "SELECT id, project_id, entity_type, attr_name, data_type, "
            "       description, computed, formula, created_at "
            "FROM attribute_definitions "
            "WHERE project_id = $1 AND entity_type = $2 AND id = $3",
            project_id,
            schema_type,
            property_id,
        )
        if existing is None:
            raise LookupError(f"Property {property_id} not found")

        # 2. Determine effective property_type and formula after update
        current_computed = existing["computed"]
        current_property_type = "dynamic" if current_computed else "static"
        current_formula = existing["formula"]

        new_property_type = payload.property_type if payload.property_type is not None else current_property_type
        new_formula = payload.formula if payload.formula is not None else current_formula

        # If switching to static, force formula to null
        if new_property_type == "static":
            new_formula = None

        # Validate consistency
        self._validate_type_formula_consistency(new_property_type, new_formula)

        # DSL validation for dynamic
        if new_property_type == "dynamic":
            self._run_dsl_validation(new_formula)

        # 3. Build SET clause dynamically
        set_parts: list[str] = []
        args: list = []
        param_idx = 1

        if payload.name is not None:
            set_parts.append(f"attr_name = ${param_idx}")
            args.append(payload.name)
            param_idx += 1

        if payload.data_type is not None:
            set_parts.append(f"data_type = ${param_idx}")
            args.append(payload.data_type)
            param_idx += 1
            set_parts.append(f"attr_type = ${param_idx}")
            args.append(payload.data_type)
            param_idx += 1

        if payload.description is not None:
            set_parts.append(f"description = ${param_idx}")
            args.append(payload.description)
            param_idx += 1

        if payload.property_type is not None:
            set_parts.append(f"computed = ${param_idx}")
            args.append(new_property_type == "dynamic")
            param_idx += 1

        # Always set formula when property_type is involved (handles static→null)
        if payload.property_type is not None or payload.formula is not None:
            set_parts.append(f"formula = ${param_idx}")
            args.append(new_formula)
            param_idx += 1

        if not set_parts:
            return self._row_to_response(existing)

        set_clause = ", ".join(set_parts)
        args.extend([project_id, schema_type, property_id])

        row = await self._repo.fetch_one(
            f"UPDATE attribute_definitions SET {set_clause} "
            f"WHERE project_id = ${param_idx} AND entity_type = ${param_idx + 1} "
            f"AND id = ${param_idx + 2} "
            f"RETURNING id, project_id, entity_type, attr_name, data_type, "
            f"          description, computed, formula, created_at",
            *args,
        )

        if row is None:
            raise LookupError(f"Property {property_id} not found")

        # 4. Invalidate cache
        await self._cache.invalidate(project_id, schema_type)

        return self._row_to_response(row)

    async def delete_property(
        self, project_id: str, schema_type: str, property_id: int
    ) -> bool:
        """Delete a property. Returns True if a row was deleted."""
        result = await self._repo.execute(
            "DELETE FROM attribute_definitions "
            "WHERE project_id = $1 AND entity_type = $2 AND id = $3",
            project_id,
            schema_type,
            property_id,
        )

        deleted = result.endswith("1")

        if deleted:
            await self._cache.invalidate(project_id, schema_type)

        return deleted

    def validate_formula(self, formula: str) -> tuple[bool, list[str]]:
        """Validate a DSL formula string.

        Returns a (valid, errors) tuple.
        """
        errors: list[str] = []

        if not formula or not formula.strip():
            errors.append("Formula must not be empty")
            return False, errors

        if len(formula) > MAX_FORMULA_LENGTH:
            errors.append(
                f"Formula exceeds maximum length of {MAX_FORMULA_LENGTH} characters"
            )
            return False, errors

        try:
            ast = self._parser.parse(formula)
        except Exception as exc:
            errors.append(f"DSL syntax error: {exc}")
            return False, errors

        result = validate(ast)
        if not result.valid:
            errors.extend(e.message for e in result.errors)

        return len(errors) == 0, errors

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _validate_type_formula_consistency(
        property_type: str, formula: str | None
    ) -> None:
        """Ensure property_type and formula are consistent.

        - static  → formula must be None
        - dynamic → formula must be a non-empty string
        """
        if property_type == "static" and formula is not None:
            raise ValueError("Formula must be null for static properties")
        if property_type == "dynamic" and (not formula or not formula.strip()):
            raise ValueError("Formula is required for dynamic properties")

    def _run_dsl_validation(self, formula: str | None) -> None:
        """Parse and validate a DSL formula, raising ValueError on failure."""
        if formula is None:
            raise ValueError("Formula is required for dynamic properties")

        valid, errors = self.validate_formula(formula)
        if not valid:
            raise ValueError(f"DSL validation failed: {'; '.join(errors)}")

    @staticmethod
    def _row_to_response(row: dict) -> PropertyResponse:
        """Convert a DB row dict to a PropertyResponse model."""
        return PropertyResponse(
            id=row["id"],
            project_id=row["project_id"],
            schema_type=row["entity_type"],
            name=row["attr_name"],
            data_type=row["data_type"],
            description=row.get("description"),
            property_type="dynamic" if row["computed"] else "static",
            formula=row.get("formula"),
            created_at=row["created_at"],
        )
