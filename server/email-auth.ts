import { createHash, randomInt } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { emailLoginTokens } from "../drizzle/schema";
import { databaseOrThrow, upsertEmailUser } from "./db";
import { ENV } from "./_core/env";

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_LENGTH = 6;

export type OtpRecord = {
  id: number | string;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
};

export type OtpRepository = {
  supersede: (email: string, now: Date) => Promise<void>;
  insert: (record: Omit<OtpRecord, "id" | "usedAt">) => Promise<void>;
  findUsable: (tokenHash: string, now: Date) => Promise<OtpRecord | undefined>;
  markUsed: (id: number | string, now: Date) => Promise<boolean>;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashOtp(email: string, otp: string): string {
  return createHash("sha256").update(`${normalizeEmail(email)}:${otp}`).digest("hex");
}

export function emailOpenId(email: string): string {
  // `users.openId` is VARCHAR(64). Keep the "email:" namespace while retaining
  // 232 bits of the SHA-256 digest, which remains collision-resistant here.
  return `email:${createHash("sha256").update(normalizeEmail(email)).digest("hex").slice(0, 58)}`;
}

export function isOtpExpired(expiresAt: Date, now = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function isValidOtp(otp: string): boolean {
  return new RegExp(`^\\d{${OTP_LENGTH}}$`).test(otp);
}

export async function createOtp(emailInput: string, repository: OtpRepository, now = new Date()) {
  const email = normalizeEmail(emailInput);
  const otp = String(randomInt(0, 1_000_000)).padStart(OTP_LENGTH, "0");
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);
  await repository.supersede(email, now);
  await repository.insert({ email, tokenHash: hashOtp(email, otp), expiresAt });
  return { email, otp, expiresAt };
}

export async function consumeOtpWithRepository(emailInput: string, otpInput: string, repository: OtpRepository, now = new Date()) {
  const email = normalizeEmail(emailInput);
  const otp = otpInput.trim();
  if (!isValidOtp(otp)) throw new Error("認証コードは6桁の数字で入力してください。");
  const row = await repository.findUsable(hashOtp(email, otp), now);
  if (!row || isOtpExpired(row.expiresAt, now)) {
    throw new Error("認証コードが無効または期限切れです。新しいコードを送信してください。");
  }
  const marked = await repository.markUsed(row.id, now);
  if (!marked) throw new Error("この認証コードはすでに使用されています。");
  return { email, expiresAt: row.expiresAt };
}

function drizzleRepository(db: Awaited<ReturnType<typeof databaseOrThrow>>): OtpRepository {
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

export async function sendOtp(emailInput: string) {
  const db = await databaseOrThrow();
  const { email, otp, expiresAt } = await createOtp(emailInput, drizzleRepository(db));
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
      subject: "Mountainの認証コード",
      text: `Mountainの認証コードは ${otp} です。\n\nこのコードは10分間有効で、一度だけ使用できます。心当たりがない場合は無視してください。`,
      html: `<div style="font-family:sans-serif;line-height:1.7"><h2>Mountainの認証コード</h2><p>次の6桁のコードをMountainに入力してください。</p><p style="font-size:32px;letter-spacing:8px;font-weight:800;color:#2d5a27">${otp}</p><p style="color:#666;font-size:13px">このコードは10分間有効で、一度だけ使用できます。</p></div>`,
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[EmailAuth] Resend failed", response.status, detail);
    throw new Error("認証コードを送信できませんでした。メールアドレスと送信設定を確認してください。");
  }
  return { expiresAt };
}

export async function consumeOtp(email: string, otp: string) {
  const db = await databaseOrThrow();
  const { email: normalizedEmail } = await consumeOtpWithRepository(email, otp, drizzleRepository(db));
  const now = new Date();
  const openId = emailOpenId(normalizedEmail);
  const displayName = normalizedEmail.split("@")[0]?.slice(0, 80) || "登山者";
  return upsertEmailUser({ openId, email: normalizedEmail, name: displayName, loginMethod: "email", lastSignedIn: now });
}
