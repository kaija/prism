"use client";

interface PillTagProps {
  label: string;
  onRemove?: () => void;
  disabled?: boolean;
}

export function PillTag({ label, onRemove, disabled = false }: PillTagProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        fontSize: "var(--font-sm)",
        fontFamily: "var(--font-family)",
        fontWeight: 500,
        color: "var(--primary)",
        background: "var(--primary-transparent)",
        borderRadius: 800,
        whiteSpace: "nowrap",
      }}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Remove ${label}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 18,
            height: 18,
            padding: 0,
            border: "none",
            background: "none",
            color: "var(--primary)",
            fontSize: "var(--font-base)",
            lineHeight: 1,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.4 : 0.7,
            borderRadius: "50%",
            transition: "opacity 0.15s ease",
          }}
        >
          ×
        </button>
      )}
    </span>
  );
}
