import { describe, expect, it } from "vitest";
import type { User } from "../drizzle/schema";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import { issuePasswordSession } from "./password-session";

const user: User = {
  id: 1,
  openId: "email:abc",
  name: "Climber",
  email: "climber@example.com",
  passwordHash: "scrypt$v1$16384$8$1$salt$key",
  loginMethod: "password",
  friendCode: "MNT-TEST",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

describe("password session", () => {
  it("issues a secure session cookie only for password-authenticated users", async () => {
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
    const token = await issuePasswordSession(user, req, res);
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

  it("rejects a legacy non-password user", async () => {
    const req = { protocol: "https", headers: {} } as never;
    const res = { cookie: () => undefined } as never;
    await expect(
      issuePasswordSession(
        { ...user, loginMethod: "email", passwordHash: null },
        req,
        res
      )
    ).rejects.toThrow("パスワードを設定したユーザー");
  });
});
