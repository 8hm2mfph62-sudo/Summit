import { describe, expect, it } from "vitest";
import {
  emailOpenId,
  hashPassword,
  normalizeEmail,
  PASSWORD_RULES,
  validatePassword,
  verifyPassword,
} from "./password-auth";

const password = "mountain-pass-2026";

describe("email and password authentication", () => {
  it("normalizes email addresses and creates a session identity within the database limit", () => {
    expect(normalizeEmail("  Climber@Example.COM ")).toBe(
      "climber@example.com"
    );
    expect(emailOpenId(" Climber@Example.COM ")).toBe(
      emailOpenId("climber@example.com")
    );
    expect(emailOpenId("climber@example.com")).toMatch(/^email:[a-f0-9]{58}$/);
    expect(emailOpenId("climber@example.com")).toHaveLength(64);
  });

  it("hashes passwords with unique salts and verifies them without storing plaintext", async () => {
    const first = await hashPassword(password);
    const second = await hashPassword(password);
    expect(first).toMatch(/^scrypt\$v1\$16384\$8\$1\$/);
    expect(first).not.toContain(password);
    expect(first).not.toBe(second);
    await expect(verifyPassword(password, first)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", first)).resolves.toBe(false);
    await expect(verifyPassword(password, "invalid")).resolves.toBe(false);
    await expect(
      verifyPassword(password, first.replace("$16384$", "$999999$"))
    ).resolves.toBe(false);
  });

  it("enforces the password length rule", () => {
    expect(() => validatePassword("short")).toThrow(
      `${PASSWORD_RULES.minLength}文字以上`
    );
    expect(() =>
      validatePassword("x".repeat(PASSWORD_RULES.maxLength + 1))
    ).toThrow(`${PASSWORD_RULES.maxLength}文字以内`);
    expect(() =>
      validatePassword("x".repeat(PASSWORD_RULES.minLength))
    ).not.toThrow();
  });
});
