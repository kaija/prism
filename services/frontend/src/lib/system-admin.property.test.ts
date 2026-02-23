// Feature: analytics-frontend, Property 3: System Admin Email Matching

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fc from "fast-check";
import { isSystemAdmin } from "./system-admin";

/**
 * **Validates: Requirements 2.2**
 *
 * Property 3: System Admin Email Matching
 * For any email address and system admin email list, the `isSystemAdmin`
 * function should return true if and only if the email is present in the
 * list (case-insensitive comparison).
 */

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generates realistic email addresses. */
const emailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9._]{0,14}$/),
    fc.stringMatching(/^[a-z][a-z0-9]{0,9}$/),
    fc.constantFrom("com", "org", "net", "io", "dev")
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

/** Generates a non-empty array of unique email addresses (for the admin list). */
const emailListArb = fc
  .uniqueArray(emailArb, { minLength: 1, maxLength: 10 })
  .filter((arr) => arr.length >= 1);

/**
 * Generates a mixed-case variant of a given email string.
 * Randomly toggles each character between upper and lower case.
 */
function mixedCaseArb(email: string): fc.Arbitrary<string> {
  return fc
    .array(fc.boolean(), { minLength: email.length, maxLength: email.length })
    .map((flags) =>
      email
        .split("")
        .map((ch, i) => (flags[i] ? ch.toUpperCase() : ch.toLowerCase()))
        .join("")
    );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

// ---------------------------------------------------------------------------
// Property 3: System Admin Email Matching
// ---------------------------------------------------------------------------

describe("Property 3: System Admin Email Matching", () => {
  it(
    "positive case: for any admin list and any email IN the list (with arbitrary casing), " +
      "isSystemAdmin returns true",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          emailListArb,
          fc.nat(),
          async (adminEmails, indexSeed) => {
            // Pick one email from the list
            const idx = indexSeed % adminEmails.length;
            const chosenEmail = adminEmails[idx];

            // Set env var
            process.env.SYSTEM_ADMIN_EMAILS = adminEmails.join(",");

            // Test with exact case
            expect(isSystemAdmin(chosenEmail)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    "positive case with mixed casing: for any admin list and any email IN the list, " +
      "isSystemAdmin returns true regardless of input email casing",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          emailListArb.chain((emails) =>
            fc.nat({ max: emails.length - 1 }).chain((idx) =>
              mixedCaseArb(emails[idx]).map((mixed) => ({
                adminEmails: emails,
                mixedEmail: mixed,
              }))
            )
          ),
          async ({ adminEmails, mixedEmail }) => {
            process.env.SYSTEM_ADMIN_EMAILS = adminEmails.join(",");
            expect(isSystemAdmin(mixedEmail)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    "negative case: for any admin list and any email NOT in the list, " +
      "isSystemAdmin returns false",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          emailListArb,
          emailArb,
          async (adminEmails, testEmail) => {
            // Ensure testEmail is not in the admin list (case-insensitive)
            const adminLower = new Set(adminEmails.map((e) => e.toLowerCase()));
            fc.pre(!adminLower.has(testEmail.toLowerCase()));

            process.env.SYSTEM_ADMIN_EMAILS = adminEmails.join(",");
            expect(isSystemAdmin(testEmail)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    "mixed-case env list: for any admin list with arbitrary casing in the env var, " +
      "membership check is still correct",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          emailListArb.chain((emails) =>
            fc
              .tuple(
                // Generate mixed-case versions of each email for the env var
                ...emails.map((e) => mixedCaseArb(e))
              )
              .map((mixedList) => ({
                originalEmails: emails,
                mixedEnvList: mixedList,
              }))
          ),
          fc.nat(),
          async ({ originalEmails, mixedEnvList }, indexSeed) => {
            // Set env with mixed-case emails
            process.env.SYSTEM_ADMIN_EMAILS = mixedEnvList.join(",");

            // Pick one original email — should still match
            const idx = indexSeed % originalEmails.length;
            expect(isSystemAdmin(originalEmails[idx])).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    "empty/missing env: for any email, isSystemAdmin returns false when " +
      "SYSTEM_ADMIN_EMAILS is unset or empty",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          fc.constantFrom(undefined, "", "   "),
          async (email, envValue) => {
            if (envValue === undefined) {
              delete process.env.SYSTEM_ADMIN_EMAILS;
            } else {
              process.env.SYSTEM_ADMIN_EMAILS = envValue;
            }
            expect(isSystemAdmin(email)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
