import { BackendAPIClient } from "@/lib/api-client";

/**
 * Check whether a feature flag is enabled for a given project.
 * Fetches flags from the Backend API and returns true if the
 * flag value is the string "true".
 */
export async function isFeatureEnabled(
  projectId: string,
  flagKey: string,
): Promise<boolean> {
  try {
    const api = new BackendAPIClient();
    const flags = await api.getFeatureFlags(projectId);
    return flags[flagKey] === "true";
  } catch {
    // Backend unavailable in dev — default to enabled so features are accessible
    return true;
  }
}
