import { isFeatureEnabled } from "@/lib/feature-flags";

interface FeatureGateProps {
  projectId: string;
  flagKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Server component that conditionally renders children based on
 * whether a feature flag is enabled for the given project.
 * Renders optional fallback (or nothing) when the flag is disabled.
 */
export async function FeatureGate({
  projectId,
  flagKey,
  children,
  fallback = null,
}: FeatureGateProps) {
  const enabled = await isFeatureEnabled(projectId, flagKey);
  return <>{enabled ? children : fallback}</>;
}
