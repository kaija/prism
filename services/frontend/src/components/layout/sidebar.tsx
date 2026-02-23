"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/types/auth";
import { ROLE_HIERARCHY } from "@/types/auth";
import { NAV_CATEGORIES } from "./nav-config";
import type { NavSection } from "./nav-config";
import { SIDEBAR_ICONS } from "./sidebar-icons";

export interface SidebarProps {
  projectId: string;
  userRole: Role;
  collapsed: boolean;
  activeCategory: string;
}

export function Sidebar({ projectId, userRole, collapsed, activeCategory }: SidebarProps) {
  const pathname = usePathname();
  const category = NAV_CATEGORIES.find((c) => c.id === activeCategory);

  const visibleSections = (category?.sections ?? []).filter(
    (s) => ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[s.minRole]
  );

  return (
    <aside
      className="sidebar"
      style={{
        transform: collapsed ? "translateX(-100%)" : "translateX(0)",
      }}
    >
      {/* Logo */}
      <div className="sidebar-header">
        <Link href={`/projects/${projectId}/dashboard`} className="sidebar-logo">
          <svg width="22" height="22" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="50,8 8,82 92,82" />
            <polygon points="50,24 20,76 80,76" />
            <polygon points="50,40 32,70 68,70" />
          </svg>
          <span>Prism</span>
        </Link>
      </div>

      {/* Sections */}
      <nav className="sidebar-menu">
        {visibleSections.map((section) => (
          <SidebarSection
            key={section.label}
            section={section}
            projectId={projectId}
            userRole={userRole}
            pathname={pathname}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <Link href="/projects" className="sidebar-footer-link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          All Projects
        </Link>
      </div>
    </aside>
  );
}

function SidebarSection({
  section,
  projectId,
  userRole,
  pathname,
}: {
  section: NavSection;
  projectId: string;
  userRole: Role;
  pathname: string;
}) {
  const visibleItems = section.items.filter(
    (item) => ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[item.minRole]
  );

  const [expanded, setExpanded] = useState<boolean>(true);

  if (visibleItems.length === 0) return null;

  return (
    <div className="sidebar-section">
      <button
        className={`sidebar-section-toggle ${expanded ? "expanded" : ""}`}
        onClick={() => setExpanded((p) => !p)}
        type="button"
      >
        <span>{section.label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="sidebar-chevron"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {expanded && (
        <ul className="sidebar-section-items">
          {visibleItems.map((item) => {
            const fullHref = `/projects/${projectId}/${item.href}`;
            // Exact match always wins. For prefix match, only activate if
            // no sibling item is a more specific (longer) match.
            const isExact = pathname === fullHref;
            const isPrefix = !isExact && pathname.startsWith(fullHref + "/");
            const hasBetterMatch = isPrefix && visibleItems.some((other) => {
              if (other.href === item.href) return false;
              const otherFull = `/projects/${projectId}/${other.href}`;
              return otherFull.length > fullHref.length &&
                (pathname === otherFull || pathname.startsWith(otherFull + "/"));
            });
            const isActive = isExact || (isPrefix && !hasBetterMatch);
            return (
              <li key={item.href} className={`menu-item ${isActive ? "active" : ""}`}>
                <Link href={fullHref}>
                  <span className="sidebar-item-icon">
                    {SIDEBAR_ICONS[item.href] ?? <span className="sidebar-item-dot" />}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
