"use client";

import { useState } from "react";
import { useActionState } from "react";
import { inviteUserAction } from "./actions";

interface GroupOption {
  id: string;
  name: string;
  role: string;
}

type AssignMode = "role" | "group";

export function InviteUserForm({
  projectId,
  groups,
}: {
  projectId: string;
  groups: GroupOption[];
}) {
  const [state, formAction, isPending] = useActionState(inviteUserAction, {
    error: null,
    success: false,
  });
  const [assignMode, setAssignMode] = useState<AssignMode>("role");

  const selectStyle = {
    padding: "8px 12px",
    background: "var(--bg-input)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    color: "var(--text-default)",
    fontFamily: "var(--font-family)",
    fontSize: "var(--font-base)",
  };

  return (
    <div
      style={{
        marginBottom: 20,
        padding: "16px 24px",
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12, color: "var(--text-default)" }}>
        Invite User
      </h3>
      <form
        action={formAction}
        style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}
      >
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="assignMode" value={assignMode} />
        <input
          name="email"
          type="email"
          placeholder="user@example.com"
          required
          style={{
            flex: "1 1 200px",
            padding: "8px 12px",
            background: "var(--bg-input)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-default)",
            fontFamily: "var(--font-family)",
            fontSize: "var(--font-base)",
            outline: "none",
          }}
        />
        <select
          value={assignMode}
          onChange={(e) => setAssignMode(e.target.value as AssignMode)}
          style={selectStyle}
          aria-label="Assignment type"
        >
          <option value="role">Individual Role</option>
          <option value="group" disabled={groups.length === 0}>
            Assign to Group
          </option>
        </select>
        {assignMode === "role" ? (
          <select name="role" defaultValue="viewer" style={selectStyle}>
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
        ) : (
          <select name="groupId" required style={selectStyle}>
            <option value="" disabled selected>
              Select group…
            </option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.role})
              </option>
            ))}
          </select>
        )}
        <button
          type="submit"
          disabled={isPending}
          style={{
            padding: "8px 16px",
            background: "var(--primary)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-sm)",
            fontFamily: "var(--font-family)",
            fontSize: "var(--font-base)",
            fontWeight: 500,
            cursor: isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? "Inviting…" : "Invite"}
        </button>
      </form>
      {state.error && (
        <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 8 }}>{state.error}</p>
      )}
      {state.success && (
        <p style={{ color: "var(--success)", fontSize: 12, marginTop: 8 }}>User invited successfully.</p>
      )}
    </div>
  );
}
