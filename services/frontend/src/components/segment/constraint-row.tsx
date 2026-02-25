"use client";

import React from "react";
import type { EventConstraint } from "@/types/segment-rules";
import type { SchemaProperty } from "@/types/api";
import {
  getOperatorsForDataType,
  PROFILE_OPERATOR_LABELS,
  type ProfileOperator,
} from "@/lib/segment/operator-config";

export interface ConstraintRowProps {
  constraint: EventConstraint;
  properties: SchemaProperty[];
  onUpdate: (updates: Partial<EventConstraint>) => void;
  onRemove: () => void;
}

/** Constraint operators are a subset — only comparison + string ops (no boolean/date special) */
const CONSTRAINT_DATA_TYPES = ["string", "integer", "float"];

export function ConstraintRow({
  constraint,
  properties,
  onUpdate,
  onRemove,
}: ConstraintRowProps) {
  const operators = getOperatorsForDataType(constraint.propertyDataType)
    .filter((op) => op !== "IS_TRUE" && op !== "IS_FALSE" && op !== "IN_RECENT_DAYS");

  const handlePropertyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const propName = e.target.value;
    const prop = properties.find((p) => p.name === propName);
    const dataType = prop?.data_type ?? "string";
    const validType = CONSTRAINT_DATA_TYPES.includes(dataType) ? dataType : "string";
    const newOps = getOperatorsForDataType(validType)
      .filter((op) => op !== "IS_TRUE" && op !== "IS_FALSE" && op !== "IN_RECENT_DAYS");
    const defaultOp = newOps[0] ?? "EQ";
    onUpdate({
      property: propName,
      propertyDataType: validType,
      operator: defaultOp,
      value: validType === "integer" || validType === "float" ? 0 : "",
    });
  };

  const isNumeric = constraint.propertyDataType === "integer" || constraint.propertyDataType === "float";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }} data-testid="constraint-row">
      {/* Property select */}
      <select
        className="ds-select"
        value={constraint.property}
        onChange={handlePropertyChange}
        aria-label="Constraint property"
        style={{ flex: "1 1 120px", minWidth: 100 }}
        data-testid="constraint-property-select"
      >
        <option value="">Select property</option>
        {properties.map((p) => (
          <option key={p.name} value={p.name}>{p.name}</option>
        ))}
      </select>

      {/* Operator select */}
      <select
        className="ds-select"
        value={constraint.operator}
        onChange={(e) => onUpdate({ operator: e.target.value as EventConstraint["operator"] })}
        aria-label="Constraint operator"
        style={{ flex: "1 1 100px", minWidth: 90 }}
        data-testid="constraint-operator-select"
      >
        {operators.map((op) => (
          <option key={op} value={op}>{PROFILE_OPERATOR_LABELS[op as ProfileOperator]}</option>
        ))}
      </select>

      {/* Value input */}
      <input
        type={isNumeric ? "number" : "text"}
        className="ds-input"
        value={constraint.value}
        onChange={(e) => onUpdate({ value: isNumeric ? Number(e.target.value) : e.target.value })}
        aria-label="Constraint value"
        placeholder="Value"
        style={{ flex: "1 1 100px", minWidth: 80 }}
        data-testid="constraint-value-input"
      />

      {/* Remove button */}
      <button
        type="button"
        className="ds-btn ds-btn-sm"
        onClick={onRemove}
        aria-label="Remove constraint"
        style={{ color: "var(--danger)", background: "transparent", border: "none", fontSize: 14, padding: 2 }}
        data-testid="remove-constraint"
      >
        ✕
      </button>
    </div>
  );
}
