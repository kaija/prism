import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Topbar } from "./topbar";
import type { TopbarUser } from "./topbar";

describe("Topbar", () => {
  const defaultUser: TopbarUser = {
    email: "alice@example.com",
    name: "Alice",
    image: null,
  };

  it("renders category tabs", () => {
    render(<Topbar user={defaultUser} />);
    expect(screen.getByText("Dashboards")).toBeDefined();
    expect(screen.getByText("Events")).toBeDefined();
    expect(screen.getByText("Reports")).toBeDefined();
  });

  it("renders user name", () => {
    render(<Topbar user={defaultUser} />);
    expect(screen.getByText("Alice")).toBeDefined();
  });

  it("renders avatar fallback with first letter when no image", () => {
    render(<Topbar user={{ email: "bob@test.com", name: "Bob", image: null }} />);
    expect(screen.getByText("B")).toBeDefined();
  });

  it("renders avatar image when user has image", () => {
    render(
      <Topbar user={{ ...defaultUser, image: "https://img.test/a.png" }} />
    );
    const img = screen.getByAltText("Alice");
    expect(img.getAttribute("src")).toBe("https://img.test/a.png");
  });

  describe("theme toggle", () => {
    it("calls onThemeToggle when clicked in light mode", () => {
      const toggle = vi.fn();
      render(<Topbar user={defaultUser} theme="light" onThemeToggle={toggle} />);
      const btn = screen.getByLabelText("Switch to dark mode");
      fireEvent.click(btn);
      expect(toggle).toHaveBeenCalledOnce();
    });

    it("shows switch to light mode label in dark mode", () => {
      render(<Topbar user={defaultUser} theme="dark" />);
      const btn = screen.getByLabelText("Switch to light mode");
      expect(btn).toBeDefined();
    });
  });

  it("renders hamburger menu toggle", () => {
    render(<Topbar user={defaultUser} />);
    expect(screen.getByLabelText("Toggle sidebar")).toBeDefined();
  });

  it("calls onMenuToggle when hamburger is clicked", () => {
    const menuToggle = vi.fn();
    render(<Topbar user={defaultUser} onMenuToggle={menuToggle} />);
    fireEvent.click(screen.getByLabelText("Toggle sidebar"));
    expect(menuToggle).toHaveBeenCalledOnce();
  });

  it("shows user dropdown on user button click", () => {
    render(<Topbar user={defaultUser} userRole="admin" projectId="proj-1" />);
    fireEvent.click(screen.getByLabelText("User menu"));
    expect(screen.getByText("alice@example.com")).toBeDefined();
    expect(screen.getByText("admin")).toBeDefined();
  });

  it("highlights active category tab", () => {
    render(<Topbar user={defaultUser} activeCategory="reports" />);
    const reportsTab = screen.getByText("Reports").closest("button");
    expect(reportsTab?.getAttribute("aria-selected")).toBe("true");
  });

  it("calls onCategoryChange when a tab is clicked", () => {
    const onChange = vi.fn();
    render(<Topbar user={defaultUser} onCategoryChange={onChange} />);
    fireEvent.click(screen.getByText("Events"));
    expect(onChange).toHaveBeenCalledWith("events");
  });
});
