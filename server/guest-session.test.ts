import { describe, expect, it } from "vitest";
import type { User } from "../drizzle/schema";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import { guestOpenId } from "./db";
import { issueGuestSession } from "./guest-session";

const guest: User = {
  id: 1,
  openId: guestOpenId("A".repeat(43)),
  name: "ゲスト登山者",
  email: null,
  passwordHash: null,
  loginMethod: "guest",
  friendCode: "MNT-GUEST",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

describe("anonymous guest access", () => {
  it("derives a deterministic, database-safe identity for one browser key", () => {
    expect(guestOpenId("A".repeat(43))).toBe(guestOpenId("A".repeat(43)));
    expect(guestOpenId("A".repeat(43))).not.toBe(guestOpenId("B".repeat(43)));
    expect(guestOpenId("A".repeat(43))).toMatch(/^guest:[a-f0-9]{58}$/);
    expect(guestOpenId("A".repeat(43))).toHaveLength(64);
  });

  it("issues a secure cookie for a guest user", async () => {
    const cookies: Array<{
      name: string;
      value: string;
      options: Record<string, unknown>;
    }> = [];
    const req = { protocol: "https", headers: {} } as never;
    const res = {
      cookie: (name: string, value: string, options: Record<string, unknown>) =>
        cookies.push({ name, value, options }),
    } as never;
    const token = await issueGuestSession(guest, req, res);
    expect(token).toBeTruthy();
    expect(cookies[0]).toMatchObject({
      name: COOKIE_NAME,
      value: token,
      options: {
        maxAge: ONE_YEAR_MS,
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
      },
    });
  });

  it("rejects issuing a guest session for a non-guest account", async () => {
    const req = { protocol: "https", headers: {} } as never;
    const res = { cookie: () => undefined } as never;
    await expect(
      issueGuestSession(
        { ...guest, loginMethod: "password", passwordHash: "hash" },
        req,
        res
      )
    ).rejects.toThrow("ゲストユーザー");
  });
});
