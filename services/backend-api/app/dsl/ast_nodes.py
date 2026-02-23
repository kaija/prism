from __future__ import annotations

from dataclasses import dataclass
from typing import Union

DslNode = Union["FunctionCall", "Literal", "FieldRef"]


@dataclass(frozen=True)
class FunctionCall:
    """A DSL function call with a name (normalized to uppercase) and arguments."""

    name: str  # normalized to uppercase
    args: tuple[DslNode, ...]


@dataclass(frozen=True)
class Literal:
    """A literal value: number, string, or boolean."""

    value: Union[int, float, str, bool]
    type: str  # "number", "string", "boolean"


@dataclass(frozen=True)
class FieldRef:
    """A reference to a field in the evaluation context."""

    source: str  # "EVENT", "PROFILE", "PARAM"
    field: str
