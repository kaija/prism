import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppShell } from "./app-shell";
import { ThemeProvider } from "@/providers/theme-provider";
import type { TopbarUser } from "./topbar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/projects/proj-1/dashboard",
  useRouter: () => ({ push: vi.fn() }),
}));

function renderAppShell(overrides: Record<string, unknown> = {}) {
  const defaultUser: TopbarUser = {
    email: "alice@example.com",
    name: "Alice",
    image: null,
  };

  const props = {
    projectId: "proj-1",
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
  document.documentElement.removeAttribute("data-theme");
});

describe("AppShell", () => {
  it("renders children content", () => {
    renderAppShell();
    expect(screen.getByTestId("child-content").textContent).toBe("Hello World");
  });

  it("renders the sidebar with Prism logo", () => {
    renderAppShell();
    expect(screen.getByText("Prism")).toBeDefined();
  });

  it("renders category tabs in the topbar", () => {
    renderAppShell();
    // "Dashboards" appears in both sidebar section and topbar tab
    expect(screen.getAllByText("Dashboards").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Events").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Reports").length).toBeGreaterThanOrEqual(1);
  });

  it("renders user name in the topbar", () => {
    renderAppShell();
    expect(screen.getByText("Alice")).toBeDefined();
  });

  it("theme toggle in topbar switches theme", () => {
    renderAppShell();
    // Default is dark mode in the provider
    const toggleBtn = screen.getByLabelText("Switch to light mode");
    fireEvent.click(toggleBtn);
    expect(screen.getByLabelText("Switch to dark mode")).toBeDefined();
  });

  it("renders sidebar sections for the active category", () => {
    renderAppShell();
    // Default active category is dashboards based on pathname
    expect(screen.getByText("Main")).toBeDefined();
  });
});
