"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSegmentStore } from "@/stores/segment-store";
import { RuleGroupView } from "./rule-group-view";
import { TimeframePicker } from "@/components/filters/timeframe-picker";
import type { Timeframe } from "@/types/api";

export interface SegmentRuleEditorProps {
  projectId: string;
  segmentId?: string;
}

export function SegmentRuleEditor({ projectId, segmentId }: SegmentRuleEditorProps) {
  const router = useRouter();
  const {
    form,
    saving,
    saveError,
    dslPreview,
    profileProperties,
    eventProperties,
    propertiesLoading,
    queryResult,
    queryLoading,
    queryError,
    setForm,
    updateRule,
    addProfileRule,
    addEventRule,
    removeRule,
    toggleLogic,
    addConstraint,
    updateConstraint,
    removeConstraint,
    saveSegment,
    loadProperties,
    loadSegment,
    resetForm,
    querySegment,
  } = useSegmentStore();

  const [nameError, setNameError] = useState<string | null>(null);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState(false);

  useEffect(() => {
    resetForm();
    loadProperties(projectId);
    if (segmentId) {
      loadSegment(projectId, segmentId);
    }
  }, [projectId, segmentId, resetForm, loadProperties, loadSegment]);

  const validate = useCallback((): boolean => {
    let valid = true;

    if (!form.name || form.name.trim().length === 0) {
      setNameError("Segment 名稱為必填");
      valid = false;
    } else {
      setNameError(null);
    }

    if (form.ruleGroup.rules.length === 0) {
      setRulesError("請至少新增一條規則");
      valid = false;
    } else {
      setRulesError(null);
    }

    return valid;
  }, [form.name, form.ruleGroup.rules.length]);

  const handleSave = async () => {
    if (!validate()) return;

    const success = await saveSegment(projectId, segmentId);
    if (success) {
      setSuccessToast(true);
      setTimeout(() => {
        router.push(`/projects/${projectId}/settings/segments`);
      }, 500);
    }
  };

  const handleCancel = () => {
    router.push(`/projects/${projectId}/settings/segments`);
  };

  const isEdit = !!segmentId;
  const title = isEdit ? "Edit Segment" : "Create Segment";

  return (
    <div data-testid="segment-rule-editor">
      {/* Header */}
      <div className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title">{title}</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="ds-btn ds-btn-secondary"
            onClick={handleCancel}
            disabled={saving}
            data-testid="cancel-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            className="ds-btn ds-btn-primary"
            onClick={handleSave}
            disabled={saving}
            data-testid="save-btn"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* Success toast */}
      {successToast && (
        <div className="ds-alert ds-alert-success" role="status" data-testid="success-toast">
          Segment 儲存成功！
        </div>
      )}

      {/* Save error */}
      {saveError && (
        <div className="ds-alert ds-alert-danger" role="alert" data-testid="save-error">
          {saveError}
        </div>
      )}

      {/* Name field */}
      <div className="ds-card" style={{ marginBottom: 16 }}>
        <div className="ds-card-body">
          <div className="ds-form-group">
            <label htmlFor="segment-name" className="ds-label ds-label-required">Name</label>
            <input
              id="segment-name"
              type="text"
              className={`ds-input${nameError ? " is-invalid" : ""}`}
              value={form.name}
              onChange={(e) => {
                setForm({ name: e.target.value });
                if (nameError) setNameError(null);
              }}
              placeholder="Segment name"
              maxLength={255}
              aria-invalid={!!nameError}
              aria-describedby={nameError ? "segment-name-error" : undefined}
              data-testid="segment-name-input"
            />
            {nameError && (
              <div id="segment-name-error" className="ds-field-error" data-testid="name-error">
                {nameError}
              </div>
            )}
          </div>

          <div className="ds-form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="segment-description" className="ds-label">Description</label>
            <input
              id="segment-description"
              type="text"
              className="ds-input"
              value={form.description}
              onChange={(e) => setForm({ description: e.target.value })}
              placeholder="Optional description"
              data-testid="segment-description-input"
            />
          </div>
        </div>
      </div>

      {/* Timeframe */}
      <div className="ds-card" style={{ marginBottom: 16 }}>
        <div className="ds-card-header">Timeframe</div>
        <div className="ds-card-body">
          <TimeframePicker
            value={form.timeframe as Timeframe}
            onChange={(tf) => setForm({ timeframe: tf })}
          />
        </div>
      </div>

      {/* Rule group */}
      <div className="ds-card" style={{ marginBottom: 16 }}>
        <div className="ds-card-header">Filter Rules</div>
        <div className="ds-card-body">
          {propertiesLoading ? (
            <div style={{ textAlign: "center", padding: 24 }} data-testid="properties-loading">
              <div className="ds-spinner" />
            </div>
          ) : (
            <RuleGroupView
              ruleGroup={form.ruleGroup}
              profileProperties={profileProperties}
              eventProperties={eventProperties}
              onToggleLogic={toggleLogic}
              onAddProfileRule={addProfileRule}
              onAddEventRule={addEventRule}
              onRemoveRule={removeRule}
              onUpdateRule={updateRule}
              onAddConstraint={addConstraint}
              onUpdateConstraint={updateConstraint}
              onRemoveConstraint={removeConstraint}
            />
          )}
          {rulesError && (
            <div className="ds-field-error" style={{ marginTop: 8 }} data-testid="rules-error">
              {rulesError}
            </div>
          )}
        </div>
      </div>

      {/* DSL Preview */}
      <div className="ds-card" style={{ marginBottom: 16 }}>
        <div className="ds-card-header">DSL Preview</div>
        <div className="ds-card-body">
          <pre
            style={{
              background: "var(--bg-body)",
              padding: 12,
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--font-sm)",
              overflowX: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              color: "var(--text-default)",
              minHeight: 40,
            }}
            data-testid="dsl-preview"
          >
            {dslPreview || "(No rules defined)"}
          </pre>
        </div>
      </div>

      {/* SQL Query Preview — only in edit mode */}
      {segmentId && (
        <div className="ds-card">
          <div className="ds-card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>SQL Query Preview</span>
            <button
              type="button"
              className="ds-btn ds-btn-secondary"
              style={{ padding: "4px 12px", fontSize: "var(--font-sm)" }}
              onClick={() => querySegment(projectId, segmentId)}
              disabled={queryLoading}
              data-testid="query-sql-btn"
            >
              {queryLoading ? "Querying…" : "Generate SQL"}
            </button>
          </div>
          <div className="ds-card-body">
            {queryError && (
              <div className="ds-alert ds-alert-danger" role="alert" data-testid="query-error" style={{ marginBottom: 12 }}>
                {queryError}
              </div>
            )}
            {queryResult ? (
              <div>
                <pre
                  style={{
                    background: "var(--bg-body)",
                    padding: 12,
                    borderRadius: "var(--radius-sm)",
                    fontSize: "var(--font-sm)",
                    overflowX: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    color: "var(--text-default)",
                    minHeight: 40,
                  }}
                  data-testid="sql-preview"
                >
                  {queryResult.sql}
                </pre>
                {queryResult.params.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <span style={{ fontSize: "var(--font-sm)", color: "var(--text-muted)" }}>
                      Params: [{queryResult.params.map((p) => JSON.stringify(p)).join(", ")}]
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: "var(--font-sm)" }} data-testid="sql-placeholder">
                Click &quot;Generate SQL&quot; to preview the generated DuckDB query.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
