import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SegmentSelector } from "./segment-selector";
import type { SegmentOption } from "@/types/api";

const segments: SegmentOption[] = [
  { id: "seg-1", label: "Power Users" },
  { id: "seg-2", label: "New Users" },
  { id: "seg-3", label: "Enterprise" },
];

describe("SegmentSelector", () => {
  it("renders 'All Profiles' when value is empty", () => {
    render(<SegmentSelector value={[]} onChange={() => {}} availableSegments={segments} />);
    expect(screen.getByText("All Profiles")).toBeDefined();
  });

  it("renders the 'Performed by' label", () => {
    render(<SegmentSelector value={[]} onChange={() => {}} availableSegments={segments} />);
    expect(screen.getByText("Performed by")).toBeDefined();
  });

  it("renders PillTags for selected segments", () => {
    render(
      <SegmentSelector value={["seg-1", "seg-2"]} onChange={() => {}} availableSegments={segments} />
    );
    expect(screen.getByText("Power Users")).toBeDefined();
    expect(screen.getByText("New Users")).toBeDefined();
    expect(screen.queryByText("All Profiles")).toBeNull();
  });

  it("calls onChange with added segment when selecting from dropdown", () => {
    const onChange = vi.fn();
    render(<SegmentSelector value={["seg-1"]} onChange={onChange} availableSegments={segments} />);

    // Open the dropdown
    fireEvent.click(screen.getByRole("button", { name: /\+/i }));

    // Select "New Users" from the dropdown
    fireEvent.click(screen.getByText("New Users"));

    expect(onChange).toHaveBeenCalledWith(["seg-1", "seg-2"]);
  });

  it("calls onChange with segment removed when clicking remove on a pill", () => {
    const onChange = vi.fn();
    render(
      <SegmentSelector value={["seg-1", "seg-2"]} onChange={onChange} availableSegments={segments} />
    );

    fireEvent.click(screen.getByLabelText("Remove Power Users"));

    expect(onChange).toHaveBeenCalledWith(["seg-2"]);
  });

  it("does not show already-selected segments in the dropdown", () => {
    render(
      <SegmentSelector value={["seg-1", "seg-2"]} onChange={() => {}} availableSegments={segments} />
    );

    fireEvent.click(screen.getByRole("button", { name: /\+/i }));

    expect(screen.queryByRole("option", { name: "Power Users" })).toBeNull();
    expect(screen.queryByRole("option", { name: "New Users" })).toBeNull();
    expect(screen.getByText("Enterprise")).toBeDefined();
  });

  it("shows fallback label when segment id has no matching option", () => {
    render(
      <SegmentSelector value={["unknown-id"]} onChange={() => {}} availableSegments={segments} />
    );
    expect(screen.getByText("unknown-id")).toBeDefined();
  });
});
