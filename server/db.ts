import { eq, and, sql, asc, inArray, desc, or } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { drizzle } from "drizzle-orm/mysql2";
import { nanoid } from "nanoid";
import { createHash } from "node:crypto";
import {
  albumMountains,
  albums,
  badges,
  challengeTemplates,
  climbRecords,
  climbRecordParticipants,
  companionMessages,
  inquiries,
  inquiryReplies,
  mountains,
  type InsertUser,
  type User,
  userBadges,
  userChallenges,
  userProfiles,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { calculateClimbXp, calculateLevel } from "./progress";
import { compactCompanionReply, companionReplyGuidance } from "./companion";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function databaseOrThrow() {
  const db = await getDb();
  if (!db)
    throw new Error(
      "データベースへ接続できません。時間をおいて再度お試しください。"
    );
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await databaseOrThrow();
  const values: InsertUser = {
    openId: user.openId,
    lastSignedIn: user.lastSignedIn ?? new Date(),
    friendCode: user.friendCode ?? `MNT-${nanoid(8).toUpperCase()}`,
  };
  const updateSet: Record<string, unknown> = {
    lastSignedIn: values.lastSignedIn,
    friendCode: sql`COALESCE(friendCode, VALUES(friendCode))`,
  };

  for (const field of [
    "name",
    "email",
    "passwordHash",
    "loginMethod",
  ] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }

  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  await db
    .insert(users)
    .values(values)
    .onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result[0];
}

export function guestOpenId(guestKey: string): string {
  return `guest:${createHash("sha256").update(guestKey).digest("hex").slice(0, 58)}`;
}

/** Creates or restores an isolated anonymous account for one browser. */
export async function getOrCreateGuestUser(guestKey: string): Promise<User> {
  const openId = guestOpenId(guestKey);
  const existing = await getUserByOpenId(openId);
  if (existing) {
    await upsertUser({
      openId,
      loginMethod: "guest",
      lastSignedIn: new Date(),
    });
    return existing;
  }

  await upsertUser({
    openId,
    name: "ゲスト登山者",
    loginMethod: "guest",
    lastSignedIn: new Date(),
  });
  const created = await getUserByOpenId(openId);
  if (!created)
    throw new Error(
      "ゲスト利用を開始できませんでした。もう一度お試しください。"
    );
  return created;
}

/**
 * Creates a password-authenticated account or migrates the existing account
 * that owns the email address. The primary user id stays the same so records,
 * profile data, and friendships remain attached to the user.
 */
export async function upsertPasswordUser(user: InsertUser): Promise<User> {
  if (!user.openId?.startsWith("email:") || !user.email || !user.passwordHash) {
    throw new Error("メールアドレスまたはパスワードの情報が不正です。");
  }

  const db = await databaseOrThrow();
  const existingPasswordUser = await getUserByOpenId(user.openId);
  if (existingPasswordUser) {
    await upsertUser({
      ...user,
      friendCode: existingPasswordUser.friendCode ?? undefined,
    });
    const refreshed = await getUserByOpenId(user.openId);
    if (refreshed) return refreshed;
  }

  const legacyUser = await getUserByEmail(user.email);
  if (legacyUser) {
    await db
      .update(users)
      .set({
        openId: user.openId,
        name: user.name ?? legacyUser.name,
        email: user.email,
        passwordHash: user.passwordHash,
        loginMethod: "password",
        lastSignedIn: user.lastSignedIn ?? new Date(),
      })
      .where(eq(users.id, legacyUser.id));
    const migrated = await getUserByOpenId(user.openId);
    if (migrated) return migrated;
  }

  await upsertUser(user);
  const created = await getUserByOpenId(user.openId);
  if (!created) throw new Error("アカウントを作成できませんでした。");
  return created;
}

function toMountain(row: typeof mountains.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    elevation: row.elevation,
    location: row.location,
    prefecture: row.prefecture,
    difficulty: row.difficulty,
    description: row.description,
    recommendedSeason: row.recommendedSeason,
    estimatedTime: row.estimatedTime,
    imageUrl: row.imageUrl,
    stampDesign: {
      text: row.stampText,
      icon: row.stampIcon,
      color: row.stampColor,
      bgColor: row.stampBgColor,
      borderColor: row.stampBorderColor,
    },
  };
}

