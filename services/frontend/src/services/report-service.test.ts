import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock Prisma before importing the service.
// ---------------------------------------------------------------------------
const {
  mockReportCreate,
  mockReportFindMany,
  mockReportFindFirst,
  mockReportDelete,
} = vi.hoisted(() => ({
  mockReportCreate: vi.fn(),
  mockReportFindMany: vi.fn(),
  mockReportFindFirst: vi.fn(),
  mockReportDelete: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    report: {
      create: mockReportCreate,
      findMany: mockReportFindMany,
      findFirst: mockReportFindFirst,
      delete: mockReportDelete,
    },
  },
}));

import {
  saveReport,
  listReports,
  getReport,
  deleteReport,
} from "./report-service";

describe("report-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // saveReport
  // -----------------------------------------------------------------------
  describe("saveReport", () => {
    it("creates a report with the given parameters", async () => {
      const report = {
        id: "rpt1",
        projectId: "proj1",
        name: "My Trend Report",
        reportType: "trend",
        queryParams: { interval: "day", segments: [] },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockReportCreate.mockResolvedValue(report);

      const result = await saveReport("proj1", "My Trend Report", "trend", {
        interval: "day",
        segments: [],
      });

      expect(mockReportCreate).toHaveBeenCalledWith({
        data: {
          projectId: "proj1",
          name: "My Trend Report",
          reportType: "trend",
          queryParams: { interval: "day", segments: [] },
        },
      });
      expect(result).toEqual(report);
    });
  });

  // -----------------------------------------------------------------------
  // listReports
  // -----------------------------------------------------------------------
  describe("listReports", () => {
    it("returns reports ordered by updatedAt desc", async () => {
      const reports = [
        { id: "rpt2", projectId: "proj1", name: "Report B", updatedAt: new Date("2024-02-01") },
        { id: "rpt1", projectId: "proj1", name: "Report A", updatedAt: new Date("2024-01-01") },
      ];
      mockReportFindMany.mockResolvedValue(reports);

      const result = await listReports("proj1");

      expect(mockReportFindMany).toHaveBeenCalledWith({
        where: { projectId: "proj1" },
        orderBy: { updatedAt: "desc" },
      });
      expect(result).toEqual(reports);
    });

    it("returns empty array when project has no reports", async () => {
      mockReportFindMany.mockResolvedValue([]);

      const result = await listReports("proj1");
      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // getReport
  // -----------------------------------------------------------------------
  describe("getReport", () => {
    it("returns the report matching project and report id", async () => {
      const report = {
        id: "rpt1",
        projectId: "proj1",
        name: "My Report",
        reportType: "trend",
        queryParams: { interval: "week" },
      };
      mockReportFindFirst.mockResolvedValue(report);

      const result = await getReport("proj1", "rpt1");

      expect(mockReportFindFirst).toHaveBeenCalledWith({
        where: { id: "rpt1", projectId: "proj1" },
      });
      expect(result).toEqual(report);
    });

    it("returns null when report does not exist", async () => {
      mockReportFindFirst.mockResolvedValue(null);

      const result = await getReport("proj1", "nonexistent");
      expect(result).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // deleteReport
  // -----------------------------------------------------------------------
  describe("deleteReport", () => {
    it("deletes the report matching project and report id", async () => {
      mockReportDelete.mockResolvedValue({ id: "rpt1" });

      await deleteReport("proj1", "rpt1");

      expect(mockReportDelete).toHaveBeenCalledWith({
        where: { id: "rpt1", projectId: "proj1" },
      });
    });
  });
});
