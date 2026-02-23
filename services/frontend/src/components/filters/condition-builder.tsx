"use client";

import type {
  ConditionGroup,
  ConditionFilter,
  ConditionOperator,
} from "@/types/api";

export interface ConditionBuilderProps {
  value: ConditionGroup;
  onChange: (value: ConditionGroup) => void;
}

const STRING_OPERATORS: ConditionOperator[] = [
  "is",
  "is_not",
  "contains",
  "not_contains",
  "starts_with",
  "not_starts_with",
  "ends_with",
  "not_ends_with",
];

const NUMBER_OPERATORS: ConditionOperator[] = [
  "equals",
  "not_equals",
  "greater_than",
  "less_than",
];

const BOOLEAN_OPERATORS: ConditionOperator[] = ["true", "false"];

const ALL_OPERATORS = [...STRING_OPERATORS, ...NUMBER_OPERATORS, ...BOOLEAN_OPERATORS];

type ValueType = "string" | "number" | "boolean";

function getValueType(operator: ConditionOperator): ValueType {
  if (BOOLEAN_OPERATORS.includes(operator)) return "boolean";
  if (NUMBER_OPERATORS.includes(operator)) return "number";
  return "string";
}

function isConditionGroup(
  item: ConditionFilter | ConditionGroup
): item is ConditionGroup {
  return "logic" in item && "conditions" in item;
}

const styles = {
  container: {
    fontFamily: "'Roboto', sans-serif",
    fontSize: "0.875rem",
  } as React.CSSProperties,
  label: {
    display: "block",
    fontWeight: 600,
    marginBottom: 8,
    color: "#3c4858",
  } as React.CSSProperties,
  group: {
    border: "1px solid #eff0f6",
    borderRadius: 7.2,
    padding: 12,
    marginBottom: 8,
  } as React.CSSProperties,
  groupHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  } as React.CSSProperties,
  logicToggle: {
    padding: "3px 10px",
    borderRadius: 7.2,
    border: "1px solid #eff0f6",
    background: "#fff",
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "#4a77f0",
    fontFamily: "'Roboto', sans-serif",
  } as React.CSSProperties,
  conditionRow: {
    display: "flex",
    gap: 6,
    marginBottom: 6,
    alignItems: "center",
  } as React.CSSProperties,
  input: {
    flex: 1,
    padding: "5px 8px",
    borderRadius: 7.2,
    border: "1px solid #eff0f6",
    fontSize: "0.8rem",
    fontFamily: "'Roboto', sans-serif",
  } as React.CSSProperties,
  select: {
    padding: "5px 8px",
    borderRadius: 7.2,
    border: "1px solid #eff0f6",
    fontSize: "0.8rem",
    fontFamily: "'Roboto', sans-serif",
    background: "#fff",
  } as React.CSSProperties,
  smallButton: {
    padding: "4px 10px",
    borderRadius: 7.2,
    border: "none",
    fontSize: "0.8rem",
    cursor: "pointer",
    fontFamily: "'Roboto', sans-serif",
  } as React.CSSProperties,
  addButton: {
    background: "#4a77f0",
    color: "#fff",
  } as React.CSSProperties,
  removeButton: {
    background: "#f5f5f5",
    color: "#888",
  } as React.CSSProperties,
  addGroupButton: {
    background: "#eef2ff",
    color: "#4a77f0",
  } as React.CSSProperties,
  buttonRow: {
    display: "flex",
    gap: 6,
    marginTop: 6,
  } as React.CSSProperties,
};

