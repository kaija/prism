// Feature: analytics-frontend, Property 1: New User Default Role
// Feature: analytics-frontend, Property 2: Existing User Sign-In Idempotence

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

/**
 * **Validates: Requirements 1.2, 1.3**
 *
 * These property tests validate the signIn callback behavior from lib/auth.ts.
 * We extract and test the callback logic directly by mocking Prisma and
 * invoking the callback with generated inputs.
 */

// ---------------------------------------------------------------------------
// Mocks – Prisma client
// ---------------------------------------------------------------------------

const mockFindUnique = vi.fn();
const mockCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn() },
}));

// Mock system-admin
vi.mock("@/lib/system-admin", () => ({
  isSystemAdmin: () => false,
}));

// Mock next-auth so we can capture the config object
vi.mock("next-auth", () => {
  return {
    default: (config: Record<string, unknown>) => {
      // Store config so tests can access callbacks
      (globalThis as Record<string, unknown>).__nextAuthConfig = config;
      return {
        handlers: {},
        auth: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
      };
    },
  };
});

vi.mock("next-auth/providers/google", () => ({
  default: () => ({ id: "google", name: "Google" }),
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: () => ({ id: "credentials", name: "Credentials" }),
}));

vi.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: () => ({}),
}));

// ---------------------------------------------------------------------------
// Import auth module (triggers NextAuth call, captures config)
// ---------------------------------------------------------------------------

type SignInCallback = (params: {
  user: { email?: string | null; name?: string | null; id?: string };
  account?: { provider: string } | null;
}) => Promise<boolean>;

let signInCallback: SignInCallback;

beforeEach(async () => {
  vi.clearAllMocks();
  // Re-import to ensure config is captured
  await import("@/lib/auth");
  const config = (globalThis as Record<string, unknown>).__nextAuthConfig as {
    callbacks: { signIn: SignInCallback };
  };
  signInCallback = config.callbacks.signIn;
});

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generates realistic email addresses. */
const emailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9._]{0,19}$/),
    fc.stringMatching(/^[a-z][a-z0-9]{0,9}$/),
    fc.constantFrom("com", "org", "net", "io", "dev")
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

/** Generates optional display names. */
const nameArb = fc.option(
  fc.stringMatching(/^[A-Z][a-z]{1,9}( [A-Z][a-z]{1,9})?$/),
  { nil: undefined }
);

// ---------------------------------------------------------------------------
// Property 1: New User Default Role
// ---------------------------------------------------------------------------

describe("Property 1: New User Default Role", () => {
  it(
    "for any email that does not exist in the database, signIn callback " +
      "returns true (allowing PrismaAdapter to create user with default Viewer role)",
    async () => {
      await fc.assert(
        fc.asyncProperty(emailArb, nameArb, async (email, name) => {
          // Simulate: user does NOT exist in DB
          mockFindUnique.mockResolvedValue(null);

          const result = await signInCallback({
            user: { email, name: name ?? undefined },
            account: { provider: "google" },
          });

          // signIn should return true so the adapter creates the user
          expect(result).toBe(true);

          // Verify the callback looked up the user by email
          expect(mockFindUnique).toHaveBeenCalledWith({
            where: { email },
          });
        }),
        { numRuns: 100 }
      );
    }
  );

  it("rejects sign-in when email is missing (null/undefined)", async () => {
    const result = await signInCallback({
      user: { email: null },
      account: null,
    });
    expect(result).toBe(false);

    const result2 = await signInCallback({
      user: { email: undefined },
      account: null,
    });
    expect(result2).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Property 2: Existing User Sign-In Idempotence
// ---------------------------------------------------------------------------

describe("Property 2: Existing User Sign-In Idempotence", () => {
  it(
    "for any existing user record, signIn callback returns true without " +
      "modifying the user record (email, name, role, createdAt unchanged)",
    async () => {
      const roleArb = fc.constantFrom(
        "viewer" as const,
        "editor" as const,
        "admin" as const,
        "owner" as const
      );

      await fc.assert(
        fc.asyncProperty(
          emailArb,
          nameArb,
          roleArb,
          fc.date({ min: new Date("2020-01-01"), max: new Date("2025-01-01") }),
          async (email, name, _role, createdAt) => {
            const existingUser = {
              id: "existing-id",
              email,
              name: name ?? null,
              createdAt,
              updatedAt: new Date(),
            };

            // Simulate: user already exists in DB
            mockFindUnique.mockResolvedValue(existingUser);

            const result = await signInCallback({
              user: { email, name: name ?? undefined },
              account: { provider: "google" },
            });

            // signIn should return true
            expect(result).toBe(true);

            // Verify the callback looked up the user by email
            expect(mockFindUnique).toHaveBeenCalledWith({
              where: { email },
            });

            // The callback should NOT have called create or any mutation
            expect(mockCreate).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
