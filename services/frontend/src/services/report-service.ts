import prisma from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Create a new report record.
 *
 * Requirement 10.1 — persist report with unique id, name, project, type, and query params.
 */
export async function saveReport(
  projectId: string,
  name: string,
  reportType: string,
  queryParams: Record<string, unknown>
) {
  return prisma.report.create({
    data: {
      projectId,
      name,
      reportType,
      queryParams: queryParams as Prisma.InputJsonValue,
    },
  });
}

/**
 * List all reports for a project, ordered by most recently updated first.
 *
 * Requirement 10.4 — return reports belonging to the project ordered by updatedAt desc.
 */
export async function listReports(projectId: string) {
  return prisma.report.findMany({
    where: { projectId },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Get a single report by project and report id.
 *
 * Requirement 10.3 — load a saved report to restore filter configuration.
 */
export async function getReport(projectId: string, reportId: string) {
  return prisma.report.findFirst({
    where: { id: reportId, projectId },
  });
}

/**
 * Delete a report record.
 *
 * Requirement 10.5 — remove the report from the database.
 */
export async function deleteReport(projectId: string, reportId: string) {
  await prisma.report.delete({
    where: { id: reportId, projectId },
  });
}
