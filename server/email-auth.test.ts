import { describe, expect, it } from "vitest";
import { buildMagicLinkUrl, createMagicLink, emailOpenId, hashMagicToken, isMagicLinkExpired, MAGIC_LINK_TTL_MS, normalizeEmail, consumeMagicLinkWithRepository, type MagicLinkRecord, type MagicLinkRepository } from "./email-auth";
import { issueEmailSession } from "./email-session";
import type { User } from "../drizzle/schema";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";

function createMemoryRepository() {
  let nextId = 1;
  const rows: MagicLinkRecord[] = [];
  const repository: MagicLinkRepository = {
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

describe("email magic-link authentication", () => {
  it("normalizes email addresses before creating stable identities", () => {
    expect(normalizeEmail("  Climber@Example.COM ")).toBe("climber@example.com");
    expect(emailOpenId(" Climber@Example.COM ")).toBe(emailOpenId("climber@example.com"));
    expect(emailOpenId("climber@example.com")).toMatch(/^email:[a-f0-9]{64}$/);
  });

  it("hashes tokens without storing the raw value", () => {
    expect(hashMagicToken("abc")).not.toBe("abc");
    expect(hashMagicToken("abc")).toHaveLength(64);
    expect(hashMagicToken("abc")).toBe(hashMagicToken("abc"));
  });

  it("generates a token, consumes it once, and rejects reuse or expiration", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const { repository, rows } = createMemoryRepository();
    const created = await createMagicLink(" Climber@Example.COM ", repository, now);
    expect(created.email).toBe("climber@example.com");
    expect(created.token).toHaveLength(64);
    expect(rows[0]?.tokenHash).toBe(hashMagicToken(created.token));
    expect(rows[0]?.tokenHash).not.toContain(created.token);

    await expect(consumeMagicLinkWithRepository(created.token, repository, new Date(now.getTime() + 1000))).resolves.toMatchObject({ email: "climber@example.com" });
    await expect(consumeMagicLinkWithRepository(created.token, repository, new Date(now.getTime() + 2000))).rejects.toThrow("無効または期限切れ");

    const expired = await createMagicLink("expired@example.com", repository, new Date(now.getTime() - MAGIC_LINK_TTL_MS - 1));
    await expect(consumeMagicLinkWithRepository(expired.token, repository, now)).rejects.toThrow("無効または期限切れ");
  });

  it("accepts a fresh token and rejects boundary timestamps", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(isMagicLinkExpired(new Date(now.getTime() + MAGIC_LINK_TTL_MS), now)).toBe(false);
    expect(isMagicLinkExpired(new Date(now.getTime() - 1), now)).toBe(true);
    expect(isMagicLinkExpired(new Date(now.getTime()), now)).toBe(true);
  });

  it("builds the login URL from the frontend origin", () => {
    expect(buildMagicLinkUrl("Climber@example.com", "secret-token", "https://mountain.example/app")).toBe("https://mountain.example/?magic_token=secret-token&email=climber%40example.com");
  });

  it("issues an email-only session cookie", async () => {
    const user: User = {
      id: 1,
      openId: "email:abc",
      name: "Climber",
      email: "climber@example.com",
      loginMethod: "email",
      friendCode: "MNT-TEST",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
    const req = { protocol: "https", headers: {} } as never;
    const res = { cookie: (name: string, value: string, options: Record<string, unknown>) => cookies.push({ name, value, options }) } as never;
    const token = await issueEmailSession(user, req, res);
    expect(token).toBeTruthy();
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatchObject({ name: COOKIE_NAME, value: token, options: { maxAge: ONE_YEAR_MS, httpOnly: true, secure: true, sameSite: "none", path: "/" } });
  });
});
