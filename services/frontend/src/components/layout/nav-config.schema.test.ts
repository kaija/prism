import { describe, it, expect } from "vitest";
import { NAV_CATEGORIES } from "./nav-config";
import type { NavCategory, NavSection, NavSubItem } from "./nav-config";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findCategory(id: string): NavCategory | undefined {
  return NAV_CATEGORIES.find((c) => c.id === id);
}

function findSection(category: NavCategory, label: string): NavSection | undefined {
  return category.sections.find((s) => s.label === label);
}

function findItem(section: NavSection, label: string): NavSubItem | undefined {
  return section.items.find((i) => i.label === label);
}

// ---------------------------------------------------------------------------
// Tests – Nav Config Schema Section
// ---------------------------------------------------------------------------

describe("nav-config – Schema section", () => {
  const configCategory = findCategory("configuration");

  it("configuration category exists", () => {
    expect(configCategory).toBeDefined();
  });

  it("configuration category contains a Schema section", () => {
    expect(configCategory).toBeDefined();
    const schemaSection = findSection(configCategory!, "Schema");
    expect(schemaSection).toBeDefined();
  });

  describe("Schema section structure", () => {
    const schemaSection = configCategory
      ? findSection(configCategory, "Schema")
      : undefined;

    it("Schema section minRole is admin", () => {
      expect(schemaSection).toBeDefined();
      expect(schemaSection!.minRole).toBe("admin");
    });

    it("has Profile Schema item with correct href", () => {
      expect(schemaSection).toBeDefined();
      const profileItem = findItem(schemaSection!, "Profile Schema");
      expect(profileItem).toBeDefined();
      expect(profileItem!.href).toBe("settings/schema/profile");
    });

    it("has Event Schema item with correct href", () => {
      expect(schemaSection).toBeDefined();
      const eventItem = findItem(schemaSection!, "Event Schema");
      expect(eventItem).toBeDefined();
      expect(eventItem!.href).toBe("settings/schema/event");
    });

    it("Profile Schema item minRole is admin", () => {
      expect(schemaSection).toBeDefined();
      const profileItem = findItem(schemaSection!, "Profile Schema");
      expect(profileItem).toBeDefined();
      expect(profileItem!.minRole).toBe("admin");
    });

    it("Event Schema item minRole is admin", () => {
      expect(schemaSection).toBeDefined();
      const eventItem = findItem(schemaSection!, "Event Schema");
      expect(eventItem).toBeDefined();
      expect(eventItem!.minRole).toBe("admin");
    });

    it("Schema section has exactly 2 items", () => {
      expect(schemaSection).toBeDefined();
      expect(schemaSection!.items).toHaveLength(2);
    });
  });
});
