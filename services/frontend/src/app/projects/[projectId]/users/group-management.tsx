"use client";

import { useRef } from "react";
import { useActionState } from "react";
import { createGroupAction, addUserToGroupAction, removeUserFromGroupAction } from "./actions";
import { DropdownList, type DropdownItem } from "@/components/dropdown-list";

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

interface Member {
  id: string;
  userId: string;
  user: { id: string; name: string | null; email: string };
}

const inputStyle = {
  padding: "8px 12px",
  background: "var(--bg-input)",
  border: "1px solid var(--border-color)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-default)",
  fontFamily: "var(--font-family)",
  fontSize: "var(--font-base)",
};

const btnStyle = (disabled: boolean) => ({
  padding: "8px 16px",
  background: "var(--primary)",
  color: "#fff",
  border: "none",
  borderRadius: "var(--radius-sm)",
  fontFamily: "var(--font-family)",
  fontSize: "var(--font-base)",
  fontWeight: 500 as const,
  cursor: disabled ? "not-allowed" as const : "pointer" as const,
  opacity: disabled ? 0.7 : 1,
});

function AddMemberForm({ projectId, group, members }: { projectId: string; group: Group; members: Member[] }) {
  const [state, formAction, isPending] = useActionState(addUserToGroupAction, {
    error: null,
    success: false,
  });
  const formRef = useRef<HTMLFormElement>(null);
  const userIdRef = useRef<HTMLInputElement>(null);

  const memberIdsInGroup = new Set(group.members.map((m) => m.user.id));
  const available = members.filter((m) => !memberIdsInGroup.has(m.user.id));

  const dropdownItems: DropdownItem[] = available.map((m) => ({
    key: m.user.id,
    label: m.user.name ? `${m.user.name} (${m.user.email})` : m.user.email,
  }));

  function handleSelect(item: DropdownItem) {
    if (userIdRef.current && formRef.current) {
      userIdRef.current.value = item.key;
      formRef.current.requestSubmit();
    }
  }

  return (
    <div style={{ marginTop: 10 }}>
      <form ref={formRef} action={formAction}>
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="groupId" value={group.id} />
        <input type="hidden" name="userId" ref={userIdRef} value="" />
      </form>
      <DropdownList
        label={isPending ? "Adding…" : "Add member"}
        items={dropdownItems}
        onSelect={handleSelect}
        disabled={isPending || available.length === 0}
        placeholder="No available members"
      />
      {state.error && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 4 }}>{state.error}</p>}
    </div>
  );
}

function RemoveMemberButton({ projectId, groupId, userId }: { projectId: string; groupId: string; userId: string }) {
  const [state, formAction, isPending] = useActionState(removeUserFromGroupAction, {
    error: null,
    success: false,
  });

  return (
    <form action={formAction} style={{ display: "inline" }}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        disabled={isPending}
        title="Remove from group"
        style={{
          background: "none",
          border: "none",
          color: "var(--danger)",
          cursor: isPending ? "not-allowed" : "pointer",
          fontSize: 12,
          fontFamily: "var(--font-family)",
          padding: "2px 6px",
          borderRadius: "var(--radius-sm)",
          opacity: isPending ? 0.5 : 1,
        }}
      >
        {isPending ? "…" : "✕"}
      </button>
      {state.error && <span style={{ color: "var(--danger)", fontSize: 11 }}>{state.error}</span>}
    </form>
  );
}

export function GroupManagement({
  projectId,
  groups,
  members,
}: {
  projectId: string;
  groups: Group[];
  members: Member[];
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
            style={{ ...inputStyle, flex: "1 1 200px", outline: "none" }}
          />
          <select name="role" defaultValue="viewer" style={inputStyle}>
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" disabled={isPending} style={btnStyle(isPending)}>
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
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>{member.user.name ?? member.user.email}</span>
                      <RemoveMemberButton
                        projectId={projectId}
                        groupId={group.id}
                        userId={member.user.id}
                      />
                    </div>
                  ))}
                </div>
              )}
              <AddMemberForm projectId={projectId} group={group} members={members} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
