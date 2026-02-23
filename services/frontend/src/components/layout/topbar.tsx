"use client";

import { useState, useRef, useEffect } from "react";
import type { Role } from "@/types/auth";
import { ROLE_HIERARCHY } from "@/types/auth";
import { NAV_CATEGORIES } from "./nav-config";

export interface TopbarUser {
  email?: string | null;
  name?: string | null;
  image?: string | null;
}

export interface TopbarProps {
  user: TopbarUser;
  userRole?: Role;
  onThemeToggle?: () => void;
  theme?: "light" | "dark";
  projectId?: string;
  onMenuToggle?: () => void;
  activeCategory?: string;
  onCategoryChange?: (categoryId: string) => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  configuration: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  ),
  dashboards: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
  ),
  profiles: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  ),
  events: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
  ),
  reports: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
  ),
};

export function Topbar({
  user,
  userRole = "viewer",
  onThemeToggle,
  theme = "dark",
  projectId,
  onMenuToggle,
  activeCategory,
  onCategoryChange,
}: TopbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isDark = theme === "dark";

  const visibleCategories = NAV_CATEGORIES.filter(
    (cat) => ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[cat.minRole]
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* Hamburger menu toggle */}
        <button className="menu-toggle" onClick={onMenuToggle} aria-label="Toggle sidebar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>

      {/* Category tabs */}
      <nav className="topbar-categories" role="tablist" aria-label="Navigation categories">
        {visibleCategories.map((cat) => (
          <button
            key={cat.id}
            role="tab"
            aria-selected={activeCategory === cat.id}
            className={`topbar-category-tab ${activeCategory === cat.id ? "active" : ""}`}
            onClick={() => onCategoryChange?.(cat.id)}
            type="button"
          >
            <span className="topbar-category-icon">{CATEGORY_ICONS[cat.id]}</span>
            <span className="topbar-category-label">{cat.label}</span>
          </button>
        ))}
      </nav>

      <div className="topbar-right">
        {/* Theme toggle */}
        <button className="theme-toggle" onClick={onThemeToggle} aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}>
          {isDark ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          )}
        </button>

        {/* User dropdown */}
        <div className="user-profile" ref={dropdownRef}>
          <button
            className="user-btn"
            onClick={() => setDropdownOpen((p) => !p)}
            aria-label="User menu"
          >
            {user.image ? (
              <img src={user.image} alt={user.name ?? "User avatar"} className="avatar" />
            ) : (
              <div className="avatar-placeholder">
                {(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
              </div>
            )}
            <span className="user-name">{user.name ?? user.email ?? "User"}</span>
          </button>

          {dropdownOpen && (
            <div className="user-dropdown">
              <div className="user-dropdown-header">
                <div className="user-dropdown-name">{user.name ?? "User"}</div>
                <div className="user-dropdown-email">{user.email}</div>
                {userRole && <span className="user-dropdown-role">{userRole}</span>}
              </div>
              <div className="user-dropdown-divider" />
              {projectId && (
                <a href="/projects" className="user-dropdown-item">Switch Project</a>
              )}
              <a href="/api/auth/signout" className="user-dropdown-item user-dropdown-item--danger">Sign Out</a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
