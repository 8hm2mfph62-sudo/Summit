import type { Request, Response } from "express";
import type { User } from "../drizzle/schema";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";

export async function issuePasswordSession(
  user: User,
  req: Request,
  res: Response
) {
  if (
    user.loginMethod !== "password" ||
    !user.passwordHash ||
    !user.openId.startsWith("email:")
  ) {
    throw new Error("パスワードを設定したユーザーだけがログインできます。");
  }

  const sessionToken = await sdk.createSessionToken(user.openId, {
    name: user.name || user.email || "登山者",
    expiresInMs: ONE_YEAR_MS,
    sessionVersion: user.sessionVersion,
  });
  res.cookie(COOKIE_NAME, sessionToken, {
    ...getSessionCookieOptions(req),
    maxAge: ONE_YEAR_MS,
  });
  return sessionToken;
}
