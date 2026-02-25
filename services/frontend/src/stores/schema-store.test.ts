import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useSchemaStore } from "./schema-store";
import type { SchemaProperty } from "@/types/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

beforeEach(() => {
  // Reset store state between tests
  useSchemaStore.setState({ properties: [], loading: false, error: null });
});

function mockFetchOk(body: unknown, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

function mockFetchNoContent() {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 204,
    json: () => Promise.resolve(undefined),
    text: () => Promise.resolve(""),
  });
}

function mockFetchError(status: number, message = "error") {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ detail: message }),
    text: () => Promise.resolve(message),
  });
}

function makeProperty(overrides: Partial<SchemaProperty> = {}): SchemaProperty {
  return {
    id: 1,
    project_id: "proj-1",
    schema_type: "profile",
    name: "test_prop",
    data_type: "string",
    description: null,
    property_type: "static",
    formula: null,
    created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useSchemaStore", () => {
  describe("initial state", () => {
    it("has empty properties, loading false, and no error", () => {
      const state = useSchemaStore.getState();
      expect(state.properties).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("fetchProperties", () => {
    it("loads properties and sets them in state", async () => {
      const props = [makeProperty({ id: 1 }), makeProperty({ id: 2, name: "other" })];
      mockFetchOk(props);

      await useSchemaStore.getState().fetchProperties("proj-1", "profile");

      const state = useSchemaStore.getState();
      expect(state.properties).toHaveLength(2);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("sets error on failure", async () => {
      mockFetchError(500, "Internal Server Error");

      await useSchemaStore.getState().fetchProperties("proj-1", "profile");

      const state = useSchemaStore.getState();
      expect(state.properties).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeTruthy();
    });
  });

  describe("addProperty", () => {
    it("appends created property to the array", async () => {
      const existing = makeProperty({ id: 1 });
      useSchemaStore.setState({ properties: [existing] });

      const created = makeProperty({ id: 2, name: "new_prop" });
      mockFetchOk(created);

      await useSchemaStore.getState().addProperty("proj-1", "profile", {
        name: "new_prop",
        data_type: "string",
        property_type: "static",
      });

      const state = useSchemaStore.getState();
      expect(state.properties).toHaveLength(2);
      expect(state.properties[1].name).toBe("new_prop");
      expect(state.loading).toBe(false);
    });

    it("sets error and re-throws on failure", async () => {
      mockFetchError(409, "Conflict");

      await expect(
        useSchemaStore.getState().addProperty("proj-1", "profile", {
          name: "dup",
          data_type: "string",
          property_type: "static",
        }),
      ).rejects.toThrow();

      const state = useSchemaStore.getState();
      expect(state.error).toBeTruthy();
      expect(state.loading).toBe(false);
    });
  });

  describe("updateProperty", () => {
    it("replaces the updated property in the array", async () => {
      const original = makeProperty({ id: 5, name: "old_name" });
      useSchemaStore.setState({ properties: [original] });

      const updated = makeProperty({ id: 5, name: "new_name" });
      mockFetchOk(updated);

      await useSchemaStore.getState().updateProperty("proj-1", "profile", 5, {
        name: "new_name",
      });

      const state = useSchemaStore.getState();
      expect(state.properties).toHaveLength(1);
      expect(state.properties[0].name).toBe("new_name");
      expect(state.loading).toBe(false);
    });

    it("sets error and re-throws on failure", async () => {
      useSchemaStore.setState({ properties: [makeProperty({ id: 5 })] });
      mockFetchError(422, "Validation error");

      await expect(
        useSchemaStore.getState().updateProperty("proj-1", "profile", 5, { name: "" }),
      ).rejects.toThrow();

      const state = useSchemaStore.getState();
      expect(state.error).toBeTruthy();
      expect(state.loading).toBe(false);
    });
  });

  describe("removeProperty", () => {
    it("removes the property from the array", async () => {
      const props = [makeProperty({ id: 1 }), makeProperty({ id: 2, name: "keep" })];
      useSchemaStore.setState({ properties: props });

      mockFetchNoContent();

      await useSchemaStore.getState().removeProperty("proj-1", "profile", 1);

      const state = useSchemaStore.getState();
      expect(state.properties).toHaveLength(1);
      expect(state.properties[0].id).toBe(2);
      expect(state.loading).toBe(false);
    });

    it("sets error and re-throws on failure", async () => {
      useSchemaStore.setState({ properties: [makeProperty({ id: 1 })] });
      mockFetchError(404, "Not found");

      await expect(
        useSchemaStore.getState().removeProperty("proj-1", "profile", 1),
      ).rejects.toThrow();

      const state = useSchemaStore.getState();
      expect(state.error).toBeTruthy();
      expect(state.loading).toBe(false);
      // Property should still be in the array since delete failed
      expect(state.properties).toHaveLength(1);
    });
  });
});
