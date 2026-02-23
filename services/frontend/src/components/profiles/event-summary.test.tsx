import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { EventSummary } from "./event-summary";

const mockGetEventSummary = vi.fn();

vi.mock("@/lib/api-client", () => ({
  BackendAPIClient: class {
    getEventSummary = mockGetEventSummary;
  },
}));

describe("EventSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows prompt when no profileIds provided", () => {
    render(<EventSummary projectId="proj-1" profileIds={[]} />);
    expect(screen.getByText("Select profiles to view event summary.")).toBeDefined();
  });

  it("shows empty state when no events returned", async () => {
    mockGetEventSummary.mockResolvedValue([]);
    render(<EventSummary projectId="proj-1" profileIds={["p-1"]} />);
    await waitFor(() => {
      expect(screen.getByText("No events found for selected profiles.")).toBeDefined();
    });
  });

  it("renders event names with correct counts", async () => {
    mockGetEventSummary.mockResolvedValue([
      { event_name: "page_view", count: 1500 },
      { event_name: "click", count: 320 },
    ]);
    render(<EventSummary projectId="proj-1" profileIds={["p-1", "p-2"]} />);
    await waitFor(() => {
      expect(screen.getByText("page_view")).toBeDefined();
    });
    expect(screen.getByText("1,500")).toBeDefined();
    expect(screen.getByText("click")).toBeDefined();
    expect(screen.getByText("320")).toBeDefined();
  });

  it("displays Event Summary title", async () => {
    mockGetEventSummary.mockResolvedValue([
      { event_name: "signup", count: 42 },
    ]);
    render(<EventSummary projectId="proj-1" profileIds={["p-1"]} />);
    await waitFor(() => {
      expect(screen.getByText("Event Summary")).toBeDefined();
    });
  });
});
