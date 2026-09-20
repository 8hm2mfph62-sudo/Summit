import type { Request, Response } from "express";
import type { User } from "../drizzle/schema";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";

export async function issueGuestSession(
  user: User,
  req: Request,
  res: Response
) {
  if (user.loginMethod !== "guest" || !user.openId.startsWith("guest:")) {
    throw new Error("ゲストユーザーだけが匿名セッションを開始できます。");
  }

  const sessionToken = await sdk.createSessionToken(user.openId, {
    name: "ゲスト登山者",
    expiresInMs: ONE_YEAR_MS,
  });
  res.cookie(COOKIE_NAME, sessionToken, {
    ...getSessionCookieOptions(req),
    maxAge: ONE_YEAR_MS,
  });
  return sessionToken;
}
