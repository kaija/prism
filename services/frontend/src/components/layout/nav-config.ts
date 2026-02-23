import type { Role } from "@/types/auth";

export interface NavSubItem {
  label: string;
  href: string;
  minRole: Role;
}

export interface NavSection {
  label: string;
  items: NavSubItem[];
  minRole: Role;
}

export interface NavCategory {
  id: string;
  label: string;
  sections: NavSection[];
  minRole: Role;
  /** Override the default landing route for this category */
  defaultHref?: string;
}

/**
 * Full navigation hierarchy.
 * href values are relative to /projects/[projectId]/
 */
export const NAV_CATEGORIES: NavCategory[] = [
  {
    id: "dashboards",
    label: "Dashboards",
    minRole: "viewer",
    sections: [
      {
        label: "Dashboards",
        minRole: "viewer",
        items: [
          { label: "Main", href: "dashboard", minRole: "viewer" },
          { label: "Create New", href: "dashboard/new", minRole: "editor" },
        ],
      },
    ],
  },
  {
    id: "events",
    label: "Events",
    minRole: "viewer",
    sections: [
      {
        label: "Events",
        minRole: "viewer",
        items: [
          { label: "All", href: "events", minRole: "viewer" },
          { label: "New Group", href: "events/new-group", minRole: "editor" },
        ],
      },
    ],
  },
  {
    id: "profiles",
    label: "Profiles",
    minRole: "viewer",
    sections: [
      {
        label: "Profiles",
        minRole: "viewer",
        items: [
          { label: "All", href: "profiles", minRole: "viewer" },
          { label: "New Group", href: "profiles/new-group", minRole: "editor" },
        ],
      },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    minRole: "viewer",
    sections: [
      {
        label: "Reports",
        minRole: "viewer",
        items: [
          { label: "Trend", href: "reports/trend", minRole: "viewer" },
          { label: "Attribution", href: "reports/attribution", minRole: "viewer" },
          { label: "Cohort", href: "reports/cohort", minRole: "viewer" },
        ],
      },
    ],
  },
  {
    id: "configuration",
    label: "Configuration",
    minRole: "admin",
    sections: [
      {
        label: "Access",
        minRole: "admin",
        items: [
          { label: "Users", href: "settings/users", minRole: "admin" },
          { label: "Groups", href: "settings/groups", minRole: "admin" },
        ],
      },
      {
        label: "Project",
        minRole: "admin",
        items: [
          { label: "Settings", href: "settings", minRole: "admin" },
          { label: "Timezone", href: "settings/timezone", minRole: "admin" },
          { label: "Audit Log", href: "settings/audit-log", minRole: "admin" },
        ],
      },
    ],
    defaultHref: "configuration",
  },
];
