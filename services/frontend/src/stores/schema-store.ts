import { create } from "zustand";
import { BackendAPIClient } from "@/lib/api-client";
import type {
  SchemaProperty,
  SchemaPropertyCreate,
  SchemaPropertyUpdate,
  SchemaType,
} from "@/types/api";

export interface SchemaState {
  properties: SchemaProperty[];
  loading: boolean;
  error: string | null;

  fetchProperties: (projectId: string, schemaType: SchemaType) => Promise<void>;
  addProperty: (projectId: string, schemaType: SchemaType, data: SchemaPropertyCreate) => Promise<void>;
  updateProperty: (projectId: string, schemaType: SchemaType, propertyId: number, data: SchemaPropertyUpdate) => Promise<void>;
  removeProperty: (projectId: string, schemaType: SchemaType, propertyId: number) => Promise<void>;
}

const client = new BackendAPIClient();

export const useSchemaStore = create<SchemaState>((set) => ({
  properties: [],
  loading: false,
  error: null,

  fetchProperties: async (projectId, schemaType) => {
    set({ loading: true, error: null });
    try {
      const properties = await client.listSchemaProperties(projectId, schemaType);
      set({ properties, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load properties",
        loading: false,
      });
    }
  },

  addProperty: async (projectId, schemaType, data) => {
    set({ loading: true, error: null });
    try {
      const created = await client.createSchemaProperty(projectId, schemaType, data);
      set((state) => ({
        properties: [...state.properties, created],
        loading: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to create property",
        loading: false,
      });
      throw err;
    }
  },

  updateProperty: async (projectId, schemaType, propertyId, data) => {
    set({ loading: true, error: null });
    try {
      const updated = await client.updateSchemaProperty(projectId, schemaType, propertyId, data);
      set((state) => ({
        properties: state.properties.map((p) => (p.id === propertyId ? updated : p)),
        loading: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to update property",
        loading: false,
      });
      throw err;
    }
  },

  removeProperty: async (projectId, schemaType, propertyId) => {
    set({ loading: true, error: null });
    try {
      await client.deleteSchemaProperty(projectId, schemaType, propertyId);
      set((state) => ({
        properties: state.properties.filter((p) => p.id !== propertyId),
        loading: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to delete property",
        loading: false,
      });
      throw err;
    }
  },
}));
