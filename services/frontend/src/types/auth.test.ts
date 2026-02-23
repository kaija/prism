import { describe, it, expect } from "vitest";
import {
  hasPermission,
  ROLE_HIERARCHY,
  PERMISSION_MATRIX,
  type Role,
  type PermissionAction,
} from "./auth";

describe("ROLE_HIERARCHY", () => {
  it("orders roles from lowest to highest", () => {
    expect(ROLE_HIERARCHY.viewer).toBeLessThan(ROLE_HIERARCHY.editor);
    expect(ROLE_HIERARCHY.editor).toBeLessThan(ROLE_HIERARCHY.admin);
    expect(ROLE_HIERARCHY.admin).toBeLessThan(ROLE_HIERARCHY.owner);
  });
});

describe("PERMISSION_MATRIX", () => {
  it("maps viewer-level actions to viewer", () => {
    expect(PERMISSION_MATRIX.view_reports).toBe("viewer");
    expect(PERMISSION_MATRIX.view_profiles).toBe("viewer");
  });

  it("maps editor-level actions to editor", () => {
    expect(PERMISSION_MATRIX.edit_reports).toBe("editor");
  });

  it("maps admin-level actions to admin", () => {
    expect(PERMISSION_MATRIX.edit_project_config).toBe("admin");
    expect(PERMISSION_MATRIX.invite_users).toBe("admin");
    expect(PERMISSION_MATRIX.manage_feature_flags).toBe("admin");
    expect(PERMISSION_MATRIX.set_timezone).toBe("admin");
  });

  it("maps owner-level actions to owner", () => {
    expect(PERMISSION_MATRIX.delete_project).toBe("owner");
    expect(PERMISSION_MATRIX.create_user_groups).toBe("owner");
    expect(PERMISSION_MATRIX.assign_admin_role).toBe("owner");
  });
});

describe("hasPermission", () => {
  const allRoles: Role[] = ["viewer", "editor", "admin", "owner"];
  const allActions: PermissionAction[] = Object.keys(PERMISSION_MATRIX) as PermissionAction[];

  it("viewer can only view reports and profiles", () => {
    expect(hasPermission("viewer", "view_reports")).toBe(true);
    expect(hasPermission("viewer", "view_profiles")).toBe(true);
    expect(hasPermission("viewer", "edit_reports")).toBe(false);
    expect(hasPermission("viewer", "edit_project_config")).toBe(false);
    expect(hasPermission("viewer", "delete_project")).toBe(false);
  });

  it("editor can view and edit reports but not project config", () => {
    expect(hasPermission("editor", "view_reports")).toBe(true);
    expect(hasPermission("editor", "edit_reports")).toBe(true);
    expect(hasPermission("editor", "edit_project_config")).toBe(false);
    expect(hasPermission("editor", "invite_users")).toBe(false);
  });

  it("admin can do everything except owner-only actions", () => {
    expect(hasPermission("admin", "view_reports")).toBe(true);
    expect(hasPermission("admin", "edit_reports")).toBe(true);
    expect(hasPermission("admin", "edit_project_config")).toBe(true);
    expect(hasPermission("admin", "invite_users")).toBe(true);
    expect(hasPermission("admin", "manage_feature_flags")).toBe(true);
    expect(hasPermission("admin", "set_timezone")).toBe(true);
    expect(hasPermission("admin", "delete_project")).toBe(false);
    expect(hasPermission("admin", "create_user_groups")).toBe(false);
  });

  it("owner can do everything", () => {
    for (const action of allActions) {
      expect(hasPermission("owner", action)).toBe(true);
    }
  });

  it("higher roles always have at least the permissions of lower roles", () => {
    for (const action of allActions) {
      for (let i = 0; i < allRoles.length; i++) {
        if (hasPermission(allRoles[i], action)) {
          // Every role above should also have permission
          for (let j = i + 1; j < allRoles.length; j++) {
            expect(hasPermission(allRoles[j], action)).toBe(true);
          }
        }
      }
    }
  });
});
