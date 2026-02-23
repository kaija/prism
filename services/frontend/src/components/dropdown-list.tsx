"use client";

import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface DropdownItem {
  key: string;
  label: string;
}

export interface DropdownGroup {
  label: string;
  items: DropdownItem[];
}

interface DropdownListBaseProps {
  label: string;
  onSelect: (item: DropdownItem) => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  placeholder?: string;
  icon?: ReactNode;
}

interface FlatDropdownProps extends DropdownListBaseProps {
  items: DropdownItem[];
  groups?: never;
}

interface GroupedDropdownProps extends DropdownListBaseProps {
  items?: never;
  groups: DropdownGroup[];
}

type DropdownListProps = FlatDropdownProps | GroupedDropdownProps;

function ItemRow({ item, onSelect, close }: {
  item: DropdownItem;
  onSelect: (i: DropdownItem) => void;
  close: () => void;
}) {
  return (
    <li
      role="option"
      tabIndex={0}
      onClick={() => { onSelect(item); close(); }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault(); onSelect(item); close();
        }
      }}
      style={{
        padding: "10px 16px",
        fontSize: "var(--font-base)",
        fontFamily: "var(--font-family)",
        color: "var(--text-default)",
        cursor: "pointer",
        transition: "background 0.12s ease",
        listStyle: "none",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--primary-transparent)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      {item.label}
    </li>
  );
}

export function DropdownList(props: DropdownListProps) {
  const {
    label, onSelect, variant = "primary", disabled = false, placeholder, icon,
  } = props;

  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, minWidth: 0 });

  const updatePos = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 4,
        left: rect.left,
        minWidth: rect.width,
      });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        btnRef.current && !btnRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    function onScroll() { updatePos(); }
    document.addEventListener("mousedown", onClickOutside);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", updatePos);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open, updatePos]);

  const isPrimary = variant === "primary";
  const close = () => setOpen(false);

  const hasItems = props.groups
    ? props.groups.some((g) => g.items.length > 0)
    : (props.items?.length ?? 0) > 0;

  const menu = open ? createPortal(
    <ul
      ref={menuRef}
      role="listbox"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        minWidth: pos.minWidth,
        width: "max-content",
        margin: 0,
        padding: "6px 0",
        listStyle: "none",
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-card)",
        zIndex: 9999,
        maxHeight: 300,
        overflowY: "auto",
      }}
    >
      {!hasItems && placeholder && (
        <li style={{ padding: "10px 16px", fontSize: "var(--font-base)", color: "var(--text-muted)", listStyle: "none" }}>
          {placeholder}
        </li>
      )}
      {props.groups
        ? props.groups.map((group) => (
            <li key={group.label} role="group" aria-label={group.label} style={{ listStyle: "none" }}>
              <div style={{
                padding: "8px 16px 4px",
                fontSize: "var(--font-xs)",
                fontWeight: 600,
                letterSpacing: "0.05em",
                color: "var(--text-muted)",
                textTransform: "uppercase",
              }}>
                {group.label}
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {group.items.map((item) => (
                  <ItemRow key={item.key} item={item} onSelect={onSelect} close={close} />
                ))}
              </ul>
            </li>
          ))
        : props.items?.map((item) => (
            <ItemRow key={item.key} item={item} onSelect={onSelect} close={close} />
          ))}
    </ul>,
    document.body,
  ) : null;

  return (
    <div style={{ display: "inline-block" }}>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 16px",
          fontSize: "var(--font-base)",
          fontFamily: "var(--font-family)",
          fontWeight: 500,
          color: isPrimary ? "#fff" : "var(--secondary)",
          background: isPrimary ? "var(--primary)" : "transparent",
          border: isPrimary ? "none" : "2px solid var(--secondary)",
          borderRadius: "var(--radius-sm)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          transition: "background 0.15s ease, opacity 0.15s ease",
        }}
      >
        {icon}
        {label}
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}
        >
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {menu}
    </div>
  );
}
