import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import {
  getUserByEmail,
  getUserByOpenId,
  upsertPasswordUser,
  upsertUser,
} from "./db";

const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

function deriveKey(
  password: string,
  salt: Buffer,
  N = SCRYPT_N,
  r = SCRYPT_R,
  p = SCRYPT_P
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      KEY_LENGTH,
      { N, r, p, maxmem: 64 * 1024 * 1024 },
      (error, key) => {
        if (error) reject(error);
        else resolve(key);
      }
    );
  });
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailOpenId(email: string): string {
  return `email:${createHash("sha256").update(normalizeEmail(email)).digest("hex").slice(0, 58)}`;
}

export function validatePassword(password: string): void {
  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    throw new Error(
      `パスワードは${PASSWORD_MIN_LENGTH}文字以上${PASSWORD_MAX_LENGTH}文字以内で設定してください。`
    );
  }
}

export async function hashPassword(password: string): Promise<string> {
  validatePassword(password);
  const salt = randomBytes(SALT_BYTES);
  const key = await deriveKey(password, salt);
  return [
    "scrypt",
    "v1",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  storedHash: string | null | undefined
): Promise<boolean> {
  if (!storedHash) return false;
  const [algorithm, version, nText, rText, pText, saltText, keyText] =
    storedHash.split("$");
  const N = Number(nText);
  const r = Number(rText);
  const p = Number(pText);
  if (
    algorithm !== "scrypt" ||
    version !== "v1" ||
    !Number.isInteger(N) ||
    !Number.isInteger(r) ||
    !Number.isInteger(p) ||
    !saltText ||
    !keyText ||
    N !== SCRYPT_N ||
    r !== SCRYPT_R ||
    p !== SCRYPT_P
  ) {
    return false;
  }

  try {
    const salt = Buffer.from(saltText, "base64url");
    const expected = Buffer.from(keyText, "base64url");
    if (!salt.length || expected.length !== KEY_LENGTH) return false;
    const actual = await deriveKey(password, salt, N, r, p);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export async function registerWithPassword(
  emailInput: string,
  password: string
) {
  const email = normalizeEmail(emailInput);
  validatePassword(password);
  const existing = await getUserByEmail(email);
  if (existing?.passwordHash) {
    throw new Error(
      "このメールアドレスにはすでにパスワードが設定されています。ログインしてください。"
    );
  }
  if (existing) {
    throw new Error(
      "このメールアドレスは別のログイン方法で使われています。アカウント設定からパスワードを追加してください。"
    );
  }

  const passwordHash = await hashPassword(password);
  const now = new Date();
  const user = await upsertPasswordUser({
    openId: emailOpenId(email),
    email,
    passwordHash,
    name: email.split("@")[0]?.slice(0, 80) ?? "登山者",
    loginMethod: "password",
    lastSignedIn: now,
  });
  return user;
}

export async function loginWithPassword(emailInput: string, password: string) {
  const email = normalizeEmail(emailInput);
  const user = await getUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new Error("メールアドレスまたはパスワードが正しくありません。");
  }

  const now = new Date();
  await upsertUser({
    openId: user.openId,
    loginMethod: "password",
    lastSignedIn: now,
  });
  const refreshed = await getUserByOpenId(user.openId);
  if (!refreshed) throw new Error("ログインアカウントを確認できませんでした。");
  return refreshed;
}

export const PASSWORD_RULES = {
  minLength: PASSWORD_MIN_LENGTH,
  maxLength: PASSWORD_MAX_LENGTH,
} as const;
