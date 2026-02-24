"use client";

import { PillTag } from "@/components/ui/pill-tag";
import { DropdownList } from "@/components/dropdown-list";
import { addTag, removeTag } from "@/lib/tag-list";
import type { SegmentOption } from "@/types/api";

export interface SegmentSelectorProps {
  value: string[];
  onChange: (segments: string[]) => void;
  availableSegments: SegmentOption[];
}

const styles = {
  container: {
    fontFamily: "var(--font-family)",
    fontSize: "var(--font-base)",
  } as React.CSSProperties,
  label: {
    display: "block",
    fontWeight: 600,
    marginBottom: 8,
    color: "var(--text-default)",
  } as React.CSSProperties,
  row: {
    display: "flex",
    flexWrap: "wrap" as const,
    alignItems: "center",
    gap: 8,
  } as React.CSSProperties,
  allProfiles: {
    fontSize: "var(--font-sm)",
    color: "var(--text-muted)",
  } as React.CSSProperties,
};

export function SegmentSelector({ value, onChange, availableSegments }: SegmentSelectorProps) {
  const available = availableSegments.filter((s) => !value.includes(s.id));

  const handleSelect = (item: { key: string }) => {
    onChange(addTag(value, item.key));
  };

  const handleRemove = (id: string) => {
    onChange(removeTag(value, id));
  };

  const labelFor = (id: string) =>
    availableSegments.find((s) => s.id === id)?.label ?? id;

  return (
    <div style={styles.container}>
      <span style={styles.label}>Performed by</span>
      <div style={styles.row}>
        {value.length === 0 ? (
          <span style={styles.allProfiles}>All Profiles</span>
        ) : (
          value.map((id) => (
            <PillTag key={id} label={labelFor(id)} onRemove={() => handleRemove(id)} />
          ))
        )}
        <DropdownList
          label="+"
          items={available.map((s) => ({ key: s.id, label: s.label }))}
          onSelect={handleSelect}
          variant="secondary"
          placeholder="No segments available"
        />
      </div>
    </div>
  );
}
