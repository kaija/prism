"use client";

import { useState } from "react";
import type { EventSelection } from "@/types/api";

export interface EventSelectorProps {
  value: EventSelection;
  onChange: (value: EventSelection) => void;
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
  toggleRow: {
    display: "flex",
    gap: 12,
    marginBottom: 10,
  } as React.CSSProperties,
  radioLabel: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    cursor: "pointer",
  } as React.CSSProperties,
  inputRow: {
    display: "flex",
    gap: 8,
    marginBottom: 8,
  } as React.CSSProperties,
  textInput: {
    flex: 1,
    padding: "6px 10px",
    borderRadius: 7.2,
    border: "1px solid #eff0f6",
    fontSize: "0.875rem",
    fontFamily: "'Roboto', sans-serif",
  } as React.CSSProperties,
  addButton: {
    padding: "6px 14px",
    borderRadius: 7.2,
    border: "none",
    background: "#4a77f0",
    color: "#fff",
    fontSize: "0.875rem",
    cursor: "pointer",
    fontFamily: "'Roboto', sans-serif",
  } as React.CSSProperties,
  tagList: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 6,
  } as React.CSSProperties,
  tag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "3px 10px",
    borderRadius: 7.2,
    background: "#eef2ff",
    color: "#4a77f0",
    fontSize: "0.8rem",
  } as React.CSSProperties,
  removeButton: {
    background: "none",
    border: "none",
    color: "#4a77f0",
    cursor: "pointer",
    fontSize: "0.9rem",
    padding: 0,
    lineHeight: 1,
  } as React.CSSProperties,
};

export function EventSelector({ value, onChange }: EventSelectorProps) {
  const [inputValue, setInputValue] = useState("");

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    const existing = value.event_names || [];
    if (existing.includes(trimmed)) return;
    onChange({
      type: "specific",
      event_names: [...existing, trimmed],
    });
    setInputValue("");
  };

  const handleRemove = (name: string) => {
    const updated = (value.event_names || []).filter((n) => n !== name);
    onChange({
      type: updated.length > 0 ? "specific" : "all",
      event_names: updated.length > 0 ? updated : undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div style={styles.container}>
      <span style={styles.label}>Events</span>

      <div style={styles.toggleRow}>
        <label style={styles.radioLabel}>
          <input
            type="radio"
            name="event-mode"
            checked={value.type === "all"}
            onChange={() => onChange({ type: "all" })}
          />
          All events
        </label>
        <label style={styles.radioLabel}>
          <input
            type="radio"
            name="event-mode"
            checked={value.type === "specific"}
            onChange={() =>
              onChange({ type: "specific", event_names: value.event_names || [] })
            }
          />
          Specific events
        </label>
      </div>

      {value.type === "specific" && (
        <>
          <div style={styles.inputRow}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter event name"
              style={styles.textInput}
              aria-label="Event name input"
            />
            <button onClick={handleAdd} style={styles.addButton} type="button">
              Add
            </button>
          </div>

          <div style={styles.tagList}>
            {(value.event_names || []).map((name) => (
              <span key={name} style={styles.tag}>
                {name}
                <button
                  onClick={() => handleRemove(name)}
                  style={styles.removeButton}
                  aria-label={`Remove ${name}`}
                  type="button"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
