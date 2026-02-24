import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BackendAPIClient, APIError } from "./api-client";

const BASE_URL = "http://test-api:8000";

function mockFetch(status: number, body?: unknown, statusText?: string) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: statusText ?? "OK",
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(body ? JSON.stringify(body) : ""),
  });
}

describe("BackendAPIClient", () => {
  let client: BackendAPIClient;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    client = new BackendAPIClient(BASE_URL);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("constructor", () => {
    it("uses provided base URL", () => {
      const c = new BackendAPIClient("http://custom:9000");
      globalThis.fetch = mockFetch(200, {});
      c.getConfig("proj1");
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "http://custom:9000/projects/proj1/config",
        expect.any(Object),
      );
    });

    it("falls back to NEXT_PUBLIC_BACKEND_API_URL env var", () => {
      const original = process.env.NEXT_PUBLIC_BACKEND_API_URL;
      process.env.NEXT_PUBLIC_BACKEND_API_URL = "http://env-api:3000";
      const c = new BackendAPIClient();
      globalThis.fetch = mockFetch(200, {});
      c.getConfig("proj1");
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "http://env-api:3000/projects/proj1/config",
        expect.any(Object),
      );
      process.env.NEXT_PUBLIC_BACKEND_API_URL = original;
    });
  });

  describe("error handling", () => {
    it("throws APIError on non-ok response", async () => {
      globalThis.fetch = mockFetch(404, null, "Not Found");
      await expect(client.getConfig("proj1")).rejects.toThrow(APIError);
      await expect(client.getConfig("proj1")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("throws APIError with body message on error", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve("Bad request body"),
      });
      await expect(client.getConfig("proj1")).rejects.toThrow("Bad request body");
    });

    it("throws APIError with fallback message when body is empty", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve(""),
      });
      await expect(client.getConfig("proj1")).rejects.toThrow(
        "Request failed with status 500",
      );
    });
  });

  describe("request headers", () => {
    it("sends Content-Type application/json", async () => {
      globalThis.fetch = mockFetch(200, {});
      await client.getConfig("proj1");
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
    });
  });

  describe("getConfig", () => {
    it("fetches project config", async () => {
      const config = { timezone: "UTC", theme: "dark" };
      globalThis.fetch = mockFetch(200, config);
      const result = await client.getConfig("proj1");
      expect(result).toEqual(config);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${BASE_URL}/projects/proj1/config`,
        expect.objectContaining({ headers: expect.any(Object) }),
      );
    });
  });

  describe("setConfig", () => {
    it("sends PUT with key/value", async () => {
      globalThis.fetch = mockFetch(204);
      await client.setConfig("proj1", "timezone", "US/Eastern");
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${BASE_URL}/projects/proj1/config`,
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ key: "timezone", value: "US/Eastern" }),
        }),
      );
    });
  });

  describe("getFeatureFlags", () => {
    it("fetches feature flags", async () => {
      const flags = { dark_mode: "true", beta: "false" };
      globalThis.fetch = mockFetch(200, flags);
      const result = await client.getFeatureFlags("proj1");
      expect(result).toEqual(flags);
    });
  });

  describe("setFeatureFlag", () => {
    it("sends PUT with flag key/value", async () => {
      globalThis.fetch = mockFetch(204);
      await client.setFeatureFlag("proj1", "beta", "true");
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${BASE_URL}/projects/proj1/feature-flags`,
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ key: "beta", value: "true" }),
        }),
      );
    });
  });

  describe("submitReport", () => {
    it("posts report request and returns job response", async () => {
      const jobResponse = { job_id: "job-123", status: "queued" };
      globalThis.fetch = mockFetch(200, jobResponse);
      const request = {
        report_type: "trend" as const,
        timeframe: { type: "relative" as const, relative: "last_7_days" },
        event_selection: { type: "all" as const },
        aggregation: { function: "count" as const },
      };
      const result = await client.submitReport("proj1", request);
      expect(result).toEqual(jobResponse);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${BASE_URL}/projects/proj1/reports`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(request),
        }),
      );
    });
  });

  describe("getJobStatus", () => {
    it("fetches job status by ID", async () => {
      const status = {
        job_id: "job-123",
        status: "completed",
        result: { data: [1, 2, 3] },
        created_at: "2024-01-01T00:00:00Z",
      };
      globalThis.fetch = mockFetch(200, status);
      const result = await client.getJobStatus("job-123");
      expect(result).toEqual(status);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${BASE_URL}/jobs/job-123`,
        expect.any(Object),
      );
    });
  });

  describe("queryProfiles", () => {
    it("posts profile query and returns paginated result", async () => {
      const profiles = {
        items: [{ profile_id: "p1", attributes: { name: "Alice" } }],
        total: 1,
        page: 1,
        page_size: 10,
      };
      globalThis.fetch = mockFetch(200, profiles);
      const request = { columns: ["name"], page: 1, page_size: 10 };
      const result = await client.queryProfiles("proj1", request);
      expect(result).toEqual(profiles);
    });
  });

  describe("getEventSummary", () => {
    it("posts profile IDs and returns event summaries", async () => {
      const summary = [
        { event_name: "click", count: 42 },
        { event_name: "view", count: 100 },
      ];
      globalThis.fetch = mockFetch(200, summary);
      const result = await client.getEventSummary("proj1", ["p1", "p2"]);
      expect(result).toEqual(summary);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${BASE_URL}/projects/proj1/profiles/event-summary`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ profile_ids: ["p1", "p2"] }),
        }),
      );
    });
  });

  describe("getTimeline", () => {
    it("posts timeline request and returns buckets", async () => {
      const buckets = [
        { bucket: "2024-01-01T00:00:00Z", event_name: "click", count: 5 },
      ];
      globalThis.fetch = mockFetch(200, buckets);
      const request = {
        profile_ids: ["p1"],
        timeframe: { type: "relative" as const, relative: "last_7_days" },
        bucket_size: "day" as const,
      };
      const result = await client.getTimeline("proj1", request);
      expect(result).toEqual(buckets);
    });
  });

  describe("listTriggers", () => {
    it("fetches paginated triggers", async () => {
      const triggers = {
        items: [
          {
            rule_id: "r1",
            project_id: "proj1",
            name: "Alert",
            event_name: "error",
            action: { type: "webhook", config: { url: "https://hook.io" } },
            enabled: true,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        ],
        total: 1,
        page: 1,
        page_size: 20,
      };
      globalThis.fetch = mockFetch(200, triggers);
      const result = await client.listTriggers("proj1", 1, 20);
      expect(result).toEqual(triggers);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${BASE_URL}/projects/proj1/triggers?page=1&page_size=20`,
        expect.any(Object),
      );
    });
  });

  describe("createTrigger", () => {
    it("posts trigger and returns created trigger", async () => {
      const trigger = {
        name: "Alert",
        event_name: "error",
        action: { type: "webhook" as const, config: { url: "https://hook.io" } },
        enabled: true,
      };
      const created = {
        ...trigger,
        rule_id: "r1",
        project_id: "proj1",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };
      globalThis.fetch = mockFetch(200, created);
      const result = await client.createTrigger("proj1", trigger);
      expect(result).toEqual(created);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${BASE_URL}/projects/proj1/triggers`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(trigger),
        }),
      );
    });
  });

  describe("updateTrigger", () => {
    it("sends PUT with trigger update", async () => {
      const update = { name: "Updated Alert", enabled: false };
      const updated = {
        rule_id: "r1",
        project_id: "proj1",
        name: "Updated Alert",
        event_name: "error",
        action: { type: "webhook", config: { url: "https://hook.io" } },
        enabled: false,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      };
      globalThis.fetch = mockFetch(200, updated);
      const result = await client.updateTrigger("proj1", "r1", update);
      expect(result).toEqual(updated);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${BASE_URL}/projects/proj1/triggers/r1`,
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify(update),
        }),
      );
    });
  });

  describe("deleteTrigger", () => {
    it("sends DELETE for trigger", async () => {
      globalThis.fetch = mockFetch(204);
      await client.deleteTrigger("proj1", "r1");
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${BASE_URL}/projects/proj1/triggers/r1`,
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  describe("saveReport", () => {
    it("posts save report request and returns saved report", async () => {
      const request = {
        name: "My Trend Report",
        report_type: "trend" as const,
        query_params: { interval: "day", segments: [] },
      };
      const saved = {
        id: "rpt-1",
        project_id: "proj1",
        name: "My Trend Report",
        report_type: "trend",
        query_params: { interval: "day", segments: [] },
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };
      globalThis.fetch = mockFetch(200, saved);
      const result = await client.saveReport("proj1", request);
      expect(result).toEqual(saved);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${BASE_URL}/projects/proj1/saved-reports`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(request),
        }),
      );
    });
  });

  describe("listReports", () => {
    it("fetches all reports for a project", async () => {
      const reports = [
        {
          id: "rpt-1",
          project_id: "proj1",
          name: "Report A",
          report_type: "trend",
          query_params: {},
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
        },
        {
          id: "rpt-2",
          project_id: "proj1",
          name: "Report B",
          report_type: "cohort",
          query_params: {},
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];
      globalThis.fetch = mockFetch(200, reports);
      const result = await client.listReports("proj1");
      expect(result).toEqual(reports);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${BASE_URL}/projects/proj1/saved-reports`,
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
    });
  });

  describe("getReport", () => {
    it("fetches a single report by ID", async () => {
      const report = {
        id: "rpt-1",
        project_id: "proj1",
        name: "My Report",
        report_type: "trend",
        query_params: { interval: "week" },
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };
      globalThis.fetch = mockFetch(200, report);
      const result = await client.getReport("proj1", "rpt-1");
      expect(result).toEqual(report);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${BASE_URL}/projects/proj1/saved-reports/rpt-1`,
        expect.any(Object),
      );
    });
  });

  describe("deleteReport", () => {
    it("sends DELETE for a saved report", async () => {
      globalThis.fetch = mockFetch(204);
      await client.deleteReport("proj1", "rpt-1");
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${BASE_URL}/projects/proj1/saved-reports/rpt-1`,
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });
});
