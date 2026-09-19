import { describe, expect, it } from "vitest";
import { consumeOtpWithRepository, createOtp, emailOpenId, hashOtp, isOtpExpired, isValidOtp, normalizeEmail, OTP_LENGTH, OTP_TTL_MS, type OtpRecord, type OtpRepository } from "./email-auth";
import { issueEmailSession } from "./email-session";
import type { User } from "../drizzle/schema";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";

function createMemoryRepository() {
  let nextId = 1;
  const rows: OtpRecord[] = [];
  const repository: OtpRepository = {
    async supersede(email, now) {
      for (const row of rows) if (row.email === email && !row.usedAt) row.usedAt = now;
    },
    async insert(record) {
      rows.push({ ...record, id: nextId++, usedAt: null });
    },
    async findUsable(tokenHash, now) {
      return rows.find((row) => row.tokenHash === tokenHash && !row.usedAt && row.expiresAt.getTime() > now.getTime());
    },
    async markUsed(id, now) {
      const row = rows.find((candidate) => candidate.id === id);
      if (!row || row.usedAt || row.expiresAt.getTime() <= now.getTime()) return false;
      row.usedAt = now;
      return true;
    },
  };
  return { repository, rows };
}

describe("email OTP authentication", () => {
  it("normalizes email addresses before creating stable identities", () => {
    expect(normalizeEmail("  Climber@Example.COM ")).toBe("climber@example.com");
    expect(emailOpenId(" Climber@Example.COM ")).toBe(emailOpenId("climber@example.com"));
    expect(emailOpenId("climber@example.com")).toMatch(/^email:[a-f0-9]{64}$/);
  });

  it("stores only a hash of the email-bound OTP", () => {
    expect(isValidOtp("123456")).toBe(true);
    expect(isValidOtp("12345")).toBe(false);
    expect(isValidOtp("1234567")).toBe(false);
    expect(hashOtp("climber@example.com", "123456")).toHaveLength(64);
    expect(hashOtp("climber@example.com", "123456")).not.toContain("123456");
    expect(hashOtp("other@example.com", "123456")).not.toBe(hashOtp("climber@example.com", "123456"));
  });

  it("generates a six-digit OTP, consumes it once, and rejects reuse or expiration", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const { repository, rows } = createMemoryRepository();
    const created = await createOtp(" Climber@Example.COM ", repository, now);
    expect(created.email).toBe("climber@example.com");
    expect(created.otp).toMatch(/^\d{6}$/);
    expect(created.otp).toHaveLength(OTP_LENGTH);
    expect(rows[0]?.tokenHash).toBe(hashOtp(created.email, created.otp));
    await expect(consumeOtpWithRepository(created.email, created.otp, repository, new Date(now.getTime() + 1000))).resolves.toMatchObject({ email: "climber@example.com" });
    await expect(consumeOtpWithRepository(created.email, created.otp, repository, new Date(now.getTime() + 2000))).rejects.toThrow("無効または期限切れ");

    const expired = await createOtp("expired@example.com", repository, new Date(now.getTime() - OTP_TTL_MS - 1));
    await expect(consumeOtpWithRepository(expired.email, expired.otp, repository, now)).rejects.toThrow("無効または期限切れ");
  });

  it("rejects a code entered for a different email", async () => {
    const { repository } = createMemoryRepository();
    const created = await createOtp("climber@example.com", repository);
    await expect(consumeOtpWithRepository("other@example.com", created.otp, repository)).rejects.toThrow("無効または期限切れ");
  });

  it("rejects the expiration boundary", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(isOtpExpired(new Date(now.getTime() + OTP_TTL_MS), now)).toBe(false);
    expect(isOtpExpired(new Date(now.getTime()), now)).toBe(true);
  });

  it("issues an email-only session cookie", async () => {
    const user: User = { id: 1, openId: "email:abc", name: "Climber", email: "climber@example.com", loginMethod: "email", friendCode: "MNT-TEST", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
    const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
    const req = { protocol: "https", headers: {} } as never;
    const res = { cookie: (name: string, value: string, options: Record<string, unknown>) => cookies.push({ name, value, options }) } as never;
    const token = await issueEmailSession(user, req, res);
    expect(token).toBeTruthy();
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatchObject({ name: COOKIE_NAME, value: token, options: { maxAge: ONE_YEAR_MS, httpOnly: true, secure: true, sameSite: "none", path: "/" } });
  });
});
