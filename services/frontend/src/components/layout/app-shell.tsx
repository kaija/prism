"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useTheme } from "@/providers/theme-provider";
import type { Role } from "@/types/auth";
import type { TopbarUser } from "@/components/layout/topbar";
import { NAV_CATEGORIES } from "./nav-config";

export interface AppShellProps {
  children: React.ReactNode;
  projectId: string;
  userRole: Role;
  user: TopbarUser;
}

/** Determine which category is active based on the current pathname */
function detectCategory(pathname: string, projectId: string): string {
  const prefix = `/projects/${projectId}/`;
  const rest = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : "";

  if (rest.startsWith("configuration")) return "configuration";
  if (rest.startsWith("settings")) return "configuration";
  if (rest.startsWith("dashboard")) return "dashboards";
  if (rest.startsWith("profiles")) return "profiles";
  if (rest.startsWith("events")) return "events";
  if (rest.startsWith("reports")) return "reports";

  return "dashboards";
}

/** Get the default route for a category */
function getDefaultRoute(categoryId: string): string {
  const cat = NAV_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return "dashboard";
  if (cat.defaultHref) return cat.defaultHref;
  if (cat.sections.length > 0 && cat.sections[0].items.length > 0) {
    return cat.sections[0].items[0].href;
  }
  return "dashboard";
}

export function AppShell({
  children,
  projectId,
  userRole,
  user,
}: AppShellProps) {
  const { theme, toggleTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const [activeCategory, setActiveCategory] = useState(() =>
    detectCategory(pathname, projectId)
  );

  // Sync category when pathname changes (e.g. browser back/forward)
  useEffect(() => {
    setActiveCategory(detectCategory(pathname, projectId));
  }, [pathname, projectId]);

  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);
    const route = getDefaultRoute(categoryId);
    router.push(`/projects/${projectId}/${route}`);
  };

  return (
    <>
      <Sidebar
        projectId={projectId}
        userRole={userRole}
        collapsed={sidebarCollapsed}
        activeCategory={activeCategory}
      />
      <main
        className="main-content"
        style={{
          marginLeft: sidebarCollapsed ? 0 : "var(--sidebar-w)",
          width: sidebarCollapsed ? "100%" : "calc(100% - var(--sidebar-w))",
        }}
      >
        <Topbar
          user={user}
          userRole={userRole}
          onThemeToggle={toggleTheme}
          theme={theme}
          projectId={projectId}
          onMenuToggle={() => setSidebarCollapsed((p) => !p)}
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
        />
        <div className="page-content">
          {children}
        </div>
      </main>
    </>
  );
}
