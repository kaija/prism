// stores/segment-store.ts — Zustand store for Segment management

import { create } from "zustand";
import { BackendAPIClient } from "@/lib/api-client";
import { buildDsl } from "@/lib/segment/dsl-builder";
import { parseDslToRuleGroup } from "@/lib/segment/dsl-parser-ui";
import type {
  SegmentResponse,
  SchemaProperty,
  SegmentTimeframe,
  SegmentQueryResponse,
} from "@/types/api";
import type {
  SegmentFormModel,
  ProfileRuleModel,
  EventRuleModel,
  EventConstraint,
  LogicOp,
} from "@/types/segment-rules";

// ─── Built-in Event Properties ───────────────────────────────

export const BUILT_IN_EVENT_PROPERTIES: SchemaProperty[] = [
  {
    id: -1,
    project_id: "",
    schema_type: "event",
    name: "event_name",
    data_type: "string",
    description: "Built-in: event type name",
    property_type: "static",
    formula: null,
    created_at: "",
  },
  {
    id: -2,
    project_id: "",
    schema_type: "event",
    name: "timestamp",
    data_type: "integer",
    description: "Built-in: event timestamp (epoch ms)",
    property_type: "static",
    formula: null,
    created_at: "",
  },
  {
    id: -3,
    project_id: "",
    schema_type: "event",
    name: "profile_id",
    data_type: "string",
    description: "Built-in: profile ID",
    property_type: "static",
    formula: null,
    created_at: "",
  },
];

// ─── Helpers ─────────────────────────────────────────────────

let idCounter = 0;
function generateId(): string {
  return `rule-${++idCounter}`;
}

/** Exported for testing — reset the ID counter */
export function resetStoreIdCounter(): void {
  idCounter = 0;
}

const DEFAULT_TIMEFRAME: SegmentTimeframe = {
  type: "relative",
  relative: "last_30_days",
};

function createEmptyForm(): SegmentFormModel {
  return {
    name: "",
    description: "",
    ruleGroup: { logic: "AND", rules: [] },
    timeframe: { ...DEFAULT_TIMEFRAME },
  };
}

function createEmptyProfileRule(): ProfileRuleModel {
  return {
    type: "profile",
    id: generateId(),
    property: "",
    propertyDataType: "string",
    operator: "EQ",
    value: "",
  };
}

function createEmptyEventRule(): EventRuleModel {
  return {
    type: "event",
    id: generateId(),
    eventName: "",
    aggregation: "COUNT",
    comparisonOp: "GTE",
    comparisonValue: 1,
    constraints: [],
  };
}

function createEmptyConstraint(): EventConstraint {
  return {
    id: generateId(),
    property: "",
    propertyDataType: "string",
    operator: "EQ",
    value: "",
  };
}

/** Merge event schema properties with built-in properties */
export function mergeEventProperties(schemaProperties: SchemaProperty[]): SchemaProperty[] {
  return [...schemaProperties, ...BUILT_IN_EVENT_PROPERTIES];
}

// ─── Store Interface ─────────────────────────────────────────

export interface SegmentState {
  // 列表狀態
  segments: SegmentResponse[];
  totalSegments: number;
  listLoading: boolean;
  listError: string | null;

  // 編輯狀態
  form: SegmentFormModel;
  saving: boolean;
  saveError: string | null;
  dslPreview: string;

  // Schema 屬性
  profileProperties: SchemaProperty[];
  eventProperties: SchemaProperty[];
  propertiesLoading: boolean;

  // SQL Query 狀態
  queryResult: SegmentQueryResponse | null;
  queryLoading: boolean;
  queryError: string | null;

  // 列表操作
  fetchSegments: (projectId: string, page: number, pageSize: number) => Promise<void>;
  removeSegment: (projectId: string, segmentId: string) => Promise<void>;

  // 編輯操作
  setForm: (form: Partial<SegmentFormModel>) => void;
  updateRule: (ruleId: string, updates: Partial<ProfileRuleModel | EventRuleModel>) => void;
  addProfileRule: () => void;
  addEventRule: () => void;
  removeRule: (ruleId: string) => void;
  toggleLogic: () => void;

  // 約束條件操作
  addConstraint: (eventRuleId: string) => void;
  updateConstraint: (eventRuleId: string, constraintId: string, updates: Partial<EventConstraint>) => void;
  removeConstraint: (eventRuleId: string, constraintId: string) => void;

  // 儲存
  saveSegment: (projectId: string, segmentId?: string) => Promise<boolean>;

  // Schema 載入
  loadProperties: (projectId: string) => Promise<void>;

  // 載入既有 segment
  loadSegment: (projectId: string, segmentId: string) => Promise<void>;