function toRecord(row: typeof climbRecords.$inferSelect) {
  return {
    id: row.id,
    mountainId: row.mountainId,
    climbDate: String(row.climbDate),
    memo: row.memo,
    weather: row.weather ?? undefined,
    companions: row.companions ?? undefined,
    photos: row.photoUrls ?? [],
    stampId: row.stampId,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : new Date(row.createdAt).toISOString(),
    xpEarned: row.xpEarned,
    companionSkillUsed: row.companionSkillUsed ?? undefined,
    companionSkillName: row.companionSkillName ?? undefined,
    companionBonusXp: row.companionBonusXp ?? undefined,
    hasRainbowGlow: row.hasRainbowGlow,
    luckyFortune: row.luckyFortune ?? undefined,
    triviaText: row.triviaText ?? undefined,
    companionBonusMessage: row.companionBonusMessage ?? undefined,
  };
}

function toProfile(
  row: typeof userProfiles.$inferSelect,
  user: User,
  unlockedBadges: string[]
) {
  return {
    nickname: row.nickname,
    avatarUrl: row.avatarUrl,
    bio: row.bio,
    level: row.level,
    xp: row.xp,
    xpToNextLevel: row.xpToNextLevel,
    unlockedBadges,
    email: user.email ?? undefined,
    companionName: row.companionName,
    companionAnimal: row.companionAnimal,
    companionSkinStage: row.companionSkinStage,
    isBanned: row.isBanned,
    homePrefecture: row.homePrefecture,
    preferredCondition: row.preferredCondition,
    isPremium: row.isPremium,
  };
}

async function ensureProfile(user: User) {
  const db = await databaseOrThrow();
  await db
    .insert(userProfiles)
    .values({
      userId: user.id,
      nickname: (
        user.name?.trim() ||
        user.email?.split("@")[0] ||
        "登山者"
      ).slice(0, 80),
      avatarUrl: "🥾",
      bio: "",
    })
    .onDuplicateKeyUpdate({ set: { userId: sql`values(userId)` } });

  const templates = await db
    .select({ id: challengeTemplates.id })
    .from(challengeTemplates);
  if (templates.length > 0) {
    await db
      .insert(userChallenges)
      .values(
        templates.map(template => ({
          userId: user.id,
          templateId: template.id,
        }))
      )
      .onDuplicateKeyUpdate({ set: { userId: sql`values(userId)` } });
  }

  const profiles = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, user.id))
    .limit(1);
  if (!profiles[0]) throw new Error("プロフィールの初期化に失敗しました。");
  return profiles[0];
}

export async function getCatalogue() {
  const db = await databaseOrThrow();
  const [mountainRows, albumRows, albumMountainRows, badgeRows] =
    await Promise.all([
      db
        .select()
        .from(mountains)
        .where(eq(mountains.isPublished, true))
        .orderBy(asc(mountains.name)),
      db.select().from(albums).orderBy(asc(albums.title)),
      db.select().from(albumMountains).orderBy(asc(albumMountains.position)),
      db.select().from(badges).orderBy(asc(badges.title)),
    ]);

  const mountainsById = new Map(
    mountainRows.map(row => [row.id, toMountain(row)])
  );
  const albumMountainIds = new Map<string, string[]>();
  for (const row of albumMountainRows) {
    albumMountainIds.set(row.albumId, [
      ...(albumMountainIds.get(row.albumId) ?? []),
      row.mountainId,
    ]);
  }

  return {
    mountains: mountainRows.map(toMountain),
    albums: albumRows.map(album => ({
      id: album.id,
      title: album.title,
      description: album.description,
      coverColor: album.coverColor,
      accentColor: album.accentColor,
      mountainIds: (albumMountainIds.get(album.id) ?? []).filter(id =>
        mountainsById.has(id)
      ),
    })),
    badges: badgeRows.map(badge => ({
      id: badge.id,
      title: badge.title,
      description: badge.description,
      icon: badge.icon,
      requirement: badge.requirement,
    })),
  };
}

