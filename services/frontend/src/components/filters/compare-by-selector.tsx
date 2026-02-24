"use client";

import { PillTag } from "@/components/ui/pill-tag";
import { DropdownList } from "@/components/dropdown-list";
import { addTag, removeTag } from "@/lib/tag-list";
import type { DimensionOption } from "@/types/api";

export interface CompareBySelectorProps {
  value: string[];
  onChange: (dimensions: string[]) => void;
  availableDimensions: DimensionOption[];
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
};

export function CompareBySelector({ value, onChange, availableDimensions }: CompareBySelectorProps) {
  const available = availableDimensions.filter((d) => !value.includes(d.key));

  const handleSelect = (item: { key: string }) => {
    onChange(addTag(value, item.key));
  };

  const handleRemove = (key: string) => {
    onChange(removeTag(value, key));
  };

  const labelFor = (key: string) =>
    availableDimensions.find((d) => d.key === key)?.label ?? key;

  return (
    <div style={styles.container}>
      <span style={styles.label}>Compare by</span>
      <div style={styles.row}>
        {value.map((key) => (
          <PillTag key={key} label={labelFor(key)} onRemove={() => handleRemove(key)} />
        ))}
        <DropdownList
          label="+"
          items={available.map((d) => ({ key: d.key, label: d.label }))}
          onSelect={handleSelect}
          variant="secondary"
          placeholder="No dimensions available"
        />
      </div>
    </div>
  );
}
