import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeatureGate } from "./feature-gate";

vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: vi.fn(),
}));

import { isFeatureEnabled } from "@/lib/feature-flags";
const mockIsFeatureEnabled = vi.mocked(isFeatureEnabled);

describe("FeatureGate", () => {
  it("renders children when flag is enabled", async () => {
    mockIsFeatureEnabled.mockResolvedValue(true);

    const Component = await FeatureGate({
      projectId: "proj1",
      flagKey: "beta",
      children: <div data-testid="child">Feature Content</div>,
    });

    render(<>{Component}</>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("renders nothing when flag is disabled and no fallback", async () => {
    mockIsFeatureEnabled.mockResolvedValue(false);

    const Component = await FeatureGate({
      projectId: "proj1",
      flagKey: "beta",
      children: <div data-testid="child">Feature Content</div>,
    });

    const { container } = render(<>{Component}</>);
    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
    expect(container.innerHTML).toBe("");
  });

  it("renders fallback when flag is disabled", async () => {
    mockIsFeatureEnabled.mockResolvedValue(false);

    const Component = await FeatureGate({
      projectId: "proj1",
      flagKey: "beta",
      children: <div data-testid="child">Feature Content</div>,
      fallback: <div data-testid="fallback">Coming Soon</div>,
    });

    render(<>{Component}</>);
    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
    expect(screen.getByTestId("fallback")).toBeInTheDocument();
  });

  it("passes correct projectId and flagKey to isFeatureEnabled", async () => {
    mockIsFeatureEnabled.mockResolvedValue(true);

    await FeatureGate({
      projectId: "my-project",
      flagKey: "dark_mode",
      children: <div>Content</div>,
    });

    expect(mockIsFeatureEnabled).toHaveBeenCalledWith("my-project", "dark_mode");
  });
});
