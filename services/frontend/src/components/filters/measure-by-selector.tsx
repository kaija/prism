"use client";

import { PillTag } from "@/components/ui/pill-tag";
import { DropdownList } from "@/components/dropdown-list";
import { addTag, enforceMinimum } from "@/lib/tag-list";
import type { MeasureMetric } from "@/types/api";

export interface MeasureBySelectorProps {
  value: MeasureMetric[];
  onChange: (metrics: MeasureMetric[]) => void;
  availableMetrics: MeasureMetric[];
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

export function MeasureBySelector({ value, onChange, availableMetrics }: MeasureBySelectorProps) {
  const selectedKeys = value.map((m) => m.key);
  const available = availableMetrics.filter((m) => !selectedKeys.includes(m.key));

  const handleSelect = (item: { key: string }) => {
    const newKeys = addTag(selectedKeys, item.key);
    if (newKeys === selectedKeys) return; // duplicate, no change
    const metric = availableMetrics.find((m) => m.key === item.key);
    if (metric) {
      onChange([...value, metric]);
    }
  };

  const handleRemove = (key: string) => {
    const newKeys = enforceMinimum(selectedKeys, key, 1);
    if (newKeys === selectedKeys) return; // minimum enforced, no change
    onChange(value.filter((m) => m.key !== key));
  };

  const isLastMetric = value.length === 1;

  return (
    <div style={styles.container}>
      <span style={styles.label}>Measure by</span>
      <div style={styles.row}>
        {value.map((metric) => (
          <PillTag
            key={metric.key}
            label={metric.label}
            onRemove={() => handleRemove(metric.key)}
            disabled={isLastMetric}
          />
        ))}
        <DropdownList
          label="+"
          items={available.map((m) => ({ key: m.key, label: m.label }))}
          onSelect={handleSelect}
          variant="secondary"
          placeholder="No metrics available"
        />
      </div>
    </div>
  );
}
