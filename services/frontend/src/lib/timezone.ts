import { BackendAPIClient } from "@/lib/api-client";

/**
 * Format a Unix timestamp (ms) to a localized date/time string
 * in the given IANA timezone using Intl.DateTimeFormat.
 */
export function formatTimestamp(timestamp: number, timezone: string): string {
  const date = new Date(timestamp);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return formatter.format(date);
}

/**
 * Fetch the configured timezone for a project from the Backend API.
 * Defaults to "UTC" if no timezone is configured.
 */
export async function getProjectTimezone(
  projectId: string,
  client?: BackendAPIClient,
): Promise<string> {
  const apiClient = client ?? new BackendAPIClient();
  try {
    const config = await apiClient.getConfig(projectId);
    return config.timezone ?? "UTC";
  } catch {
    return "UTC";
  }
}