export async function getDashboard(user: User) {
  const db = await databaseOrThrow();
  const profile = await ensureProfile(user);
  const participantRows = await db
    .select({ recordId: climbRecordParticipants.recordId })
    .from(climbRecordParticipants)
    .where(eq(climbRecordParticipants.userId, user.id));
  const sharedRecordIds = participantRows.map(row => row.recordId);
  const recordRows = await db
    .select()
    .from(climbRecords)
    .where(
      sharedRecordIds.length
        ? or(
            eq(climbRecords.userId, user.id),
            inArray(climbRecords.id, sharedRecordIds)
          )
        : eq(climbRecords.userId, user.id)
    )
    .orderBy(desc(climbRecords.createdAt));
  const [challengeRows, badgeRows] = await Promise.all([
    db
      .select({
        id: challengeTemplates.id,
        title: challengeTemplates.title,
        description: challengeTemplates.description,
        xpReward: challengeTemplates.xpReward,
        isCompleted: userChallenges.isCompleted,
      })
      .from(userChallenges)
      .innerJoin(
        challengeTemplates,
        eq(userChallenges.templateId, challengeTemplates.id)
      )
      .where(eq(userChallenges.userId, user.id))
      .orderBy(asc(challengeTemplates.id)),
    db
      .select({ badgeId: userBadges.badgeId })
      .from(userBadges)
      .where(eq(userBadges.userId, user.id)),
  ]);

  return {
    profile: toProfile(
      profile,
      user,
      badgeRows.map(row => row.badgeId)
    ),
    records: recordRows.map(toRecord),
    challenges: challengeRows.map(challenge => ({
      ...challenge,
      isCompleted: challenge.isCompleted,
    })),
  };
}

export async function updateProfile(
  user: User,
  input: {
    nickname: string;
    bio: string;
    avatarUrl: string;
    companionName: string;
    companionAnimal: string;
    companionSkinStage: number;
    homePrefecture: string;
    preferredCondition: string;
  }
) {
  const db = await databaseOrThrow();
  await ensureProfile(user);
  await db
    .update(userProfiles)
    .set(input)
    .where(eq(userProfiles.userId, user.id));
  return getDashboard(user);
}

async function updateAutomaticChallenges(
  userId: number,
  mountainId: string,
  memo: string,
  now: Date
) {
  const db = await databaseOrThrow();
  const mountainRows = await db
    .select({ prefecture: mountains.prefecture })
    .from(mountains)
    .where(eq(mountains.id, mountainId))
    .limit(1);
  const challengeRows = await db
    .select()
    .from(userChallenges)
    .where(eq(userChallenges.userId, userId));
  const incomplete = new Set(
    challengeRows
      .filter(challenge => !challenge.isCompleted)
      .map(challenge => challenge.templateId)
  );
  const complete = [
    "challenge_1",
    ...(memo.trim().length >= 15 ? ["challenge_2"] : []),
    ...(mountainRows[0]?.prefecture === "京都" ? ["challenge_3"] : []),
  ].filter(id => incomplete.has(id));

  if (complete.length > 0) {
    await db
      .update(userChallenges)
      .set({ isCompleted: true, completedAt: now })
      .where(
        and(
          eq(userChallenges.userId, userId),
          inArray(userChallenges.templateId, complete)
        )
      );
  }

  if (complete.length === 0) return 0;
  const templates = await db
    .select({
      id: challengeTemplates.id,
      xpReward: challengeTemplates.xpReward,
    })
    .from(challengeTemplates)
    .where(inArray(challengeTemplates.id, complete));
  return templates.reduce((sum, template) => sum + template.xpReward, 0);
}