function ConditionRow({
  condition,
  onUpdate,
  onRemove,
}: {
  condition: ConditionFilter;
  onUpdate: (updated: ConditionFilter) => void;
  onRemove: () => void;
}) {
  const valueType = getValueType(condition.operator);

  return (
    <div style={styles.conditionRow}>
      <input
        type="text"
        value={condition.attribute}
        onChange={(e) => onUpdate({ ...condition, attribute: e.target.value })}
        placeholder="Attribute"
        style={styles.input}
        aria-label="Condition attribute"
      />
      <select
        value={condition.operator}
        onChange={(e) =>
          onUpdate({
            ...condition,
            operator: e.target.value as ConditionOperator,
            value: undefined,
          })
        }
        style={styles.select}
        aria-label="Condition operator"
      >
        {ALL_OPERATORS.map((op) => (
          <option key={op} value={op}>
            {op.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      {valueType !== "boolean" && (
        <input
          type={valueType === "number" ? "number" : "text"}
          value={condition.value !== undefined ? String(condition.value) : ""}
          onChange={(e) =>
            onUpdate({
              ...condition,
              value:
                valueType === "number"
                  ? Number(e.target.value)
                  : e.target.value,
            })
          }
          placeholder="Value"
          style={styles.input}
          aria-label="Condition value"
        />
      )}
      <button
        onClick={onRemove}
        style={{ ...styles.smallButton, ...styles.removeButton }}
        type="button"
        aria-label="Remove condition"
      >
        ✕
      </button>
    </div>
  );
}

function GroupBuilder({
  group,
  onChange,
  onRemove,
  depth,
}: {
  group: ConditionGroup;
  onChange: (updated: ConditionGroup) => void;
  onRemove?: () => void;
  depth: number;
}) {
  const toggleLogic = () => {
    onChange({ ...group, logic: group.logic === "and" ? "or" : "and" });
  };

  const addCondition = () => {
    const newCondition: ConditionFilter = {
      attribute: "",
      operator: "is",
      value: "",
    };
    onChange({ ...group, conditions: [...group.conditions, newCondition] });
  };

  const addNestedGroup = () => {
    const newGroup: ConditionGroup = { logic: "and", conditions: [] };
    onChange({ ...group, conditions: [...group.conditions, newGroup] });
  };

  const updateCondition = (index: number, updated: ConditionFilter | ConditionGroup) => {
    const next = [...group.conditions];
    next[index] = updated;
    onChange({ ...group, conditions: next });
  };

  const removeCondition = (index: number) => {
    onChange({
      ...group,
      conditions: group.conditions.filter((_, i) => i !== index),
    });
  };

  return (
    <div
      style={{
        ...styles.group,
        marginLeft: depth > 0 ? 12 : 0,
        background: depth % 2 === 0 ? "#fafbfc" : "#fff",
      }}
    >
      <div style={styles.groupHeader}>
        <button
          onClick={toggleLogic}
          style={styles.logicToggle}
          type="button"
          aria-label={`Toggle logic to ${group.logic === "and" ? "OR" : "AND"}`}
        >
          {group.logic.toUpperCase()}
        </button>
        {onRemove && (
          <button
            onClick={onRemove}
            style={{ ...styles.smallButton, ...styles.removeButton }}
            type="button"
            aria-label="Remove group"
          >
            Remove group
          </button>
        )}
      </div>

      {group.conditions.map((item, index) =>
        isConditionGroup(item) ? (
          <GroupBuilder
            key={index}
            group={item}
            onChange={(updated) => updateCondition(index, updated)}
            onRemove={() => removeCondition(index)}
            depth={depth + 1}
          />
        ) : (
          <ConditionRow
            key={index}
            condition={item}
            onUpdate={(updated) => updateCondition(index, updated)}
            onRemove={() => removeCondition(index)}
          />
        )
      )}

      <div style={styles.buttonRow}>
        <button
          onClick={addCondition}
          style={{ ...styles.smallButton, ...styles.addButton }}
          type="button"
        >
          + Condition
        </button>
        <button
          onClick={addNestedGroup}
          style={{ ...styles.smallButton, ...styles.addGroupButton }}
          type="button"
        >
          + Group
        </button>
      </div>
    </div>
  );
}

export function ConditionBuilder({ value, onChange }: ConditionBuilderProps) {
  return (
    <div style={styles.container}>
      <span style={styles.label}>Filters</span>
      <GroupBuilder group={value} onChange={onChange} depth={0} />
    </div>
  );
}
