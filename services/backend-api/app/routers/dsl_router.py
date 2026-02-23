"""DSL validation endpoint (Req 20.1–20.4)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.dsl.parser import DslParser
from app.dsl.validator import validate

router = APIRouter(prefix="/api/v1/dsl", tags=["dsl"])


class DslValidateRequest(BaseModel):
    expression: str


class DslValidateResponse(BaseModel):
    valid: bool
    return_type: str | None = None
    errors: list[str] | None = None


@router.post("/validate", response_model=DslValidateResponse)
async def validate_dsl(request: DslValidateRequest):
    """Parse and validate a DSL expression against the function registry."""
    parser = DslParser()
    try:
        ast = parser.parse(request.expression)
    except Exception as e:
        raise HTTPException(status_code=422, detail={"errors": [str(e)]})

    result = validate(ast)
    if not result.valid:
        raise HTTPException(
            status_code=422,
            detail={"errors": [e.message for e in result.errors]},
        )
    return DslValidateResponse(valid=True, return_type=result.return_type)
