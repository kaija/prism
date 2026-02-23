import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EventSelector } from "./event-selector";
import type { EventSelection } from "@/types/api";

describe("EventSelector", () => {
  const allEvents: EventSelection = { type: "all" };

  it("renders the Events label", () => {
    render(<EventSelector value={allEvents} onChange={() => {}} />);
    expect(screen.getByText("Events")).toBeDefined();
  });

  it("renders All events radio checked when type is all", () => {
    render(<EventSelector value={allEvents} onChange={() => {}} />);
    const radio = screen.getByLabelText("All events") as HTMLInputElement;
    expect(radio.checked).toBe(true);
  });

  it("does not show event input when type is all", () => {
    render(<EventSelector value={allEvents} onChange={() => {}} />);
    expect(screen.queryByLabelText("Event name input")).toBeNull();
  });

  it("shows event input when type is specific", () => {
    const specific: EventSelection = { type: "specific", event_names: [] };
    render(<EventSelector value={specific} onChange={() => {}} />);
    expect(screen.getByLabelText("Event name input")).toBeDefined();
  });

  it("adds an event when Add button is clicked", () => {
    const onChange = vi.fn();
    const specific: EventSelection = { type: "specific", event_names: [] };
    render(<EventSelector value={specific} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Event name input"), {
      target: { value: "page_view" },
    });
    fireEvent.click(screen.getByText("Add"));
    expect(onChange).toHaveBeenCalledWith({
      type: "specific",
      event_names: ["page_view"],
    });
  });

  it("adds an event on Enter key", () => {
    const onChange = vi.fn();
    const specific: EventSelection = { type: "specific", event_names: [] };
    render(<EventSelector value={specific} onChange={onChange} />);
    const input = screen.getByLabelText("Event name input");
    fireEvent.change(input, { target: { value: "click" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith({
      type: "specific",
      event_names: ["click"],
    });
  });

  it("renders existing event tags", () => {
    const specific: EventSelection = {
      type: "specific",
      event_names: ["signup", "login"],
    };
    render(<EventSelector value={specific} onChange={() => {}} />);
    expect(screen.getByText("signup")).toBeDefined();
    expect(screen.getByText("login")).toBeDefined();
  });

  it("removes an event when remove button is clicked", () => {
    const onChange = vi.fn();
    const specific: EventSelection = {
      type: "specific",
      event_names: ["signup", "login"],
    };
    render(<EventSelector value={specific} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Remove signup"));
    expect(onChange).toHaveBeenCalledWith({
      type: "specific",
      event_names: ["login"],
    });
  });

  it("does not add duplicate events", () => {
    const onChange = vi.fn();
    const specific: EventSelection = {
      type: "specific",
      event_names: ["signup"],
    };
    render(<EventSelector value={specific} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Event name input"), {
      target: { value: "signup" },
    });
    fireEvent.click(screen.getByText("Add"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
