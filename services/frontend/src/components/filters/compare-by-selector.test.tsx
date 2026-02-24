import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CompareBySelector } from "./compare-by-selector";
import type { DimensionOption } from "@/types/api";

const dimensions: DimensionOption[] = [
  { key: "country", label: "Country" },
  { key: "browser", label: "Browser" },
  { key: "os", label: "Operating System" },
];

describe("CompareBySelector", () => {
  it("renders the 'Compare by' label", () => {
    render(<CompareBySelector value={[]} onChange={() => {}} availableDimensions={dimensions} />);
    expect(screen.getByText("Compare by")).toBeDefined();
  });

  it("renders no pills when value is empty", () => {
    render(<CompareBySelector value={[]} onChange={() => {}} availableDimensions={dimensions} />);
    expect(screen.queryByLabelText(/Remove/)).toBeNull();
  });

  it("renders PillTags for selected dimensions", () => {
    render(
      <CompareBySelector value={["country", "browser"]} onChange={() => {}} availableDimensions={dimensions} />
    );
    expect(screen.getByText("Country")).toBeDefined();
    expect(screen.getByText("Browser")).toBeDefined();
  });

  it("calls onChange with added dimension when selecting from dropdown", () => {
    const onChange = vi.fn();
    render(<CompareBySelector value={["country"]} onChange={onChange} availableDimensions={dimensions} />);

    fireEvent.click(screen.getByRole("button", { name: /\+/i }));
    fireEvent.click(screen.getByText("Browser"));

    expect(onChange).toHaveBeenCalledWith(["country", "browser"]);
  });

  it("calls onChange with dimension removed when clicking remove on a pill", () => {
    const onChange = vi.fn();
    render(
      <CompareBySelector value={["country", "browser"]} onChange={onChange} availableDimensions={dimensions} />
    );

    fireEvent.click(screen.getByLabelText("Remove Country"));

    expect(onChange).toHaveBeenCalledWith(["browser"]);
  });

  it("does not show already-selected dimensions in the dropdown", () => {
    render(
      <CompareBySelector value={["country", "browser"]} onChange={() => {}} availableDimensions={dimensions} />
    );

    fireEvent.click(screen.getByRole("button", { name: /\+/i }));

    expect(screen.queryByRole("option", { name: "Country" })).toBeNull();
    expect(screen.queryByRole("option", { name: "Browser" })).toBeNull();
    expect(screen.getByText("Operating System")).toBeDefined();
  });

  it("shows fallback label when dimension key has no matching option", () => {
    render(
      <CompareBySelector value={["unknown-key"]} onChange={() => {}} availableDimensions={dimensions} />
    );
    expect(screen.getByText("unknown-key")).toBeDefined();
  });
});
