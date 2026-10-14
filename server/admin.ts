import { desc, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  announcements,
  climbRecords,
  type User,
  userBadges,
  userChallenges,
  userProfiles,
  users,
} from "../drizzle/schema";
import { calculateLevel } from "./progress";
import { databaseOrThrow } from "./db";

export type AnnouncementCategory = "info" | "safety" | "maintenance" | "event";

function toIso(value: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function getTargetUser(userId: number) {
  const db = await databaseOrThrow();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) throw new Error("対象のプレイヤーが見つかりません。");
  return user;
}

async function ensureTargetProfile(target: User) {
  const db = await databaseOrThrow();
  const [existing] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, target.id))
    .limit(1);
  if (existing) return existing;

  await db.insert(userProfiles).values({
    userId: target.id,
    nickname: (
      target.name?.trim() ||
      target.email?.split("@")[0] ||
      "登山者"
    ).slice(0, 80),
    avatarUrl: "🥾",
    bio: "",
  });
  const [created] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, target.id))
    .limit(1);
  if (!created)
    throw new Error("プレイヤープロフィールを初期化できませんでした。");
  return created;
}

/** Provides a safe, admin-only player directory. Password hashes are never selected. */
export async function listAdminPlayers(query = "") {
  const db = await databaseOrThrow();
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      friendCode: users.friendCode,
      role: users.role,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
      nickname: userProfiles.nickname,
      avatarUrl: userProfiles.avatarUrl,
      level: userProfiles.level,
      totalXp: userProfiles.totalXp,
      isBanned: userProfiles.isBanned,
      isPremium: userProfiles.isPremium,
    })
    .from(users)
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .orderBy(desc(users.lastSignedIn))
    .limit(200);

  const userIds = rows.map(row => row.id);
  const recordCounts = userIds.length
    ? await db
        .select({
          userId: climbRecords.userId,
          count: sql<number>`count(*)`,
        })
        .from(climbRecords)
        .where(inArray(climbRecords.userId, userIds))
        .groupBy(climbRecords.userId)
    : [];
  const countByUserId = new Map(
    recordCounts.map(row => [row.userId, Number(row.count)])
  );
  const term = query.trim().toLowerCase();

  return rows
    .filter(row => {
      if (!term) return true;
      return [row.name, row.nickname, row.email, row.friendCode]
        .filter((value): value is string => Boolean(value))
        .some(value => value.toLowerCase().includes(term));
    })
    .map(row => ({
      id: row.id,
      name: row.name || "登山者",
      nickname: row.nickname || row.name || "登山者",
      avatarUrl: row.avatarUrl || "🥾",
      email: row.email || null,
      friendCode: row.friendCode || null,
      role: row.role,
      isBanned: row.isBanned ?? false,
      isPremium: row.isPremium ?? false,
      level: row.level ?? 1,
      totalXp: row.totalXp ?? 0,
      climbCount: countByUserId.get(row.id) ?? 0,
      createdAt: toIso(row.createdAt),
      lastSignedIn: toIso(row.lastSignedIn),
    }));
}

export async function setPlayerRole(
  actor: User,
  targetUserId: number,
  role: "user" | "admin"
) {
  const db = await databaseOrThrow();
  const target = await getTargetUser(targetUserId);
  if (target.id === actor.id && role !== "admin") {
    throw new Error("自分自身の管理者権限は解除できません。");
  }
  if (target.role === "admin" && role === "user") {
    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"));
    if (admins.length <= 1) {
      throw new Error("最後の管理者の権限は解除できません。");
    }
  }
  await db.update(users).set({ role }).where(eq(users.id, target.id));
  return { id: target.id, role };
}

export async function setPlayerBanStatus(
  actor: User,
  targetUserId: number,
  isBanned: boolean
) {
  const db = await databaseOrThrow();
  const target = await getTargetUser(targetUserId);
  if (target.id === actor.id && isBanned) {
    throw new Error("自分自身を利用停止にはできません。");
  }
  if (target.role === "admin" && isBanned) {
    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"));
    if (admins.length <= 1) {
      throw new Error("最後の管理者を利用停止にはできません。");
    }
  }
  await ensureTargetProfile(target);
  await db
    .update(userProfiles)
    .set({ isBanned })
    .where(eq(userProfiles.userId, target.id));
  return { id: target.id, isBanned };
}

