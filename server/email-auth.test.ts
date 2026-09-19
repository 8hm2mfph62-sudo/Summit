import { describe, expect, it } from "vitest";
import { emailOpenId, hashMagicToken, isMagicLinkExpired, normalizeEmail, buildMagicLinkEmailForTest, MAGIC_LINK_TTL_MS } from "./email-auth";

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

  it("accepts a fresh token and rejects expired or boundary tokens", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(isMagicLinkExpired(new Date(now.getTime() + MAGIC_LINK_TTL_MS), now)).toBe(false);
    expect(isMagicLinkExpired(new Date(now.getTime() - 1), now)).toBe(true);
    expect(isMagicLinkExpired(new Date(now.getTime()), now)).toBe(true);
  });

  it("builds a URL that contains the one-time token", () => {
    expect(buildMagicLinkEmailForTest("Climber@example.com", "secret-token", "https://mountain.example/")).toBe("https://mountain.example/?magic_token=secret-token&email=climber%40example.com");
  });
});
