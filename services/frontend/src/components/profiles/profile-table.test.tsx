import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { ProfileTable } from "./profile-table";

const mockQueryProfiles = vi.fn();

vi.mock("@/lib/api-client", () => ({
  BackendAPIClient: class {
    queryProfiles = mockQueryProfiles;
  },
}));

const makeProfiles = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    profile_id: `p-${i + 1}`,
    attributes: { name: `User ${i + 1}`, country: "US" },
  }));

describe("ProfileTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state when no profiles returned", async () => {
    mockQueryProfiles.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 10 });
    render(<ProfileTable projectId="proj-1" />);
    await waitFor(() => {
      expect(screen.getByText("No profiles found.")).toBeDefined();
    });
  });

  it("renders correct columns including profile_id", async () => {
    mockQueryProfiles.mockResolvedValue({
      items: makeProfiles(2),
      total: 2,
      page: 1,
      page_size: 10,
    });
    render(<ProfileTable projectId="proj-1" />);
    await waitFor(() => {
      expect(screen.getByText("profile_id")).toBeDefined();
    });
    expect(screen.getByText("p-1")).toBeDefined();
    expect(screen.getByText("p-2")).toBeDefined();
  });

  it("renders pagination info and disables Previous on first page", async () => {
    mockQueryProfiles.mockResolvedValue({
      items: makeProfiles(10),
      total: 25,
      page: 1,
      page_size: 10,
    });
    render(<ProfileTable projectId="proj-1" />);
    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 3/)).toBeDefined();
    });
    const prevBtn = screen.getByText("Previous") as HTMLButtonElement;
    expect(prevBtn.disabled).toBe(true);
    expect((screen.getByText("Next") as HTMLButtonElement).disabled).toBe(false);
  });

  it("navigates to next page on Next click", async () => {
    mockQueryProfiles.mockResolvedValue({
      items: makeProfiles(10),
      total: 20,
      page: 1,
      page_size: 10,
    });

    render(<ProfileTable projectId="proj-1" />);
    await waitFor(() => {
      expect(screen.getByText("Next")).toBeDefined();
    });

    mockQueryProfiles.mockResolvedValue({
      items: makeProfiles(10),
      total: 20,
      page: 2,
      page_size: 10,
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Next"));
    });

    await waitFor(() => {
      expect(mockQueryProfiles).toHaveBeenCalledTimes(2);
    });
  });

  it("calls onSelectionChange when a profile checkbox is toggled", async () => {
    const onSelectionChange = vi.fn();
    mockQueryProfiles.mockResolvedValue({
      items: makeProfiles(2),
      total: 2,
      page: 1,
      page_size: 10,
    });
    render(<ProfileTable projectId="proj-1" onSelectionChange={onSelectionChange} />);
    await waitFor(() => {
      expect(screen.getByLabelText("Select profile p-1")).toBeDefined();
    });
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Select profile p-1"));
    });
    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalledWith(["p-1"]);
    });
  });
});
