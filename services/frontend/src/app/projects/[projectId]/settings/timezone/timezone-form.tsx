"use client";

import { useActionState } from "react";
import { updateTimezoneAction } from "../actions";

interface TimezoneFormProps {
  projectId: string;
  currentTimezone: string;
  timezones: string[];
}

export function TimezoneForm({ projectId, currentTimezone, timezones }: TimezoneFormProps) {
  const [state, action, pending] = useActionState(updateTimezoneAction, {
    error: null,
    success: false,
  });

  return (
    <div className="ds-card">
      <div className="ds-card-header">Project Timezone</div>
      <div className="ds-card-body">
        <form action={action} style={{ display: "flex", gap: 10 }}>
          <input type="hidden" name="projectId" value={projectId} />
          <select
            name="timezone"
            defaultValue={currentTimezone}
            style={{
              flex: 1,
              padding: "8px 12px",
              background: "var(--bg-input)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-default)",
              fontFamily: "var(--font-family)",
              fontSize: "var(--font-base)",
              outline: "none",
            }}
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={pending}
            style={{
              padding: "8px 16px",
              background: "var(--primary)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-sm)",
              fontFamily: "var(--font-family)",
              fontSize: "var(--font-base)",
              fontWeight: 500,
              cursor: pending ? "not-allowed" : "pointer",
              opacity: pending ? 0.7 : 1,
            }}
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </form>
        {state.error && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 8 }}>{state.error}</p>}
        {state.success && <p style={{ color: "var(--success)", fontSize: 12, marginTop: 8 }}>Timezone updated.</p>}
      </div>
    </div>
  );
}
