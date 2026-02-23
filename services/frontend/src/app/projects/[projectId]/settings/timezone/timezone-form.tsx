"use client";

import { useRef, useState } from "react";
import { useActionState } from "react";
import { updateTimezoneAction } from "../actions";
import { DropdownList, type DropdownGroup, type DropdownItem } from "@/components/dropdown-list";

interface TimezoneFormProps {
  projectId: string;
  currentTimezone: string;
  timezonesByRegion: Record<string, string[]>;
}

export function TimezoneForm({ projectId, currentTimezone, timezonesByRegion }: TimezoneFormProps) {
  const [state, action, pending] = useActionState(updateTimezoneAction, {
    error: null,
    success: false,
  });
  const [selected, setSelected] = useState(currentTimezone);
  const formRef = useRef<HTMLFormElement>(null);

  const groups: DropdownGroup[] = Object.entries(timezonesByRegion).map(([region, zones]) => ({
    label: region,
    items: zones.map((tz) => ({ key: tz, label: tz.replace(/_/g, " ") })),
  }));

  function handleSelect(item: DropdownItem) {
    setSelected(item.key);
  }

  return (
    <div className="ds-card">
      <div className="ds-card-header">Project Timezone</div>
      <div className="ds-card-body">
        <form ref={formRef} action={action} style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="timezone" value={selected} />
          <DropdownList
            label={selected.replace(/_/g, " ")}
            groups={groups}
            onSelect={handleSelect}
          />
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
