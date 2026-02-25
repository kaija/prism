import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { PropertyTable } from "./property-table";
import type { SchemaProperty } from "@/types/api";

const makeProperty = (overrides: Partial<SchemaProperty> = {}): SchemaProperty => ({
  id: 1,
  project_id: "proj-1",
  schema_type: "profile",
  name: "age",
  data_type: "integer",
  description: "User age",
  property_type: "static",
  formula: null,
  created_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

describe("PropertyTable", () => {
  const noop = () => {};

  it("renders loading state", () => {
    const { container } = render(
      <PropertyTable properties={[]} loading={true} onEdit={noop} onDelete={noop} />,
    );
    expect(container.querySelector(".ds-spinner")).not.toBeNull();
  });

  it("renders empty state when no properties and not loading", () => {
    render(
      <PropertyTable properties={[]} loading={false} onEdit={noop} onDelete={noop} />,
    );
    expect(screen.getByText("尚無屬性定義。")).toBeDefined();
  });

  it("renders property rows with all columns", () => {
    const prop = makeProperty();
    render(
      <PropertyTable properties={[prop]} loading={false} onEdit={noop} onDelete={noop} />,
    );

    expect(screen.getByText("age")).toBeDefined();
    expect(screen.getByText("integer")).toBeDefined();
    expect(screen.getByText("static")).toBeDefined();
    expect(screen.getByText("User age")).toBeDefined();
  });

  it("renders dash for null description", () => {
    const prop = makeProperty({ description: null });
    render(
      <PropertyTable properties={[prop]} loading={false} onEdit={noop} onDelete={noop} />,
    );
    expect(screen.getByText("—")).toBeDefined();
  });

  it("renders ds-badge-primary for dynamic property_type", () => {
    const prop = makeProperty({ property_type: "dynamic", formula: "SUM(x)" });
    const { container } = render(
      <PropertyTable properties={[prop]} loading={false} onEdit={noop} onDelete={noop} />,
    );
    const badge = container.querySelector(".ds-badge.ds-badge-primary");
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toBe("dynamic");
  });

  it("renders ds-badge-success for static property_type", () => {
    const prop = makeProperty({ property_type: "static" });
    const { container } = render(
      <PropertyTable properties={[prop]} loading={false} onEdit={noop} onDelete={noop} />,
    );
    const badge = container.querySelector(".ds-badge.ds-badge-success");
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toBe("static");
  });

  it("calls onEdit when edit button is clicked", () => {
    const prop = makeProperty();
    const onEdit = vi.fn();
    render(
      <PropertyTable properties={[prop]} loading={false} onEdit={onEdit} onDelete={noop} />,
    );
    fireEvent.click(screen.getByLabelText("編輯 age"));
    expect(onEdit).toHaveBeenCalledWith(prop);
  });

  it("calls onDelete when delete button is clicked", () => {
    const prop = makeProperty();
    const onDelete = vi.fn();
    render(
      <PropertyTable properties={[prop]} loading={false} onEdit={noop} onDelete={onDelete} />,
    );
    fireEvent.click(screen.getByLabelText("刪除 age"));
    expect(onDelete).toHaveBeenCalledWith(prop);
  });

  it("renders multiple properties", () => {
    const props = [
      makeProperty({ id: 1, name: "age" }),
      makeProperty({ id: 2, name: "email", data_type: "string", description: "User email" }),
    ];
    render(
      <PropertyTable properties={props} loading={false} onEdit={noop} onDelete={noop} />,
    );
    expect(screen.getByText("age")).toBeDefined();
    expect(screen.getByText("email")).toBeDefined();
  });

  it("renders table headers", () => {
    const prop = makeProperty();
    render(
      <PropertyTable properties={[prop]} loading={false} onEdit={noop} onDelete={noop} />,
    );
    expect(screen.getByText("名稱")).toBeDefined();
    expect(screen.getByText("資料型別")).toBeDefined();
    expect(screen.getByText("類型")).toBeDefined();
    expect(screen.getByText("描述")).toBeDefined();
    expect(screen.getByText("操作")).toBeDefined();
  });
});
