import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar, NAV_ITEMS } from "./sidebar";
import type { Role } from "@/types/auth";

describe("Sidebar", () => {
  const defaultProps = {
    projectId: "proj-1",
    activeRoute: "dashboard",
    userRole: "viewer" as Role,
  };

  it("renders the 'All Projects' back link", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText("← All Projects")).toBeDefined();
  });

  describe("role-based nav visibility", () => {
    it("shows only viewer-level links for viewer role", () => {
      render(<Sidebar {...defaultProps} userRole="viewer" />);
      expect(screen.getByText("Dashboard")).toBeDefined();
      expect(screen.getByText("Reports")).toBeDefined();
      expect(screen.getByText("Profiles")).toBeDefined();
      expect(screen.queryByText("Settings")).toBeNull();
      expect(screen.queryByText("Users")).toBeNull();
    });

    it("shows only viewer-level links for editor role", () => {
      render(<Sidebar {...defaultProps} userRole="editor" />);
      expect(screen.getByText("Dashboard")).toBeDefined();
      expect(screen.getByText("Reports")).toBeDefined();
      expect(screen.getByText("Profiles")).toBeDefined();
      expect(screen.queryByText("Settings")).toBeNull();
      expect(screen.queryByText("Users")).toBeNull();
    });

    it("shows all links including Settings and Users for admin role", () => {
      render(<Sidebar {...defaultProps} userRole="admin" />);
      expect(screen.getByText("Dashboard")).toBeDefined();
      expect(screen.getByText("Reports")).toBeDefined();
      expect(screen.getByText("Profiles")).toBeDefined();
      expect(screen.getByText("Settings")).toBeDefined();
      expect(screen.getByText("Users")).toBeDefined();
    });

    it("shows all links for owner role", () => {
      render(<Sidebar {...defaultProps} userRole="owner" />);
      NAV_ITEMS.forEach((item) => {
        expect(screen.getByText(item.label)).toBeDefined();
      });
    });
  });

  it("generates correct href for each nav link", () => {
    render(<Sidebar {...defaultProps} userRole="owner" />);
    const dashboardLink = screen.getByText("Dashboard").closest("a");
    expect(dashboardLink?.getAttribute("href")).toBe("/projects/proj-1/dashboard");
    const usersLink = screen.getByText("Users").closest("a");
    expect(usersLink?.getAttribute("href")).toBe("/projects/proj-1/users");
  });

  it("renders mobile toggle button", () => {
    render(<Sidebar {...defaultProps} />);
    const toggle = screen.getByLabelText("Close sidebar");
    expect(toggle).toBeDefined();
  });

  it("toggles mobile sidebar state on button click", () => {
    render(<Sidebar {...defaultProps} />);
    const toggle = screen.getByLabelText("Close sidebar");
    fireEvent.click(toggle);
    // After click, collapsed = true, label changes to "Open sidebar"
    expect(screen.getByLabelText("Open sidebar")).toBeDefined();
  });
});
