import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock Prisma before importing auth so the module picks up the mock.
// ---------------------------------------------------------------------------
const mockFindUnique = vi.fn();
const mockPrisma = { user: { findUnique: mockFindUnique } };

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn() },
}));

// Mock system-admin
vi.mock("@/lib/system-admin", () => ({
  isSystemAdmin: (email: string) => email === "admin@example.com",
}));

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

vi.mock("next-auth/providers/credentials", () => ({
  default: (opts: Record<string, unknown>) => ({ id: "credentials", ...opts }),
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
    signIn: (args: { user: { email?: string | null }; account?: { provider: string } | null }) => Promise<boolean>;
    jwt: (args: { token: Record<string, unknown>; user?: { id: string } }) => Promise<Record<string, unknown>>;
    session: (args: {
      session: { user: { id?: string; email?: string | null } };
      token: Record<string, unknown>;
    }) => Promise<{ user: { id?: string; email?: string | null } }>;
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
    it("returns true for a new Google user (not found in DB)", async () => {
      mockFindUnique.mockResolvedValue(null);

      const { signIn } = getCallbacks();
      const result = await signIn({
        user: { email: "new@example.com" },
        account: { provider: "google" },
      });

      expect(result).toBe(true);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { email: "new@example.com" },
      });
    });

    it("returns true for an existing Google user without modifying the record", async () => {
      const existingUser = {
        id: "usr_1",
        email: "existing@example.com",
        name: "Existing",
      };
      mockFindUnique.mockResolvedValue(existingUser);

      const { signIn } = getCallbacks();
      const result = await signIn({
        user: { email: "existing@example.com" },
        account: { provider: "google" },
      });

      expect(result).toBe(true);
      expect(mockFindUnique).toHaveBeenCalledTimes(1);
    });

    it("returns false when user has no email", async () => {
      const { signIn } = getCallbacks();

      expect(await signIn({ user: { email: null }, account: null })).toBe(false);
      expect(await signIn({ user: { email: undefined }, account: null })).toBe(false);
      expect(await signIn({ user: {} as { email?: string }, account: null })).toBe(false);
    });

    it("returns true for credentials sign-in", async () => {
      const { signIn } = getCallbacks();
      const result = await signIn({
        user: { email: "user@example.com" },
        account: { provider: "credentials" },
      });
      expect(result).toBe(true);
    });
  });

  describe("jwt callback", () => {
    it("attaches user.id to the token on initial sign-in", async () => {
      const { jwt } = getCallbacks();
      const token = {};
      const result = await jwt({ token, user: { id: "usr_42" } });
      expect(result.id).toBe("usr_42");
    });

    it("returns token unchanged on subsequent calls", async () => {
      const { jwt } = getCallbacks();
      const token = { id: "usr_42" };
      const result = await jwt({ token });
      expect(result.id).toBe("usr_42");
    });
  });

  describe("session callback", () => {
    it("attaches token.id to the session user", async () => {
      const { session: sessionCb } = getCallbacks();
      const session = { user: { id: "", email: "test@example.com" } };
      const token = { id: "usr_42" };

      const result = await sessionCb({ session, token });

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

    it("configures Credentials provider", () => {
      const providers = capturedConfig?.providers as { id: string }[];
      expect(providers.some((p) => p.id === "credentials")).toBe(true);
    });

    it("sets custom sign-in page", () => {
      const pages = capturedConfig?.pages as { signIn: string };
      expect(pages?.signIn).toBe("/auth/signin");
    });

    it("uses JWT session strategy", () => {
      const session = capturedConfig?.session as { strategy: string };
      expect(session?.strategy).toBe("jwt");
    });
  });
});
