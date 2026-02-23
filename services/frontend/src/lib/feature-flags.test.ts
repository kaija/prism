import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isFeatureEnabled } from "./feature-flags";

function mockFetch(status: number, body?: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(body ? JSON.stringify(body) : ""),
  });
}

describe("isFeatureEnabled", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns true when flag value is "true"', async () => {
    globalThis.fetch = mockFetch(200, { dark_mode: "true", beta: "false" });
    const result = await isFeatureEnabled("proj1", "dark_mode");
    expect(result).toBe(true);
  });

  it('returns false when flag value is "false"', async () => {
    globalThis.fetch = mockFetch(200, { dark_mode: "true", beta: "false" });
    const result = await isFeatureEnabled("proj1", "beta");
    expect(result).toBe(false);
  });

  it("returns false when flag key does not exist", async () => {
    globalThis.fetch = mockFetch(200, { dark_mode: "true" });
    const result = await isFeatureEnabled("proj1", "nonexistent");
    expect(result).toBe(false);
  });

  it("returns false when flags are empty", async () => {
    globalThis.fetch = mockFetch(200, {});
    const result = await isFeatureEnabled("proj1", "any_flag");
    expect(result).toBe(false);
  });

  it('returns false for non-"true" string values', async () => {
    globalThis.fetch = mockFetch(200, { custom: "enabled" });
    const result = await isFeatureEnabled("proj1", "custom");
    expect(result).toBe(false);
  });

  it("calls the correct API endpoint", async () => {
    globalThis.fetch = mockFetch(200, {});
    await isFeatureEnabled("my-project", "some_flag");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/projects/my-project/feature-flags"),
      expect.any(Object),
    );
  });

  it("propagates API errors", async () => {
    globalThis.fetch = mockFetch(500);
    await expect(isFeatureEnabled("proj1", "flag")).rejects.toThrow();
  });
});
