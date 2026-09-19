import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { emailLoginTokens } from "../drizzle/schema";
import { databaseOrThrow, getUserByOpenId, upsertUser } from "./db";
import { ENV } from "./_core/env";

export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;

export type MagicLinkRecord = {
  id: number | string;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
};

export type MagicLinkRepository = {
  supersede: (email: string, now: Date) => Promise<void>;
  insert: (record: Omit<MagicLinkRecord, "id" | "usedAt">) => Promise<void>;
  findUsable: (tokenHash: string, now: Date) => Promise<MagicLinkRecord | undefined>;
  markUsed: (id: number | string, now: Date) => Promise<boolean>;
};

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

export function normalizeAppOrigin(origin: string): string {
  const url = new URL(origin);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("ログインURLの送信元が不正です。");
  return url.origin;
}

export async function createMagicLink(emailInput: string, repository: MagicLinkRepository, now = new Date()) {
  const email = normalizeEmail(emailInput);
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(now.getTime() + MAGIC_LINK_TTL_MS);
  await repository.supersede(email, now);
  await repository.insert({ email, tokenHash: hashMagicToken(token), expiresAt });
  return { email, token, expiresAt };
}

export async function consumeMagicLinkWithRepository(token: string, repository: MagicLinkRepository, now = new Date()) {
  const row = await repository.findUsable(hashMagicToken(token), now);
  if (!row || isMagicLinkExpired(row.expiresAt, now)) {
    throw new Error("ログインリンクが無効または期限切れです。もう一度メールを送信してください。");
  }
  const marked = await repository.markUsed(row.id, now);
  if (!marked) throw new Error("このログインリンクはすでに使用されています。");
  return { email: normalizeEmail(row.email), expiresAt: row.expiresAt };
}

function drizzleRepository(db: Awaited<ReturnType<typeof databaseOrThrow>>): MagicLinkRepository {
  return {
    supersede: async (email, now) => {
      await db.update(emailLoginTokens)
        .set({ usedAt: now })
        .where(and(eq(emailLoginTokens.email, email), isNull(emailLoginTokens.usedAt)));
    },
    insert: async (record) => {
      await db.insert(emailLoginTokens).values({
        email: record.email,
        tokenHash: record.tokenHash,
        expiresAt: record.expiresAt,
      });
    },
    findUsable: async (tokenHash, now) => {
      const rows = await db.select().from(emailLoginTokens).where(
        and(eq(emailLoginTokens.tokenHash, tokenHash), isNull(emailLoginTokens.usedAt), gt(emailLoginTokens.expiresAt, now)),
      ).limit(1);
      return rows[0];
    },
    markUsed: async (id, now) => {
      const result = await db.update(emailLoginTokens).set({ usedAt: now }).where(
        and(eq(emailLoginTokens.id, Number(id)), isNull(emailLoginTokens.usedAt)),
      );
      return result[0].affectedRows === 1;
    },
  };
}

export async function sendMagicLink(emailInput: string, originInput: string) {
  const db = await databaseOrThrow();
  const { email, token, expiresAt } = await createMagicLink(emailInput, drizzleRepository(db));
  const origin = normalizeAppOrigin(originInput);
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
  const { email } = await consumeMagicLinkWithRepository(token, drizzleRepository(db));
  const now = new Date();
  const openId = emailOpenId(email);
  const displayName = email.split("@")[0]?.slice(0, 80) || "登山者";
  await upsertUser({ openId, email, name: displayName, loginMethod: "email", lastSignedIn: now });
  const user = await getUserByOpenId(openId);
  if (!user) throw new Error("アカウントを作成できませんでした。");
  return user;
}

export function buildMagicLinkUrl(email: string, token: string, origin: string) {
  return `${normalizeAppOrigin(origin)}/?magic_token=${encodeURIComponent(token)}&email=${encodeURIComponent(normalizeEmail(email))}`;
}
