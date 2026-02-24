import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "./sidebar";
import type { Role } from "@/types/auth";

// Mock next/navigation
import { vi } from "vitest";
vi.mock("next/navigation", () => ({
  usePathname: () => "/projects/proj-1/dashboard",
}));

describe("Sidebar", () => {
  const defaultProps = {
    projectId: "proj-1",
    userRole: "admin" as Role,
    collapsed: false,
    activeCategory: "dashboards",
  };

  it("renders the Prism logo link", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText("Prism")).toBeDefined();
  });

  it("renders the 'All Projects' footer link", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText("All Projects")).toBeDefined();
  });

  it("renders section items for the active category", () => {
    render(<Sidebar {...defaultProps} activeCategory="dashboards" />);
    expect(screen.getByText("Main")).toBeDefined();
  });

  it("renders reports section items when reports category is active", () => {
    render(<Sidebar {...defaultProps} activeCategory="reports" />);
    expect(screen.getByText("Trend")).toBeDefined();
    expect(screen.getByText("Attribution")).toBeDefined();
    expect(screen.getByText("Cohort")).toBeDefined();
  });

  it("renders configuration sections for admin role", () => {
    render(<Sidebar {...defaultProps} activeCategory="configuration" userRole="admin" />);
    expect(screen.getByText("Access")).toBeDefined();
    expect(screen.getByText("Project")).toBeDefined();
    expect(screen.getByText("Users")).toBeDefined();
    expect(screen.getByText("Settings")).toBeDefined();
  });

  it("hides configuration sections for viewer role", () => {
    render(<Sidebar {...defaultProps} activeCategory="configuration" userRole="viewer" />);
    expect(screen.queryByText("Users")).toBeNull();
    expect(screen.queryByText("Settings")).toBeNull();
  });

  it("generates correct href for nav links", () => {
    render(<Sidebar {...defaultProps} activeCategory="dashboards" />);
    const mainLink = screen.getByText("Main").closest("a");
    expect(mainLink?.getAttribute("href")).toBe("/projects/proj-1/dashboard");
  });

  it("applies collapsed transform when collapsed is true", () => {
    const { container } = render(<Sidebar {...defaultProps} collapsed={true} />);
    const aside = container.querySelector("aside.sidebar");
    expect(aside?.getAttribute("style")).toContain("translateX(-100%)");
  });

  it("applies no transform when collapsed is false", () => {
    const { container } = render(<Sidebar {...defaultProps} collapsed={false} />);
    const aside = container.querySelector("aside.sidebar");
    expect(aside?.getAttribute("style")).toContain("translateX(0)");
  });
});
