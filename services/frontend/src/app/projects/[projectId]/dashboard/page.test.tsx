import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "proj-123" }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, style }: { href: string; children: React.ReactNode; style?: React.CSSProperties }) => (
    <a href={href} style={style}>{children}</a>
  ),
}));

const mockGetConfig = vi.fn();
vi.mock("@/lib/api-client", () => ({
  BackendAPIClient: class {
    getConfig = mockGetConfig;
  },
}));

import DashboardPage from "./page";

describe("DashboardPage", () => {
  beforeEach(() => {
    mockGetConfig.mockReset();
  });

  it("renders the dashboard heading", () => {
    mockGetConfig.mockResolvedValue({});
    render(<DashboardPage />);
    expect(screen.getByText("Dashboard")).toBeDefined();
  });

  it("renders three metric cards with data from API", async () => {
    mockGetConfig.mockResolvedValue({
      total_events: "1500",
      active_users: "320",
      reports_run: "42",
    });
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("1500")).toBeDefined();
    });
    expect(screen.getByText("Total Events")).toBeDefined();
    expect(screen.getByText("Active Users")).toBeDefined();
    expect(screen.getByText("Reports Run")).toBeDefined();
    expect(screen.getByText("320")).toBeDefined();
    expect(screen.getByText("42")).toBeDefined();
  });

  it("shows 0 when config keys are missing", async () => {
    mockGetConfig.mockResolvedValue({});
    render(<DashboardPage />);
    await waitFor(() => {
      const zeros = screen.getAllByText("0");
      expect(zeros.length).toBe(3);
    });
  });

  it("shows error message when API fails", async () => {
    mockGetConfig.mockRejectedValue(new Error("Network error"));
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("Unable to load metrics")).toBeDefined();
    });
  });

  it("renders quick links to reports and profiles", () => {
    mockGetConfig.mockResolvedValue({});
    render(<DashboardPage />);
    expect(screen.getByText("Quick Links")).toBeDefined();

    const reportsLink = screen.getByText("Reports").closest("a");
    expect(reportsLink?.getAttribute("href")).toBe("/projects/proj-123/reports");

    const profilesLink = screen.getByText("Profiles").closest("a");
    expect(profilesLink?.getAttribute("href")).toBe("/projects/proj-123/profiles");
  });

  it("renders metric card labels", () => {
    mockGetConfig.mockResolvedValue({});
    render(<DashboardPage />);
    expect(screen.getByText("Total Events")).toBeDefined();
    expect(screen.getByText("Active Users")).toBeDefined();
    expect(screen.getByText("Reports Run")).toBeDefined();
  });

  it("calls getConfig with the correct projectId", () => {
    mockGetConfig.mockResolvedValue({});
    render(<DashboardPage />);
    expect(mockGetConfig).toHaveBeenCalledWith("proj-123");
  });
});
