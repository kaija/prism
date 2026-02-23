import { describe, it, expect, vi, afterEach } from "vitest";
import { formatTimestamp, getProjectTimezone } from "./timezone";
import { BackendAPIClient } from "@/lib/api-client";

describe("formatTimestamp", () => {
  it("formats a timestamp in UTC", () => {
    // 2024-01-15T12:30:45.000Z
    const ts = Date.UTC(2024, 0, 15, 12, 30, 45);
    const result = formatTimestamp(ts, "UTC");
    expect(result).toContain("01/15/2024");
    expect(result).toContain("12:30:45");
  });

  it("converts timestamp to a different timezone", () => {
    // Midnight UTC on Jan 15 2024
    const ts = Date.UTC(2024, 0, 15, 0, 0, 0);
    const result = formatTimestamp(ts, "America/New_York");
    // EST is UTC-5, so midnight UTC = 7:00 PM previous day (Jan 14)
    expect(result).toContain("01/14/2024");
    expect(result).toContain("19:00:00");
  });

  it("handles Asia/Tokyo timezone (UTC+9)", () => {
    // 2024-06-01T15:00:00Z → June 2 00:00 JST
    const ts = Date.UTC(2024, 5, 1, 15, 0, 0);
    const result = formatTimestamp(ts, "Asia/Tokyo");
    expect(result).toContain("06/02/2024");
    expect(result).toContain("00:00:00");
  });

  it("throws on invalid timezone", () => {
    const ts = Date.now();
    expect(() => formatTimestamp(ts, "Invalid/Timezone")).toThrow();
  });
});

describe("getProjectTimezone", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns timezone from project config", async () => {
    const mockClient = {
      getConfig: vi.fn().mockResolvedValue({ timezone: "America/Chicago" }),
    } as unknown as BackendAPIClient;

    const tz = await getProjectTimezone("proj-1", mockClient);
    expect(tz).toBe("America/Chicago");
    expect(mockClient.getConfig).toHaveBeenCalledWith("proj-1");
  });

  it("defaults to UTC when timezone is not set in config", async () => {
    const mockClient = {
      getConfig: vi.fn().mockResolvedValue({}),
    } as unknown as BackendAPIClient;

    const tz = await getProjectTimezone("proj-2", mockClient);
    expect(tz).toBe("UTC");
  });

  it("defaults to UTC when API call fails", async () => {
    const mockClient = {
      getConfig: vi.fn().mockRejectedValue(new Error("Network error")),
    } as unknown as BackendAPIClient;

    const tz = await getProjectTimezone("proj-3", mockClient);
    expect(tz).toBe("UTC");
  });
});
