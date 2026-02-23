"use client";

import { useActionState } from "react";
import { createGroupAction } from "./actions";

interface GroupMember {
  id: string;
  user: { id: string; name: string | null; email: string };
}

interface Group {
  id: string;
  name: string;
  role: string;
  members: GroupMember[];
}

export function GroupManagement({
  projectId,
  groups,
}: {
  projectId: string;
  groups: Group[];
}) {
  const [state, formAction, isPending] = useActionState(createGroupAction, {
    error: null,
    success: false,
  });

  return (
    <section>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: "var(--text-default)" }}>
        User Groups
      </h2>

      {/* Create Group Form */}
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
        <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, color: "var(--text-default)" }}>
          Create Group
        </h3>
        <form
          action={formAction}
          style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
        >
          <input type="hidden" name="projectId" value={projectId} />
          <input
            name="groupName"
            type="text"
            placeholder="Group name"
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
            name="role"
            defaultValue="viewer"
            style={{
              padding: "8px 12px",
              background: "var(--bg-input)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-default)",
              fontFamily: "var(--font-family)",
              fontSize: "var(--font-base)",
            }}
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
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
            {isPending ? "Creating…" : "Create Group"}
          </button>
        </form>
        {state.error && (
          <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 8 }}>{state.error}</p>
        )}
        {state.success && (
          <p style={{ color: "var(--success)", fontSize: 12, marginTop: 8 }}>Group created.</p>
        )}
      </div>

      {/* Existing Groups */}
      {groups.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No groups yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {groups.map((group) => (
            <div
              key={group.id}
              style={{
                padding: "16px 24px",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-default)" }}>
                  {group.name}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    background: "var(--primary-transparent)",
                    color: "var(--primary)",
                    padding: "3px 10px",
                    borderRadius: 800,
                  }}
                >
                  {group.role}
                </span>
              </div>
              {group.members.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>
                  No members in this group.
                </p>
              ) : (
                <div style={{ fontSize: 13 }}>
                  {group.members.map((member) => (
                    <div
                      key={member.id}
                      style={{
                        padding: "6px 0",
                        borderTop: "1px solid var(--border-color)",
                        color: "var(--text-default)",
                      }}
                    >
                      {member.user.name ?? member.user.email}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