async function refreshBadges(userId: number, level: number) {
  const db = await databaseOrThrow();
  const records = await db
    .select({ mountainId: climbRecords.mountainId })
    .from(climbRecords)
    .where(eq(climbRecords.userId, userId));
  const climbed = new Set(records.map(record => record.mountainId));
  const badgeIds = new Set<string>();

  if (records.length >= 1) badgeIds.add("first_climb");
  if (climbed.size >= 5) badgeIds.add("collection_expert");
  if (level >= 10) badgeIds.add("level_10");
  if (
    [
      "hiei",
      "daimonji",
      "nyoigatake",
      "uryusan",
      "inariyama",
      "otowayama",
      "ushioyama",
      "yoshidayama",
      "amidagamine",
      "shogunzuka",
      "oiwayama",
      "shinmeiyama",
      "dainichiyama",
    ].filter(id => climbed.has(id)).length >= 3
  )
    badgeIds.add("kyoto_master");
  if (
    [
      "minakoyama",
      "sajikigatake",
      "amagatake",
      "suitaisan",
      "konpirasan",
      "kuramayama",
      "kibuneyama",
      "hyotankuzureyama",
      "minoragatake",
      "mukaiyama",
      "funaokayama",
      "kouyama",
      "kinugasayama",
    ].filter(id => climbed.has(id)).length >= 3
  )
    badgeIds.add("shiga_master");
  if (
    [
      "atagosan",
      "ryugatake",
      "jizosan",
      "ponponyama",
      "ogurayama",
      "arashiyama",
      "matsuoyama",
      "narabigaoka",
      "karasugatake",
      "sawayama",
    ].filter(id => climbed.has(id)).length >= 3
  )
    badgeIds.add("nara_master");
  if (badgeIds.size > 0) {
    await db
      .insert(userBadges)
      .values(Array.from(badgeIds).map(badgeId => ({ userId, badgeId })))
      .onDuplicateKeyUpdate({ set: { userId: sql`values(userId)` } });
  }
}

export function buildParticipantRows(recordId: string, friendIds: number[]) {
  return Array.from(new Set(friendIds)).map(userId => ({ recordId, userId }));
}

export async function createClimbRecord(
  user: User,
  input: {
    mountainId: string;
    climbDate: string;
    memo: string;
    photos: string[];
    weather?: string;
    companions?: string;
    companionSkillUsed?: string;
    companionSkillName?: string;
    hasRainbowGlow?: boolean;
    luckyFortune?: string;
    triviaText?: string;
    friendIds?: number[];
  }
) {
  const db = await databaseOrThrow();
  const [mountain] = await db
    .select()
    .from(mountains)
    .where(
      and(eq(mountains.id, input.mountainId), eq(mountains.isPublished, true))
    )
    .limit(1);
  if (!mountain) throw new Error("選択された山が見つかりません。");

  const profile = await ensureProfile(user);
  const existing = await db
    .select({ id: climbRecords.id })
    .from(climbRecords)
    .where(
      and(
        eq(climbRecords.userId, user.id),
        eq(climbRecords.mountainId, input.mountainId)
      )
    )
    .limit(1);
  const now = new Date();
  const climbXp = calculateClimbXp({
    isFirstClimb: existing.length === 0,
    hasPhoto: input.photos.length > 0,
    hasMemo: input.memo.trim().length > 0,
    companionSkinStage: profile.companionSkinStage,
  });
  const challengeXp = await updateAutomaticChallenges(
    user.id,
    input.mountainId,
    input.memo,
    now
  );
  const earnedXp = climbXp + challengeXp;
  const nextProgress = calculateLevel(profile.totalXp + earnedXp);
  const recordId = nanoid();

  await db.insert(climbRecords).values({
    id: recordId,
    userId: user.id,
    mountainId: input.mountainId,
    climbDate: new Date(`${input.climbDate}T00:00:00.000Z`),
    memo: input.memo.trim(),
    weather: input.weather || null,
    companions: input.companions || null,
    photoUrls: input.photos,
    stampId: `stamp_${input.mountainId}`,
    xpEarned: earnedXp,
    companionSkillUsed: input.companionSkillUsed || null,
    companionSkillName: input.companionSkillName || null,
    hasRainbowGlow: Boolean(input.hasRainbowGlow || profile.isPremium),
    luckyFortune: input.luckyFortune || null,
    triviaText: input.triviaText || null,
  });
  if (input.friendIds?.length) {
    await db
      .insert(climbRecordParticipants)
      .values(buildParticipantRows(recordId, input.friendIds));
  }
  await db
    .update(userProfiles)
    .set(nextProgress)
    .where(eq(userProfiles.userId, user.id));
  await refreshBadges(user.id, nextProgress.level);

  const [record] = await db
    .select()
    .from(climbRecords)
    .where(eq(climbRecords.id, recordId))
    .limit(1);
  if (!record) throw new Error("登頂記録の保存に失敗しました。");
  return {
    record: toRecord(record),
    xpEarned: earnedXp,
    levelUp: nextProgress.level > profile.level,
    level: nextProgress.level,
  };
}

