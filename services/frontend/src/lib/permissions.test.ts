import { describe, it, expect } from "vitest";
import {
  meetsRoleRequirement,
  ROUTE_PERMISSIONS,
  ROLE_HIERARCHY,
  PERMISSION_MATRIX,
  hasPermission,
} from "./permissions";
import type { Role } from "@/types/auth";

describe("permissions re-exports", () => {
  it("re-exports ROLE_HIERARCHY from types/auth", () => {
    expect(ROLE_HIERARCHY).toBeDefined();
    expect(ROLE_HIERARCHY.viewer).toBe(0);
    expect(ROLE_HIERARCHY.owner).toBe(3);
  });

  it("re-exports PERMISSION_MATRIX from types/auth", () => {
    expect(PERMISSION_MATRIX).toBeDefined();
    expect(PERMISSION_MATRIX.view_reports).toBe("viewer");
  });

  it("re-exports hasPermission from types/auth", () => {
    expect(hasPermission("admin", "edit_project_config")).toBe(true);
    expect(hasPermission("editor", "edit_project_config")).toBe(false);
  });
});

describe("meetsRoleRequirement", () => {
  const roles: Role[] = ["viewer", "editor", "admin", "owner"];

  it("returns true when user role equals required role", () => {
    for (const role of roles) {
      expect(meetsRoleRequirement(role, role)).toBe(true);
    }
  });

  it("returns true when user role is above required role", () => {
    expect(meetsRoleRequirement("owner", "viewer")).toBe(true);
    expect(meetsRoleRequirement("admin", "editor")).toBe(true);
    expect(meetsRoleRequirement("editor", "viewer")).toBe(true);
  });

  it("returns false when user role is below required role", () => {
    expect(meetsRoleRequirement("viewer", "editor")).toBe(false);
    expect(meetsRoleRequirement("editor", "admin")).toBe(false);
    expect(meetsRoleRequirement("admin", "owner")).toBe(false);
  });
});

describe("ROUTE_PERMISSIONS", () => {
  it("requires admin for settings route", () => {
    expect(ROUTE_PERMISSIONS["/projects/[projectId]/settings"]).toBe("admin");
  });

  it("requires admin for users route", () => {
    expect(ROUTE_PERMISSIONS["/projects/[projectId]/users"]).toBe("admin");
  });
});
