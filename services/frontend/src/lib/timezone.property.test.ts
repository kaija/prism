// Feature: analytics-frontend, Property 13: Timezone Conversion Correctness

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { formatTimestamp } from "./timezone";

/**
 * **Validates: Requirements 8.1, 8.2**
 *
 * Property-based test for timezone conversion correctness.
 * For any valid IANA timezone and Unix timestamp, formatTimestamp should
 * produce a string that, when parsed back in that timezone, yields the
 * same original timestamp (within 1-second tolerance).
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Common valid IANA timezone identifiers. */
const IANA_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Singapore",
  "Australia/Sydney",
  "Australia/Perth",
  "Pacific/Auckland",
  "Pacific/Honolulu",
  "Africa/Cairo",
  "Africa/Johannesburg",
] as const;

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generates a random IANA timezone from the list. */
const timezoneArb = fc.constantFrom(...IANA_TIMEZONES);

/**
 * Generates a random Unix timestamp in milliseconds between
 * 2000-01-01T00:00:00Z and 2030-12-31T23:59:59Z.
 */
const timestampArb = fc.integer({
  min: Date.UTC(2000, 0, 1, 0, 0, 0),
  max: Date.UTC(2030, 11, 31, 23, 59, 59),
});


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a formatted timestamp string (MM/DD/YYYY, HH:MM:SS) back to a
 * Unix timestamp in the given timezone.
 *
 * Strategy: extract date/time parts from the formatted string, then use
 * Intl.DateTimeFormat to determine the UTC offset for that wall-clock time
 * in the given timezone, and reconstruct the epoch milliseconds.
 */
function parseFormattedTimestamp(formatted: string, timezone: string): number {
  // formatTimestamp produces "MM/DD/YYYY, HH:MM:SS" (en-US, 24h)
  const match = formatted.match(
    /^(\d{2})\/(\d{2})\/(\d{4}),\s+(\d{2}):(\d{2}):(\d{2})$/,
  );
  if (!match) {
    throw new Error(`Cannot parse formatted timestamp: "${formatted}"`);
  }

  const [, month, day, year, hour, minute, second] = match.map(Number);

  // Build a UTC date from the wall-clock components, then adjust by the
  // timezone offset. We find the offset by comparing the wall-clock time
  // in the target timezone with UTC.
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute, second);

  // Get what the wall-clock time would be in the target timezone if the
  // epoch were naiveUtc. The difference tells us the offset.
  const probe = new Date(naiveUtc);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(probe);

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  const probeWallUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );

  // offset = probeWallUtc - naiveUtc (how far ahead the timezone is)
  const offset = probeWallUtc - naiveUtc;

  // The real epoch = naiveUtc - offset
  return naiveUtc - offset;
}

// ---------------------------------------------------------------------------
// Property 13: Timezone Conversion Correctness
// ---------------------------------------------------------------------------

describe("Property 13: Timezone Conversion Correctness", () => {
  it(
    "for any valid IANA timezone and Unix timestamp, formatTimestamp " +
      "produces a string that round-trips within 1-second tolerance",
    () => {
      fc.assert(
        fc.property(timestampArb, timezoneArb, (timestamp, timezone) => {
          const formatted = formatTimestamp(timestamp, timezone);

          // Parse the formatted string back to a timestamp
          const roundTripped = parseFormattedTimestamp(formatted, timezone);

          // The round-tripped timestamp should be within 1 second (1000ms)
          // of the original. The tolerance accounts for sub-second precision
          // lost during formatting (formatTimestamp only shows whole seconds).
          const diff = Math.abs(timestamp - roundTripped);
          expect(diff).toBeLessThanOrEqual(1000);
        }),
        { numRuns: 100 },
      );
    },
  );
});
