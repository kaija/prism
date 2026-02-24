import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PillTag } from "./pill-tag";

describe("PillTag", () => {
  it("renders the label text", () => {
    render(<PillTag label="Segment A" />);
    expect(screen.getByText("Segment A")).toBeInTheDocument();
  });

  it("does not render a remove button when onRemove is not provided", () => {
    render(<PillTag label="Tag" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a remove button with × when onRemove is provided", () => {
    const onRemove = vi.fn();
    render(<PillTag label="Tag" onRemove={onRemove} />);
    const btn = screen.getByRole("button", { name: "Remove Tag" });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent("×");
  });

  it("calls onRemove when the remove button is clicked", () => {
    const onRemove = vi.fn();
    render(<PillTag label="Tag" onRemove={onRemove} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove Tag" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("disables the remove button when disabled is true", () => {
    const onRemove = vi.fn();
    render(<PillTag label="Tag" onRemove={onRemove} disabled />);
    const btn = screen.getByRole("button", { name: "Remove Tag" });
    expect(btn).toBeDisabled();
  });

  it("does not call onRemove when disabled button is clicked", () => {
    const onRemove = vi.fn();
    render(<PillTag label="Tag" onRemove={onRemove} disabled />);
    fireEvent.click(screen.getByRole("button", { name: "Remove Tag" }));
    expect(onRemove).not.toHaveBeenCalled();
  });

  it("uses pill-shaped border radius", () => {
    render(<PillTag label="Pill" />);
    const pill = screen.getByText("Pill");
    expect(pill.style.borderRadius).toBe("800px");
  });
});
