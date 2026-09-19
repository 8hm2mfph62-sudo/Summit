import type { Request, Response } from "express";
import type { User } from "../drizzle/schema";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";

export async function issueEmailSession(user: User, req: Request, res: Response) {
  if (user.loginMethod !== "email" || !user.openId.startsWith("email:")) {
    throw new Error("メール認証済みのユーザーだけがログインできます。");
  }
  const sessionToken = await sdk.createSessionToken(user.openId, {
    name: user.name || user.email || "登山者",
    expiresInMs: ONE_YEAR_MS,
  });
  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
  return sessionToken;
}
