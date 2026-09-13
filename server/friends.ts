import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { friendships, userProfiles, users, type User } from "../drizzle/schema";
import { databaseOrThrow } from "./db";

export type FriendListItem = {
  friendshipId: number;
  userId: number;
  nickname: string;
  avatarUrl: string;
  friendCode: string;
  status: "pending" | "accepted" | "declined";
  direction: "incoming" | "outgoing" | "accepted";
};

export function normalizeFriendCode(code: string) {
  const body = code.trim().toUpperCase().replace(/^MNT[-\s]?/, "");
  return `MNT-${body}`;
}

export async function ensureFriendCode(user: User) {
  const db = await databaseOrThrow();
  const current = await db.select({ friendCode: users.friendCode }).from(users).where(eq(users.id, user.id)).limit(1);
  if (current[0]?.friendCode) return current[0].friendCode;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const friendCode = `MNT-${nanoid(8).toUpperCase()}`;
    try {
      await db.update(users).set({ friendCode }).where(and(eq(users.id, user.id), isNull(users.friendCode)));
      const saved = await db.select({ friendCode: users.friendCode }).from(users).where(eq(users.id, user.id)).limit(1);
      if (saved[0]?.friendCode) return saved[0].friendCode;
    } catch (error) {
      if (attempt === 4) throw error;
    }
  }
  throw new Error("フレンドコードを発行できませんでした。");
}

async function getCounterpartyProfiles(rows: typeof friendships.$inferSelect[], userId: number) {
  const db = await databaseOrThrow();
  const ids = rows.map((row) => row.requesterId === userId ? row.addresseeId : row.requesterId);
  if (!ids.length) return new Map<number, { nickname: string; avatarUrl: string; friendCode: string }>();
  const profileRows = await db.select({ userId: users.id, nickname: userProfiles.nickname, avatarUrl: userProfiles.avatarUrl, friendCode: users.friendCode })
    .from(users).leftJoin(userProfiles, eq(userProfiles.userId, users.id)).where(inArray(users.id, ids));
  const profileMap = new Map<number, { nickname: string; avatarUrl: string; friendCode: string }>();
  for (const row of profileRows) {
    profileMap.set(row.userId, {
      nickname: row.nickname || "登山者",
      avatarUrl: row.avatarUrl || "🥾",
      friendCode: row.friendCode || "",
    });
  }
  return profileMap;
}

export async function listFriends(user: User): Promise<FriendListItem[]> {
  const db = await databaseOrThrow();
  await ensureFriendCode(user);
  const rows = await db.select().from(friendships)
    .where(or(eq(friendships.requesterId, user.id), eq(friendships.addresseeId, user.id)));
  const profiles = await getCounterpartyProfiles(rows, user.id);
  return rows.map((row: typeof friendships.$inferSelect) => {
    const counterpartyId = row.requesterId === user.id ? row.addresseeId : row.requesterId;
    const profile = profiles.get(counterpartyId) || { nickname: "登山者", avatarUrl: "🥾", friendCode: "" };
    return {
      friendshipId: row.id,
      userId: counterpartyId,
      nickname: profile.nickname,
      avatarUrl: profile.avatarUrl,
      friendCode: profile.friendCode,
      status: row.status,
      direction: row.status === "accepted" ? "accepted" : row.requesterId === user.id ? "outgoing" : "incoming",
    };
  });
}

export async function requestFriend(user: User, code: string) {
  const db = await databaseOrThrow();
  const normalized = normalizeFriendCode(code);
  const target = await db.select({ id: users.id, friendCode: users.friendCode }).from(users)
    .where(eq(users.friendCode, normalized)).limit(1);
  if (!target[0]) throw new Error("そのフレンドコードのユーザーが見つかりません。");
  if (target[0].id === user.id) throw new Error("自分自身はフレンドに追加できません。");

  const existing = await db.select().from(friendships).where(or(
    and(eq(friendships.requesterId, user.id), eq(friendships.addresseeId, target[0].id)),
    and(eq(friendships.requesterId, target[0].id), eq(friendships.addresseeId, user.id)),
  )).limit(1);
  if (existing[0]?.status === "accepted") throw new Error("すでにフレンドです。");
  if (existing[0]?.status === "pending") throw new Error("フレンド申請はすでに送信済みです。");
  if (existing[0]) {
    await db.update(friendships).set({ requesterId: user.id, addresseeId: target[0].id, status: "pending" }).where(eq(friendships.id, existing[0].id));
  } else {
    await db.insert(friendships).values({ requesterId: user.id, addresseeId: target[0].id, status: "pending" });
  }
  return listFriends(user);
}

export async function respondFriend(user: User, friendshipId: number, accept: boolean) {
  const db = await databaseOrThrow();
  const rows = await db.select().from(friendships).where(and(eq(friendships.id, friendshipId), eq(friendships.addresseeId, user.id), eq(friendships.status, "pending"))).limit(1);
  if (!rows[0]) throw new Error("受け付け可能なフレンド申請が見つかりません。");
  if (accept) await db.update(friendships).set({ status: "accepted" }).where(eq(friendships.id, friendshipId));
  else await db.delete(friendships).where(eq(friendships.id, friendshipId));
  return listFriends(user);
}

export async function removeFriend(user: User, friendshipId: number) {
  const db = await databaseOrThrow();
  const rows = await db.select({ id: friendships.id }).from(friendships).where(and(eq(friendships.id, friendshipId), or(eq(friendships.requesterId, user.id), eq(friendships.addresseeId, user.id)))).limit(1);
  if (!rows[0]) throw new Error("フレンド関係が見つかりません。");
  await db.delete(friendships).where(eq(friendships.id, friendshipId));
  return listFriends(user);
}

export async function getAcceptedFriendIds(user: User, friendIds: number[]) {
  if (!friendIds.length) return [];
  const db = await databaseOrThrow();
  const rows = await db.select({ requesterId: friendships.requesterId, addresseeId: friendships.addresseeId }).from(friendships)
    .where(and(eq(friendships.status, "accepted"), or(eq(friendships.requesterId, user.id), eq(friendships.addresseeId, user.id))));
  const accepted = new Set<number>(rows.map((row: { requesterId: number; addresseeId: number }) => row.requesterId === user.id ? row.addresseeId : row.requesterId));
  const invalid = friendIds.find((id) => !accepted.has(id) || id === user.id);
  if (invalid !== undefined) throw new Error("選択されたユーザーはフレンドではありません。");
  return Array.from(new Set(friendIds));
}
