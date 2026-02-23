"use client";

import { useActionState } from "react";
import { toggleFeatureFlagAction } from "./actions";

interface SettingsFormProps {
  projectId: string;
  featureFlags: Record<string, string>;
}

export function SettingsForm({ projectId, featureFlags }: SettingsFormProps) {
  const [flagState, flagAction, flagPending] = useActionState(
    toggleFeatureFlagAction,
    { error: null, success: false }
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Feature Flags */}
      <div className="ds-card">
        <div className="ds-card-header">Feature Flags</div>
        <div className="ds-card-body">
          {Object.keys(featureFlags).length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
              No feature flags configured.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {Object.entries(featureFlags).map(([key, value]) => (
                <div key={key} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border-color)",
                }}>
                  <span style={{ fontSize: 14, color: "var(--text-default)" }}>{key}</span>
                  <form action={flagAction}>
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="flagKey" value={key} />
                    <input type="hidden" name="flagValue" value={value === "true" ? "false" : "true"} />
                    <button
                      type="submit"
                      disabled={flagPending}
                      style={{
                        padding: "3px 12px",
                        color: "#fff",
                        border: "none",
                        borderRadius: 800,
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: flagPending ? "not-allowed" : "pointer",
                        minWidth: 48,
                        background: value === "true" ? "var(--success)" : "var(--text-muted)",
                        opacity: flagPending ? 0.7 : 1,
                      }}
                    >
                      {value === "true" ? "ON" : "OFF"}
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
          {flagState.error && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 8 }}>{flagState.error}</p>}
          {flagState.success && <p style={{ color: "var(--success)", fontSize: 12, marginTop: 8 }}>Feature flag updated.</p>}
        </div>
      </div>
    </div>
  );
}
