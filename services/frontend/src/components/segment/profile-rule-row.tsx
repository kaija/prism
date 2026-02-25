"use client";

import React from "react";
import type { ProfileRuleModel } from "@/types/segment-rules";
import type { SchemaProperty } from "@/types/api";
import {
  getOperatorsForDataType,
  PROFILE_OPERATOR_LABELS,
  DATE_OPERATOR_LABELS,
  type ProfileOperator,
} from "@/lib/segment/operator-config";

export interface ProfileRuleRowProps {
  rule: ProfileRuleModel;
  properties: SchemaProperty[];
  onUpdate: (updates: Partial<ProfileRuleModel>) => void;
  onRemove: () => void;
}

export function ProfileRuleRow({
  rule,
  properties,
  onUpdate,
  onRemove,
}: ProfileRuleRowProps) {
  const operators = getOperatorsForDataType(rule.propertyDataType);

  const handlePropertyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const propName = e.target.value;
    const prop = properties.find((p) => p.name === propName);
    const dataType = prop?.data_type ?? "string";
    const newOps = getOperatorsForDataType(dataType);
    const defaultOp = newOps[0] ?? "EQ";
    onUpdate({
      property: propName,
      propertyDataType: dataType,
      operator: defaultOp,
      value: getDefaultValue(dataType),
    });
  };

  const handleOperatorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const op = e.target.value as ProfileOperator;
    if (op === "IS_TRUE") {
      onUpdate({ operator: op, value: true });
    } else if (op === "IS_FALSE") {
      onUpdate({ operator: op, value: false });
    } else {
      onUpdate({ operator: op });
    }
  };

  const getOperatorLabel = (op: ProfileOperator): string => {
    if (rule.propertyDataType === "date" && DATE_OPERATOR_LABELS[op as keyof typeof DATE_OPERATOR_LABELS]) {
      return DATE_OPERATOR_LABELS[op as keyof typeof DATE_OPERATOR_LABELS]!;
    }
    return PROFILE_OPERATOR_LABELS[op];
  };

  const isBooleanOp = rule.operator === "IS_TRUE" || rule.operator === "IS_FALSE";

  return (
    <div className="ds-card" data-testid="profile-rule-row" style={{ padding: 12, marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span className="ds-badge ds-badge-primary" style={{ fontSize: 11 }}>Profile</span>

        {/* Property select */}
        <select
          className="ds-select"
          value={rule.property}
          onChange={handlePropertyChange}
          aria-label="Profile property"
          style={{ flex: "1 1 140px", minWidth: 120 }}
          data-testid="profile-property-select"
        >
          <option value="">Select property</option>
          {properties.map((p) => (
            <option key={p.name} value={p.name}>{p.name}</option>
          ))}
        </select>

        {/* Operator select */}
        <select
          className="ds-select"
          value={rule.operator}
          onChange={handleOperatorChange}
          aria-label="Profile operator"
          style={{ flex: "1 1 120px", minWidth: 100 }}
          data-testid="profile-operator-select"
        >
          {operators.map((op) => (
            <option key={op} value={op}>{getOperatorLabel(op)}</option>
          ))}
        </select>

        {/* Value input — hidden for boolean ops */}
        {!isBooleanOp && (
          <ValueInput
            dataType={rule.propertyDataType}
            operator={rule.operator}
            value={rule.value}
            onChange={(val) => onUpdate({ value: val })}
          />
        )}

        {/* Remove button */}
        <button
          type="button"
          className="ds-btn ds-btn-sm"
          onClick={onRemove}
          aria-label="Remove profile rule"
          style={{ color: "var(--danger)", background: "transparent", border: "none", fontSize: 16, padding: 4 }}
          data-testid="remove-profile-rule"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── Value Input ─────────────────────────────────────────────

interface ValueInputProps {
  dataType: string;
  operator: string;
  value: string | number | boolean;
  onChange: (value: string | number | boolean) => void;
}

function ValueInput({ dataType, operator, value, onChange }: ValueInputProps) {
  if (dataType === "boolean") {
    return null; // Boolean ops handle value internally
  }

  if (dataType === "date" && operator !== "IN_RECENT_DAYS") {
    return (
      <input
        type="date"
        className="ds-input"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Profile value"
        style={{ flex: "1 1 140px", minWidth: 120 }}
        data-testid="profile-value-input"
      />
    );
  }

  if (dataType === "integer" || dataType === "float" || operator === "IN_RECENT_DAYS") {
    return (
      <input
        type="number"
        className="ds-input"
        value={typeof value === "number" ? value : ""}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        aria-label="Profile value"
        placeholder={operator === "IN_RECENT_DAYS" ? "Days" : "Value"}
        style={{ flex: "1 1 100px", minWidth: 80 }}
        data-testid="profile-value-input"
      />
    );
  }

  // Default: string text input
  return (
    <input
      type="text"
      className="ds-input"
      value={typeof value === "string" ? value : String(value)}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Profile value"
      placeholder="Value"
      style={{ flex: "1 1 140px", minWidth: 100 }}
      data-testid="profile-value-input"
    />
  );
}

function getDefaultValue(dataType: string): string | number | boolean {
  switch (dataType) {
    case "integer":
    case "float":
      return 0;
    case "boolean":
      return true;
    case "date":
      return "";
    default:
      return "";
  }
}