export async function grantPlayerXp(targetUserId: number, amount: number) {
  const db = await databaseOrThrow();
  const target = await getTargetUser(targetUserId);
  const profile = await ensureTargetProfile(target);
  const progress = calculateLevel(profile.totalXp + amount);
  await db
    .update(userProfiles)
    .set(progress)
    .where(eq(userProfiles.userId, target.id));
  return { id: target.id, totalXp: progress.totalXp, level: progress.level };
}

/** Clears a player’s climb records and progress while keeping the account itself intact. */
export async function resetPlayerProgressByAdmin(targetUserId: number) {
  const db = await databaseOrThrow();
  const target = await getTargetUser(targetUserId);
  await ensureTargetProfile(target);
  await db.delete(climbRecords).where(eq(climbRecords.userId, target.id));
  await db.delete(userBadges).where(eq(userBadges.userId, target.id));
  await db
    .update(userChallenges)
    .set({ isCompleted: false, completedAt: null })
    .where(eq(userChallenges.userId, target.id));
  await db
    .update(userProfiles)
    .set(calculateLevel(0))
    .where(eq(userProfiles.userId, target.id));
  return { id: target.id, reset: true as const };
}

function toAnnouncementDto(row: {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  isPublished: boolean;
  publishedAt: Date | string | null;
  authorId: number;
  authorName: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    category: row.category,
    isPublished: row.isPublished,
    publishedAt: toIso(row.publishedAt),
    authorId: row.authorId,
    authorName: row.authorName || "管理者",
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

async function selectAnnouncements(publishedOnly: boolean) {
  const db = await databaseOrThrow();
  const query = db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      category: announcements.category,
      isPublished: announcements.isPublished,
      publishedAt: announcements.publishedAt,
      authorId: announcements.authorId,
      authorName: users.name,
      createdAt: announcements.createdAt,
      updatedAt: announcements.updatedAt,
    })
    .from(announcements)
    .innerJoin(users, eq(users.id, announcements.authorId));
  const rows = publishedOnly
    ? await query
        .where(eq(announcements.isPublished, true))
        .orderBy(desc(announcements.publishedAt), desc(announcements.updatedAt))
        .limit(5)
    : await query.orderBy(desc(announcements.updatedAt)).limit(100);
  return rows.map(toAnnouncementDto);
}

export function listPublishedAnnouncements() {
  return selectAnnouncements(true);
}

export function listAdminAnnouncements() {
  return selectAnnouncements(false);
}

export async function createAnnouncement(
  author: User,
  input: {
    title: string;
    body: string;
    category: AnnouncementCategory;
    isPublished: boolean;
  }
) {
  const db = await databaseOrThrow();
  const now = new Date();
  const id = nanoid();
  await db.insert(announcements).values({
    id,
    title: input.title.trim(),
    body: input.body.trim(),
    category: input.category,
    isPublished: input.isPublished,
    publishedAt: input.isPublished ? now : null,
    authorId: author.id,
  });
  return { id };
}

export async function updateAnnouncement(input: {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  isPublished: boolean;
}) {
  const db = await databaseOrThrow();
  const [existing] = await db
    .select({
      id: announcements.id,
      isPublished: announcements.isPublished,
      publishedAt: announcements.publishedAt,
    })
    .from(announcements)
    .where(eq(announcements.id, input.id))
    .limit(1);
  if (!existing) throw new Error("更新対象のお知らせが見つかりません。");

  await db
    .update(announcements)
    .set({
      title: input.title.trim(),
      body: input.body.trim(),
      category: input.category,
      isPublished: input.isPublished,
      publishedAt:
        input.isPublished && !existing.isPublished
          ? new Date()
          : existing.publishedAt,
    })
    .where(eq(announcements.id, input.id));
  return { id: input.id };
}
