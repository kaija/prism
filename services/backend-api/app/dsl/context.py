"""Evaluation context for DSL expression resolution."""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class EvaluationContext:
    """Data environment available during DSL evaluation.

    Contains event attributes, profile attributes, parameters,
    and event history for aggregation functions.
    """

    event_props: dict[str, Any] = field(default_factory=dict)
    profile_props: dict[str, Any] = field(default_factory=dict)
    params: dict[str, Any] = field(default_factory=dict)
    event_history: list[dict] = field(default_factory=list)
    event_timestamp: int = 0
    processing_time: int = 0

    def resolve_field_ref(self, source: str, field_name: str) -> Any:
        """Resolve a field reference from the appropriate context source.

        Args:
            source: One of "EVENT", "PROFILE", or "PARAM".
            field_name: The field name to look up.

        Returns:
            The value from the matching context map, or None if the
            source is unrecognized or the field does not exist.
        """
        match source:
            case "EVENT":
                return self.event_props.get(field_name)
            case "PROFILE":
                return self.profile_props.get(field_name)
            case "PARAM":
                return self.params.get(field_name)
        return None