  // SQL Query
  querySegment: (projectId: string, segmentId: string) => Promise<void>;

  // 重置
  resetForm: () => void;
}

// ─── Store Implementation ────────────────────────────────────

const client = new BackendAPIClient();

export const useSegmentStore = create<SegmentState>((set, get) => ({
  // ─── Initial State ───────────────────────────────────────
  segments: [],
  totalSegments: 0,
  listLoading: false,
  listError: null,

  form: createEmptyForm(),
  saving: false,
  saveError: null,
  dslPreview: "",

  profileProperties: [],
  eventProperties: [],
  propertiesLoading: false,

  queryResult: null,
  queryLoading: false,
  queryError: null,

  // ─── List Operations ─────────────────────────────────────

  fetchSegments: async (projectId, page, pageSize) => {
    set({ listLoading: true, listError: null });
    try {
      const result = await client.listSegments(projectId, page, pageSize);
      set({
        segments: result.items,
        totalSegments: result.total,
        listLoading: false,
      });
    } catch (err) {
      set({
        listError: err instanceof Error ? err.message : "Failed to load segments",
        listLoading: false,
      });
    }
  },

  removeSegment: async (projectId, segmentId) => {
    set({ listLoading: true, listError: null });
    try {
      await client.deleteSegment(projectId, segmentId);
      set((state) => ({
        segments: state.segments.filter((s) => s.segment_id !== segmentId),
        totalSegments: state.totalSegments - 1,
        listLoading: false,
      }));
    } catch (err) {
      set({
        listError: err instanceof Error ? err.message : "Failed to delete segment",
        listLoading: false,
      });
    }
  },

  // ─── Edit Operations ─────────────────────────────────────

  setForm: (updates) => {
    set((state) => {
      const newForm = { ...state.form, ...updates };
      const dslPreview = newForm.ruleGroup.rules.length > 0
        ? buildDsl(newForm.ruleGroup)
        : "";
      return { form: newForm, dslPreview };
    });
  },

  updateRule: (ruleId, updates) => {
    set((state) => {
      const newRules = state.form.ruleGroup.rules.map((rule) => {
        if (rule.id !== ruleId) return rule;
        if (rule.type === "profile") {
          return { ...rule, ...updates } as ProfileRuleModel;
        }
        return { ...rule, ...updates } as EventRuleModel;
      });
      const newForm: SegmentFormModel = {
        ...state.form,
        ruleGroup: { ...state.form.ruleGroup, rules: newRules },
      };
      const dslPreview = newRules.length > 0 ? buildDsl(newForm.ruleGroup) : "";
      return { form: newForm, dslPreview };
    });
  },

  addProfileRule: () => {
    set((state) => {
      const newRule = createEmptyProfileRule();
      const newRules = [...state.form.ruleGroup.rules, newRule];
      const newForm: SegmentFormModel = {
        ...state.form,
        ruleGroup: { ...state.form.ruleGroup, rules: newRules },
      };
      return { form: newForm };
    });
  },

  addEventRule: () => {
    set((state) => {
      const newRule = createEmptyEventRule();
      const newRules = [...state.form.ruleGroup.rules, newRule];
      const newForm: SegmentFormModel = {
        ...state.form,
        ruleGroup: { ...state.form.ruleGroup, rules: newRules },
      };
      return { form: newForm };
    });
  },

  removeRule: (ruleId) => {
    set((state) => {
      const newRules = state.form.ruleGroup.rules.filter((r) => r.id !== ruleId);
      const newForm: SegmentFormModel = {
        ...state.form,
        ruleGroup: { ...state.form.ruleGroup, rules: newRules },
      };
      const dslPreview = newRules.length > 0 ? buildDsl(newForm.ruleGroup) : "";
      return { form: newForm, dslPreview };
    });
  },

  toggleLogic: () => {
    set((state) => {
      const newLogic: LogicOp = state.form.ruleGroup.logic === "AND" ? "OR" : "AND";
      const newForm: SegmentFormModel = {
        ...state.form,
        ruleGroup: { ...state.form.ruleGroup, logic: newLogic },
      };
      const dslPreview = newForm.ruleGroup.rules.length > 0
        ? buildDsl(newForm.ruleGroup)
        : "";
      return { form: newForm, dslPreview };
    });
  },

  // ─── Constraint Operations ───────────────────────────────

  addConstraint: (eventRuleId) => {
    set((state) => {
      const newRules = state.form.ruleGroup.rules.map((rule) => {
        if (rule.id !== eventRuleId || rule.type !== "event") return rule;
        const newConstraint = createEmptyConstraint();
        return {
          ...rule,
          constraints: [...rule.constraints, newConstraint],
        };
      });
      const newForm: SegmentFormModel = {
        ...state.form,
        ruleGroup: { ...state.form.ruleGroup, rules: newRules },
      };
      const dslPreview = newRules.length > 0 ? buildDsl(newForm.ruleGroup) : "";
      return { form: newForm, dslPreview };
    });
  },

  updateConstraint: (eventRuleId, constraintId, updates) => {
    set((state) => {
      const newRules = state.form.ruleGroup.rules.map((rule) => {
        if (rule.id !== eventRuleId || rule.type !== "event") return rule;
        const newConstraints = rule.constraints.map((c) =>
          c.id === constraintId ? { ...c, ...updates } : c,
        );
        return { ...rule, constraints: newConstraints };
      });
      const newForm: SegmentFormModel = {
        ...state.form,
        ruleGroup: { ...state.form.ruleGroup, rules: newRules },
      };
      const dslPreview = newRules.length > 0 ? buildDsl(newForm.ruleGroup) : "";
      return { form: newForm, dslPreview };
    });
  },

  removeConstraint: (eventRuleId, constraintId) => {
    set((state) => {
      const newRules = state.form.ruleGroup.rules.map((rule) => {
        if (rule.id !== eventRuleId || rule.type !== "event") return rule;
        return {
          ...rule,
          constraints: rule.constraints.filter((c) => c.id !== constraintId),
        };
      });
      const newForm: SegmentFormModel = {
        ...state.form,
        ruleGroup: { ...state.form.ruleGroup, rules: newRules },
      };
      const dslPreview = newRules.length > 0 ? buildDsl(newForm.ruleGroup) : "";
      return { form: newForm, dslPreview };
    });
  },

  // ─── Save ────────────────────────────────────────────────

  saveSegment: async (projectId, segmentId?) => {
    set({ saving: true, saveError: null });
    try {
      const { form } = get();
      const dsl = buildDsl(form.ruleGroup);

      // Validate DSL
      const validation = await client.validateDsl(dsl);
      if (!validation.valid) {
        set({
          saving: false,
          saveError: validation.errors?.join(", ") ?? "DSL validation failed",
        });
        return false;
      }

      // Extract timeframe from form-level setting
      const timeframe: SegmentTimeframe = form.timeframe;

      if (segmentId) {
        await client.updateSegment(projectId, segmentId, {
          name: form.name,
          description: form.description || undefined,
          dsl,
          timeframe,
        });
      } else {
        await client.createSegment(projectId, {
          name: form.name,
          description: form.description || undefined,
          dsl,
          timeframe,
        });
      }

      set({ saving: false });
      return true;
    } catch (err) {
      set({
        saving: false,
        saveError: err instanceof Error ? err.message : "Failed to save segment",
      });
      return false;
    }
  },

  // ─── Schema Loading ──────────────────────────────────────

  loadProperties: async (projectId) => {
    set({ propertiesLoading: true });
    try {
      const [profileProps, eventProps] = await Promise.all([
        client.listSchemaProperties(projectId, "profile"),
        client.listSchemaProperties(projectId, "event"),
      ]);
      set({
        profileProperties: profileProps,
        eventProperties: mergeEventProperties(eventProps),
        propertiesLoading: false,
      });
    } catch (err) {
      set({ propertiesLoading: false });
    }
  },

  // ─── Load Existing Segment ───────────────────────────────

  loadSegment: async (projectId, segmentId) => {
    set({ listLoading: true, listError: null });
    try {
      const segment = await client.getSegment(projectId, segmentId);
      const ruleGroup = parseDslToRuleGroup(segment.dsl);
      set({
        form: {
          name: segment.name,
          description: segment.description ?? "",
          ruleGroup,
          timeframe: segment.timeframe ?? DEFAULT_TIMEFRAME,
        },
        dslPreview: segment.dsl,
        listLoading: false,
      });
    } catch (err) {
      set({
        listError: err instanceof Error ? err.message : "Failed to load segment",
        listLoading: false,
      });
    }
  },

  // ─── SQL Query ─────────────────────────────────────────────

  querySegment: async (projectId, segmentId) => {
    set({ queryLoading: true, queryError: null, queryResult: null });
    try {
      const result = await client.querySegment(projectId, segmentId);
      set({ queryResult: result, queryLoading: false });
    } catch (err) {
      set({
        queryError: err instanceof Error ? err.message : "Failed to query segment",
        queryLoading: false,
      });
    }
  },

  // ─── Reset ───────────────────────────────────────────────

  resetForm: () => {
    set({
      form: createEmptyForm(),
      saving: false,
      saveError: null,
      dslPreview: "",
      queryResult: null,
      queryLoading: false,
      queryError: null,
    });
  },
}));
