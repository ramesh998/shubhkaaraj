import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { signSession, verifySession } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { rateLimit, resetRateLimits, clientIp } from "@/lib/rate-limit";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-test-secret-test-secret-1234";
});
afterEach(() => resetRateLimits());

describe("session", () => {
  it("round-trips a payload", async () => {
    const token = await signSession({ sub: "u1", role: "admin", tv: 3 });
    expect(await verifySession(token)).toEqual({ sub: "u1", role: "admin", tv: 3 });
  });
  it("rejects garbage, missing and tampered tokens", async () => {
    expect(await verifySession(undefined)).toBeNull();
    expect(await verifySession("abc.def.ghi")).toBeNull();
    const token = await signSession({ sub: "u1", role: "editor", tv: 0 });
    expect(await verifySession(token.slice(0, -2) + "xx")).toBeNull();
  });
  it("rejects tokens signed with another secret", async () => {
    const forged = await new SignJWT({ role: "admin", tv: 0 })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("u1")
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode("another-secret-another-secret-another!!"));
    expect(await verifySession(forged)).toBeNull();
  });
  it("rejects expired tokens and unknown roles", async () => {
    const key = new TextEncoder().encode(process.env.AUTH_SECRET);
    const expired = await new SignJWT({ role: "admin", tv: 0 })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("u1")
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(key);
    expect(await verifySession(expired)).toBeNull();
    const badRole = await new SignJWT({ role: "root", tv: 0 })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("u1")
      .setExpirationTime("1h")
      .sign(key);
    expect(await verifySession(badRole)).toBeNull();
  });
  it("refuses to run without a strong secret", async () => {
    const prev = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = "short";
    await expect(signSession({ sub: "u", role: "admin", tv: 0 })).rejects.toThrow(/AUTH_SECRET/);
    process.env.AUTH_SECRET = prev;
  });
});

describe("password", () => {
  it("hashes and verifies", async () => {
    const h = await hashPassword("correct horse 42");
    expect(h).not.toContain("correct");
    expect(await verifyPassword("correct horse 42", h)).toBe(true);
    expect(await verifyPassword("wrong", h)).toBe(false);
  });
});

describe("rateLimit", () => {
  it("blocks after the limit and reports retry time", () => {
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) expect(rateLimit("k", 3, 60_000, t + i).ok).toBe(true);
    const blocked = rateLimit("k", 3, 60_000, t + 10);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
  it("recovers after the window and isolates keys", () => {
    const t = 5_000_000;
    rateLimit("a", 1, 1000, t);
    expect(rateLimit("a", 1, 1000, t + 500).ok).toBe(false);
    expect(rateLimit("a", 1, 1000, t + 1500).ok).toBe(true);
    expect(rateLimit("b", 1, 1000, t).ok).toBe(true);
  });
});

describe("clientIp", () => {
  it("prefers Cloudflare, then forwarded-for", () => {
    expect(clientIp(new Headers({ "cf-connecting-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" }))).toBe("1.1.1.1");
    expect(clientIp(new Headers({ "x-forwarded-for": "2.2.2.2, 3.3.3.3" }))).toBe("2.2.2.2");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
