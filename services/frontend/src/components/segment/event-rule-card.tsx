"use client";

import React from "react";
import type { EventRuleModel, EventConstraint } from "@/types/segment-rules";
import type { SchemaProperty } from "@/types/api";
import {
  AGGREGATION_CONFIG,
  AGGREGATION_FNS,
  EVENT_COMPARISON_LABELS,
  EVENT_COMPARISON_OPS,
  type AggregationConfig,
} from "@/lib/segment/operator-config";
import type { AggregationFn, EventComparisonOp } from "@/types/segment-rules";
import { ConstraintRow } from "./constraint-row";

export interface EventRuleCardProps {
  rule: EventRuleModel;
  eventProperties: SchemaProperty[];
  onUpdate: (updates: Partial<EventRuleModel>) => void;
  onRemove: () => void;
  onAddConstraint: () => void;
  onUpdateConstraint: (constraintId: string, updates: Partial<EventConstraint>) => void;
  onRemoveConstraint: (constraintId: string) => void;
}

/** Unique event names from properties (deduped) */
function getEventNames(properties: SchemaProperty[]): string[] {
  const names = new Set<string>();
  properties.forEach((p) => {
    if (p.name === "event_name" || p.name === "timestamp" || p.name === "profile_id") return;
    names.add(p.name);
  });
  return Array.from(names);
}

export function EventRuleCard({
  rule,
  eventProperties,
  onUpdate,
  onRemove,
  onAddConstraint,
  onUpdateConstraint,
  onRemoveConstraint,
}: EventRuleCardProps) {
  const aggConfig: AggregationConfig = AGGREGATION_CONFIG[rule.aggregation];
  const showAggProperty = aggConfig.requiresProperty;

  return (
    <div className="ds-card" data-testid="event-rule-card" style={{ padding: 12, marginBottom: 8 }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span className="ds-badge" style={{ background: "var(--success)", fontSize: 11 }}>Event</span>
        <button
          type="button"
          className="ds-btn ds-btn-sm"
          onClick={onRemove}
          aria-label="Remove event rule"
          style={{ color: "var(--danger)", background: "transparent", border: "none", fontSize: 16, padding: 4 }}
          data-testid="remove-event-rule"
        >
          ✕
        </button>
      </div>

      {/* Event name select */}
      <div className="ds-form-group" style={{ marginBottom: 10 }}>
        <label className="ds-label" style={{ fontSize: 12, marginBottom: 4 }}>Event Name</label>
        <select
          className="ds-select"
          value={rule.eventName}
          onChange={(e) => onUpdate({ eventName: e.target.value })}
          aria-label="Event name"
          data-testid="event-name-select"
        >
          <option value="">Select event</option>
          <option value="*">Any Event</option>
          {getEventNames(eventProperties).map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {/* Aggregation row */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ flex: "1 1 140px" }}>
          <label className="ds-label" style={{ fontSize: 12, marginBottom: 4 }}>Aggregation</label>
          <select
            className="ds-select"
            value={rule.aggregation}
            onChange={(e) => {
              const fn = e.target.value as AggregationFn;
              const updates: Partial<EventRuleModel> = { aggregation: fn };
              if (!AGGREGATION_CONFIG[fn].requiresProperty) {
                updates.aggregationProperty = undefined;
              }
              onUpdate(updates);
            }}
            aria-label="Aggregation function"
            data-testid="aggregation-select"
          >
            {AGGREGATION_FNS.map((fn) => (
              <option key={fn} value={fn}>{AGGREGATION_CONFIG[fn].label}</option>
            ))}
          </select>
        </div>

        {/* Aggregation property — only shown when requiresProperty */}
        {showAggProperty && (
          <div style={{ flex: "1 1 140px" }} data-testid="aggregation-property-field">
            <label className="ds-label" style={{ fontSize: 12, marginBottom: 4 }}>of Property</label>
            <select
              className="ds-select"
              value={rule.aggregationProperty ?? ""}
              onChange={(e) => onUpdate({ aggregationProperty: e.target.value })}
              aria-label="Aggregation property"
              data-testid="aggregation-property-select"
            >
              <option value="">Select property</option>
              {eventProperties.map((p) => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Comparison row */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ flex: "1 1 120px" }}>
          <label className="ds-label" style={{ fontSize: 12, marginBottom: 4 }}>Comparison</label>
          <select
            className="ds-select"
            value={rule.comparisonOp}
            onChange={(e) => onUpdate({ comparisonOp: e.target.value as EventComparisonOp })}
            aria-label="Comparison operator"
            data-testid="comparison-op-select"
          >
            {EVENT_COMPARISON_OPS.map((op) => (
              <option key={op} value={op}>{EVENT_COMPARISON_LABELS[op]}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: "1 1 100px" }}>
          <label className="ds-label" style={{ fontSize: 12, marginBottom: 4 }}>Value</label>
          <input
            type="number"
            className="ds-input"
            value={rule.comparisonValue}
            onChange={(e) => onUpdate({ comparisonValue: Number(e.target.value) })}
            aria-label="Comparison value"
            data-testid="comparison-value-input"
          />
        </div>
      </div>

      {/* Constraints */}
      <div style={{ marginBottom: 6 }}>
        <label className="ds-label" style={{ fontSize: 12, marginBottom: 6 }}>Constraints</label>
        {rule.constraints.map((c) => (
          <ConstraintRow
            key={c.id}
            constraint={c}
            properties={eventProperties}
            onUpdate={(updates) => onUpdateConstraint(c.id, updates)}
            onRemove={() => onRemoveConstraint(c.id)}
          />
        ))}
        <button
          type="button"
          className="ds-btn ds-btn-sm ds-btn-outline"
          onClick={onAddConstraint}
          data-testid="add-constraint-btn"
          style={{ marginTop: 4 }}
        >
          + Add Constraint
        </button>
      </div>
    </div>
  );
}
