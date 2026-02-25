"use client";

import React from "react";
import type { RuleGroupModel, ProfileRuleModel, EventRuleModel, EventConstraint } from "@/types/segment-rules";
import type { SchemaProperty } from "@/types/api";
import { ProfileRuleRow } from "./profile-rule-row";
import { EventRuleCard } from "./event-rule-card";

export interface RuleGroupViewProps {
  ruleGroup: RuleGroupModel;
  profileProperties: SchemaProperty[];
  eventProperties: SchemaProperty[];
  onToggleLogic: () => void;
  onAddProfileRule: () => void;
  onAddEventRule: () => void;
  onRemoveRule: (ruleId: string) => void;
  onUpdateRule: (ruleId: string, updates: Partial<ProfileRuleModel | EventRuleModel>) => void;
  onAddConstraint?: (eventRuleId: string) => void;
  onUpdateConstraint?: (eventRuleId: string, constraintId: string, updates: Partial<EventConstraint>) => void;
  onRemoveConstraint?: (eventRuleId: string, constraintId: string) => void;
}

export function RuleGroupView({
  ruleGroup,
  profileProperties,
  eventProperties,
  onToggleLogic,
  onAddProfileRule,
  onAddEventRule,
  onRemoveRule,
  onUpdateRule,
  onAddConstraint,
  onUpdateConstraint,
  onRemoveConstraint,
}: RuleGroupViewProps) {
  const { logic, rules } = ruleGroup;

  return (
    <div data-testid="rule-group-view">
      {/* Logic toggle */}
      <div style={{ marginBottom: 12 }}>
        <button
          type="button"
          className="ds-btn ds-btn-sm ds-btn-light"
          onClick={onToggleLogic}
          aria-label="Toggle logic operator"
          data-testid="logic-toggle-btn"
        >
          {logic} ▾
        </button>
      </div>

      {/* Rules list */}
      {rules.length === 0 ? (
        <div className="ds-empty-state" data-testid="rules-empty-state" style={{ padding: "24px 16px" }}>
          <p>尚無任何規則。請新增 Profile 或 Event 規則開始建立分群條件。</p>
        </div>
      ) : (
        <div data-testid="rules-list">
          {rules.map((rule, index) => (
            <React.Fragment key={rule.id}>
              {/* Logic label between rules */}
              {index > 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "4px 0",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--primary)",
                  }}
                  data-testid="logic-label"
                >
                  {logic}
                </div>
              )}

              {rule.type === "profile" ? (
                <ProfileRuleRow
                  rule={rule}
                  properties={profileProperties}
                  onUpdate={(updates) => onUpdateRule(rule.id, updates)}
                  onRemove={() => onRemoveRule(rule.id)}
                />
              ) : (
                <EventRuleCard
                  rule={rule as EventRuleModel}
                  eventProperties={eventProperties}
                  onUpdate={(updates) => onUpdateRule(rule.id, updates)}
                  onRemove={() => onRemoveRule(rule.id)}
                  onAddConstraint={() => onAddConstraint?.(rule.id)}
                  onUpdateConstraint={(cId, updates) => onUpdateConstraint?.(rule.id, cId, updates)}
                  onRemoveConstraint={(cId) => onRemoveConstraint?.(rule.id, cId)}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Add rule buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          type="button"
          className="ds-btn ds-btn-sm ds-btn-outline"
          onClick={onAddProfileRule}
          data-testid="add-profile-rule-btn"
        >
          + Profile Rule
        </button>
        <button
          type="button"
          className="ds-btn ds-btn-sm ds-btn-outline"
          onClick={onAddEventRule}
          data-testid="add-event-rule-btn"
        >
          + Event Rule
        </button>
      </div>
    </div>
  );
}
