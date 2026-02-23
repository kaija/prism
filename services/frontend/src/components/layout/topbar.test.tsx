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

  it("renders the brand name", () => {
    render(<Topbar user={defaultUser} />);
    expect(screen.getByText("Prism Analytics")).toBeDefined();
  });

  it("renders the search input", () => {
    render(<Topbar user={defaultUser} />);
    const search = screen.getByLabelText("Search");
    expect(search).toBeDefined();
    expect(search.getAttribute("type")).toBe("search");
  });

  it("renders user email", () => {
    render(<Topbar user={defaultUser} />);
    expect(screen.getByText("alice@example.com")).toBeDefined();
  });

  it("renders role badge when userRole is provided", () => {
    render(<Topbar user={defaultUser} userRole="admin" />);
    expect(screen.getByText("admin")).toBeDefined();
  });

  it("does not render role badge when userRole is omitted", () => {
    render(<Topbar user={defaultUser} />);
    expect(screen.queryByText("viewer")).toBeNull();
    expect(screen.queryByText("admin")).toBeNull();
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
    it("shows moon icon in light mode and calls onThemeToggle", () => {
      const toggle = vi.fn();
      render(<Topbar user={defaultUser} theme="light" onThemeToggle={toggle} />);
      const btn = screen.getByLabelText("Switch to dark mode");
      expect(btn.textContent).toBe("🌙");
      fireEvent.click(btn);
      expect(toggle).toHaveBeenCalledOnce();
    });

    it("shows sun icon in dark mode", () => {
      render(<Topbar user={defaultUser} theme="dark" />);
      const btn = screen.getByLabelText("Switch to light mode");
      expect(btn.textContent).toBe("☀️");
    });
  });

  it("allows typing in the search input", () => {
    render(<Topbar user={defaultUser} />);
    const search = screen.getByLabelText("Search") as HTMLInputElement;
    fireEvent.change(search, { target: { value: "test query" } });
    expect(search.value).toBe("test query");
  });
});
