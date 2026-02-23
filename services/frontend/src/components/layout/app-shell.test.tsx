import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppShell } from "./app-shell";
import { ThemeProvider } from "@/providers/theme-provider";
import type { TopbarUser } from "./topbar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/projects/proj-1/dashboard",
}));

function renderAppShell(overrides: Record<string, unknown> = {}) {
  const defaultUser: TopbarUser = {
    email: "alice@example.com",
    name: "Alice",
    image: null,
  };

  const props = {
    projectId: "proj-1",
    activeRoute: "dashboard",
    userRole: "admin" as const,
    user: defaultUser,
    ...overrides,
  };

  return render(
    <ThemeProvider>
      <AppShell {...props}>
        <div data-testid="child-content">Hello World</div>
      </AppShell>
    </ThemeProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.style.cssText = "";
});

describe("AppShell", () => {
  it("renders children content", () => {
    renderAppShell();
    expect(screen.getByTestId("child-content").textContent).toBe("Hello World");
  });

  it("renders the sidebar with navigation links", () => {
    renderAppShell();
    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByText("Reports")).toBeDefined();
    expect(screen.getByText("Profiles")).toBeDefined();
  });

  it("renders the topbar with brand and user info", () => {
    renderAppShell();
    expect(screen.getByText("Prism Analytics")).toBeDefined();
    expect(screen.getByText("alice@example.com")).toBeDefined();
  });

  it("renders the search input from topbar", () => {
    renderAppShell();
    expect(screen.getByLabelText("Search")).toBeDefined();
  });

  it("theme toggle in topbar switches theme", () => {
    renderAppShell();
    // Default is light mode
    const toggleBtn = screen.getByLabelText("Switch to dark mode");
    fireEvent.click(toggleBtn);
    // After toggle, should switch to dark mode
    expect(screen.getByLabelText("Switch to light mode")).toBeDefined();
  });

  it("passes userRole to sidebar for role-based nav filtering", () => {
    renderAppShell({ userRole: "viewer" });
    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.queryByText("Settings")).toBeNull();
    expect(screen.queryByText("Users")).toBeNull();
  });
});
