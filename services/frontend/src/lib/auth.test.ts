import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock Prisma before importing auth so the module picks up the mock.
// ---------------------------------------------------------------------------
const mockFindUnique = vi.fn();
const mockPrisma = { user: { findUnique: mockFindUnique } };

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

// Mock next-auth — we capture the config object passed to NextAuth so we can
// exercise the callbacks directly without needing a real OAuth flow.
let capturedConfig: Record<string, unknown> | undefined;

vi.mock("next-auth", () => ({
  default: (config: Record<string, unknown>) => {
    capturedConfig = config;
    return {
      handlers: { GET: vi.fn(), POST: vi.fn() },
      auth: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    };
  },
}));

vi.mock("next-auth/providers/google", () => ({
  default: (opts: Record<string, unknown>) => ({ id: "google", ...opts }),
}));

vi.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: (p: unknown) => ({ __prisma: p }),
}));

// Force module evaluation so capturedConfig is populated.
await import("@/lib/auth");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getCallbacks() {
  if (!capturedConfig?.callbacks) {
    throw new Error("NextAuth config was not captured");
  }
  return capturedConfig.callbacks as {
    signIn: (args: { user: { email?: string | null } }) => Promise<boolean>;
    session: (args: {
      session: { user: { id?: string } };
      user: { id: string };
    }) => Promise<{ user: { id: string } }>;
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("auth.ts — NextAuth configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signIn callback", () => {
    it("returns true for a new user (not found in DB)", async () => {
      mockFindUnique.mockResolvedValue(null);

      const { signIn } = getCallbacks();
      const result = await signIn({ user: { email: "new@example.com" } });

      expect(result).toBe(true);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { email: "new@example.com" },
      });
    });

    it("returns true for an existing user without modifying the record", async () => {
      const existingUser = {
        id: "usr_1",
        email: "existing@example.com",
        name: "Existing",
      };
      mockFindUnique.mockResolvedValue(existingUser);

      const { signIn } = getCallbacks();
      const result = await signIn({
        user: { email: "existing@example.com" },
      });

      expect(result).toBe(true);
      // Only findUnique should have been called — no update/create.
      expect(mockFindUnique).toHaveBeenCalledTimes(1);
    });

    it("returns false when user has no email", async () => {
      const { signIn } = getCallbacks();

      expect(await signIn({ user: { email: null } })).toBe(false);
      expect(await signIn({ user: { email: undefined } })).toBe(false);
      expect(await signIn({ user: {} as { email?: string } })).toBe(false);
    });
  });

  describe("session callback", () => {
    it("attaches user.id to the session", async () => {
      const { session: sessionCb } = getCallbacks();
      const session = { user: { id: "" } };
      const user = { id: "usr_42" };

      const result = await sessionCb({ session, user });

      expect(result.user.id).toBe("usr_42");
    });
  });

  describe("NextAuth config shape", () => {
    it("uses PrismaAdapter with the prisma client", () => {
      const adapter = capturedConfig?.adapter as { __prisma: unknown } | undefined;
      expect(adapter?.__prisma).toBe(mockPrisma);
    });

    it("configures Google provider", () => {
      const providers = capturedConfig?.providers as { id: string }[];
      expect(providers).toBeDefined();
      expect(providers.some((p) => p.id === "google")).toBe(true);
    });

    it("sets custom sign-in page", () => {
      const pages = capturedConfig?.pages as { signIn: string };
      expect(pages?.signIn).toBe("/auth/signin");
    });
  });
});