export async function updateClimbRecord(
  user: User,
  input: {
    id: string;
    climbDate: string;
    memo: string;
    weather?: string;
    companions?: string;
    photos: string[];
  }
) {
  const db = await databaseOrThrow();
  const existing = await db
    .select({ id: climbRecords.id })
    .from(climbRecords)
    .where(and(eq(climbRecords.id, input.id), eq(climbRecords.userId, user.id)))
    .limit(1);
  if (!existing[0]) throw new Error("編集対象の登頂記録が見つかりません。");
  await db
    .update(climbRecords)
    .set({
      climbDate: new Date(`${input.climbDate}T00:00:00.000Z`),
      memo: input.memo.trim(),
      weather: input.weather || null,
      companions: input.companions || null,
      photoUrls: input.photos,
    })
    .where(eq(climbRecords.id, input.id));
  return getDashboard(user);
}

export async function deleteClimbRecord(user: User, id: string) {
  const db = await databaseOrThrow();
  const existing = await db
    .select({ id: climbRecords.id })
    .from(climbRecords)
    .where(and(eq(climbRecords.id, id), eq(climbRecords.userId, user.id)))
    .limit(1);
  if (!existing[0]) throw new Error("削除対象の登頂記録が見つかりません。");
  await db.delete(climbRecords).where(eq(climbRecords.id, id));
  const remaining = await db
    .select({ xpEarned: climbRecords.xpEarned })
    .from(climbRecords)
    .where(eq(climbRecords.userId, user.id));
  const totalXp = remaining.reduce((sum, record) => sum + record.xpEarned, 0);
  const progress = calculateLevel(totalXp);
  await db
    .update(userProfiles)
    .set(progress)
    .where(eq(userProfiles.userId, user.id));
  return getDashboard(user);
}

export async function resetUserProgress(user: User) {
  const db = await databaseOrThrow();
  await db.delete(climbRecords).where(eq(climbRecords.userId, user.id));
  await db.delete(userBadges).where(eq(userBadges.userId, user.id));
  await db
    .update(userChallenges)
    .set({ isCompleted: false, completedAt: null })
    .where(eq(userChallenges.userId, user.id));
  await db
    .update(userProfiles)
    .set(calculateLevel(0))
    .where(eq(userProfiles.userId, user.id));
  return getDashboard(user);
}

export async function completeChallenge(user: User, templateId: string) {
  const db = await databaseOrThrow();
  const profile = await ensureProfile(user);
  const [challenge] = await db
    .select({
      isCompleted: userChallenges.isCompleted,
      xpReward: challengeTemplates.xpReward,
    })
    .from(userChallenges)
    .innerJoin(
      challengeTemplates,
      eq(userChallenges.templateId, challengeTemplates.id)
    )
    .where(
      and(
        eq(userChallenges.userId, user.id),
        eq(userChallenges.templateId, templateId)
      )
    )
    .limit(1);
  if (!challenge) throw new Error("対象のクエストが見つかりません。");
  if (challenge.isCompleted) return getDashboard(user);

  const progress = calculateLevel(profile.totalXp + challenge.xpReward);
  await db
    .update(userChallenges)
    .set({ isCompleted: true, completedAt: new Date() })
    .where(
      and(
        eq(userChallenges.userId, user.id),
        eq(userChallenges.templateId, templateId)
      )
    );
  await db
    .update(userProfiles)
    .set(progress)
    .where(eq(userProfiles.userId, user.id));
  await refreshBadges(user.id, progress.level);
  return getDashboard(user);
}

export async function listCompanionMessages(user: User) {
  const db = await databaseOrThrow();
  const rows = await db
    .select()
    .from(companionMessages)
    .where(eq(companionMessages.userId, user.id))
    .orderBy(asc(companionMessages.createdAt));
  return rows.map(row => ({
    id: row.id,
    role: row.role,
    text: row.text,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : new Date(row.createdAt).toISOString(),
  }));
}

