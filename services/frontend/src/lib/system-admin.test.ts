import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isSystemAdmin } from "./system-admin";

describe("isSystemAdmin", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Isolate env mutations per test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // --- basic matching ---

  it("returns true when email is in the admin list", () => {
    process.env.SYSTEM_ADMIN_EMAILS = "admin@example.com";
    expect(isSystemAdmin("admin@example.com")).toBe(true);
  });

  it("returns true when email is one of several in the list", () => {
    process.env.SYSTEM_ADMIN_EMAILS = "a@x.com,b@x.com,c@x.com";
    expect(isSystemAdmin("b@x.com")).toBe(true);
  });

  it("returns false when email is not in the admin list", () => {
    process.env.SYSTEM_ADMIN_EMAILS = "admin@example.com";
    expect(isSystemAdmin("user@example.com")).toBe(false);
  });

  // --- case-insensitive ---

  it("matches case-insensitively (env upper, input lower)", () => {
    process.env.SYSTEM_ADMIN_EMAILS = "ADMIN@EXAMPLE.COM";
    expect(isSystemAdmin("admin@example.com")).toBe(true);
  });

  it("matches case-insensitively (env lower, input mixed)", () => {
    process.env.SYSTEM_ADMIN_EMAILS = "admin@example.com";
    expect(isSystemAdmin("Admin@Example.COM")).toBe(true);
  });

  // --- whitespace handling ---

  it("trims whitespace around emails in the env var", () => {
    process.env.SYSTEM_ADMIN_EMAILS = " a@x.com , b@x.com , c@x.com ";
    expect(isSystemAdmin("b@x.com")).toBe(true);
  });

  // --- empty / missing env var ---

  it("returns false when SYSTEM_ADMIN_EMAILS is not set", () => {
    delete process.env.SYSTEM_ADMIN_EMAILS;
    expect(isSystemAdmin("anyone@example.com")).toBe(false);
  });

  it("returns false when SYSTEM_ADMIN_EMAILS is empty string", () => {
    process.env.SYSTEM_ADMIN_EMAILS = "";
    expect(isSystemAdmin("anyone@example.com")).toBe(false);
  });

  it("returns false when SYSTEM_ADMIN_EMAILS is only whitespace", () => {
    process.env.SYSTEM_ADMIN_EMAILS = "   ";
    expect(isSystemAdmin("anyone@example.com")).toBe(false);
  });

  // --- reads env on every call (no caching) ---

  it("reflects env var changes between calls without restart", () => {
    process.env.SYSTEM_ADMIN_EMAILS = "first@x.com";
    expect(isSystemAdmin("first@x.com")).toBe(true);
    expect(isSystemAdmin("second@x.com")).toBe(false);

    // Simulate operator updating the env var at runtime
    process.env.SYSTEM_ADMIN_EMAILS = "second@x.com";
    expect(isSystemAdmin("first@x.com")).toBe(false);
    expect(isSystemAdmin("second@x.com")).toBe(true);
  });
});
