import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull, gt } from "drizzle-orm";
import { emailLoginTokens } from "../drizzle/schema";
import { databaseOrThrow, getUserByOpenId, upsertUser } from "./db";
import { ENV } from "./_core/env";

export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashMagicToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function emailOpenId(email: string): string {
  return `email:${createHash("sha256").update(normalizeEmail(email)).digest("hex")}`;
}

export function isMagicLinkExpired(expiresAt: Date, now = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

async function createMagicToken(email: string) {
  const db = await databaseOrThrow();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

  // A new request supersedes older outstanding links for the same address.
  await db.update(emailLoginTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(emailLoginTokens.email, email), isNull(emailLoginTokens.usedAt)));
  await db.insert(emailLoginTokens).values({
    email,
    tokenHash: hashMagicToken(token),
    expiresAt,
  });
  return { token, expiresAt };
}

function getRequestOrigin(req: { protocol: string; headers: Record<string, unknown> }): string {
  const forwardedProto = typeof req.headers["x-forwarded-proto"] === "string"
    ? req.headers["x-forwarded-proto"].split(",")[0]?.trim()
    : undefined;
  const protocol = forwardedProto || req.protocol || "https";
  const host = typeof req.headers.host === "string" ? req.headers.host : undefined;
  if (!host) throw new Error("ログインURLを作成できませんでした。");
  return `${protocol}://${host}`;
}

export async function sendMagicLink(emailInput: string, req: { protocol: string; headers: Record<string, unknown> }) {
  const email = normalizeEmail(emailInput);
  const { token, expiresAt } = await createMagicToken(email);
  const configuredOrigin = ENV.appUrl.replace(/\/$/, "");
  const origin = configuredOrigin || getRequestOrigin(req);
  const loginUrl = `${origin}/?magic_token=${encodeURIComponent(token)}`;
  const from = ENV.resendFromEmail || "Mountain <onboarding@resend.dev>";

  if (!ENV.resendApiKey) throw new Error("RESEND_API_KEYが設定されていません。");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Mountainへのログインリンク",
      text: `Mountainにログインするには、次のリンクを開いてください。\n\n${loginUrl}\n\nこのリンクは15分間有効で、一度だけ使用できます。心当たりがない場合は無視してください。`,
      html: `<div style="font-family: sans-serif; line-height: 1.7"><h2>Mountainへログイン</h2><p>下のボタンから climbing journal を開けます。</p><p><a href="${loginUrl}" style="display:inline-block;padding:12px 18px;background:#2d5a27;color:white;border-radius:10px;text-decoration:none;font-weight:700">Mountainを開く</a></p><p style="color:#666;font-size:13px">このリンクは15分間有効で、一度だけ使用できます。</p></div>`,
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[EmailAuth] Resend failed", response.status, detail);
    throw new Error("ログインメールを送信できませんでした。メールアドレスと送信設定を確認してください。");
  }
  return { expiresAt };
}

export async function consumeMagicLink(token: string) {
  const db = await databaseOrThrow();
  const tokenHash = hashMagicToken(token);
  const now = new Date();
  const rows = await db.select().from(emailLoginTokens).where(
    and(eq(emailLoginTokens.tokenHash, tokenHash), isNull(emailLoginTokens.usedAt), gt(emailLoginTokens.expiresAt, now)),
  ).limit(1);
  const row = rows[0];
  if (!row || isMagicLinkExpired(row.expiresAt, now)) throw new Error("ログインリンクが無効または期限切れです。もう一度メールを送信してください。");

  const updated = await db.update(emailLoginTokens).set({ usedAt: now }).where(
    and(eq(emailLoginTokens.id, row.id), isNull(emailLoginTokens.usedAt), gt(emailLoginTokens.expiresAt, now)),
  );
  if (updated[0].affectedRows !== 1) throw new Error("このログインリンクはすでに使用されています。");

  const openId = emailOpenId(row.email);
  const displayName = row.email.split("@")[0]?.slice(0, 80) || "登山者";
  await upsertUser({ openId, email: row.email, name: displayName, loginMethod: "email", lastSignedIn: now });
  const user = await getUserByOpenId(openId);
  if (!user) throw new Error("アカウントを作成できませんでした。");
  return user;
}

export function buildMagicLinkEmailForTest(email: string, token: string, origin: string) {
  return `${origin.replace(/\/$/, "")}/?magic_token=${encodeURIComponent(token)}&email=${encodeURIComponent(normalizeEmail(email))}`;
}