export async function sendCompanionMessage(user: User, text: string) {
  const db = await databaseOrThrow();
  const profile = await ensureProfile(user);
  const recentRecords = await db
    .select({ id: climbRecords.id })
    .from(climbRecords)
    .where(eq(climbRecords.userId, user.id));
  const normalized = text.trim();

  let aiReplyText = "";
  try {
    const history = await db
      .select()
      .from(companionMessages)
      .where(eq(companionMessages.userId, user.id))
      .orderBy(asc(companionMessages.createdAt))
      .limit(10);

    const messagesForLLM = [
      {
        role: "system" as const,
        content: `あなたは登山の相棒である可愛い動物のコンパニオン「${profile.companionName || "ヤマコ"}」です。親しみやすく元気な口調で、登山者の安全、持ち物、天候、ルート選び、登頂記録についてアドバイスや励ましの言葉を伝えます。ユーザーのこれまでの登頂数は${recentRecords.length}回です。\n${companionReplyGuidance}`,
      },
      ...history.map(h => ({
        role: (h.role === "user" ? "user" : "assistant") as
          | "user"
          | "assistant",
        content: h.text,
      })),
      { role: "user" as const, content: normalized },
    ];

    const result = await invokeLLM({
      messages: messagesForLLM,
      maxTokens: 320,
    });

    const choice = result.choices[0];
    if (choice && typeof choice.message.content === "string") {
      aiReplyText = compactCompanionReply(choice.message.content);
    } else if (choice && Array.isArray(choice.message.content)) {
      aiReplyText = compactCompanionReply(
        choice.message.content
          .map((p: any) => (p.type === "text" ? p.text : ""))
          .join("")
      );
    }
  } catch (error) {
    console.error(
      "[CompanionAI] LLM invocation failed, falling back to heuristic reply:",
      error
    );
  }

  if (!aiReplyText) {
    aiReplyText = compactCompanionReply(
      `${profile.companionName || "ヤマコ"}より：${
        normalized.includes("装備") || normalized.includes("持ち物")
          ? "安全のため、地図・雨具・水分・行動食・ライトを確認してから出発しよう。"
          : normalized.includes("天気") || normalized.includes("雨")
            ? "出発前に最新の気象情報を確認し、悪天候が予想されるときは無理をしないでね。"
            : `登頂記録は現在${recentRecords.length}件です。山の詳細と行程を確認して、安全第一で楽しもう。`
      }`
    );
  }

  const userMessage = {
    id: nanoid(),
    userId: user.id,
    role: "user" as const,
    text: normalized,
  };
  const reply = {
    id: nanoid(),
    userId: user.id,
    role: "model" as const,
    text: aiReplyText,
  };
  await db.insert(companionMessages).values([userMessage, reply]);
  return {
    userMessage: { ...userMessage, createdAt: new Date().toISOString() },
    reply: { ...reply, createdAt: new Date().toISOString() },
  };
}

export async function createInquiry(
  user: User,
  input: {
    type: "bug" | "question" | "feedback" | "other";
    title: string;
    content: string;
  }
) {
  const db = await databaseOrThrow();
  await ensureProfile(user);
  const id = nanoid();
  await db.insert(inquiries).values({ id, userId: user.id, ...input });
  return { id };
}

export async function listInquiries(user: User) {
  const db = await databaseOrThrow();
  const ownOnly = user.role !== "admin";
  const rows = ownOnly
    ? await db
        .select()
        .from(inquiries)
        .where(eq(inquiries.userId, user.id))
        .orderBy(desc(inquiries.createdAt))
    : await db.select().from(inquiries).orderBy(desc(inquiries.createdAt));
  const ids = rows.map(row => row.id);
  const replies =
    ids.length === 0
      ? []
      : await db
          .select()
          .from(inquiryReplies)
          .where(inArray(inquiryReplies.inquiryId, ids))
          .orderBy(asc(inquiryReplies.createdAt));
  return rows.map(row => ({
    ...row,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : new Date(row.createdAt).toISOString(),
    replies: replies
      .filter(reply => reply.inquiryId === row.id)
      .map(reply => ({
        ...reply,
        timestamp:
          reply.createdAt instanceof Date
            ? reply.createdAt.toISOString()
            : new Date(reply.createdAt).toISOString(),
      })),
  }));
}
