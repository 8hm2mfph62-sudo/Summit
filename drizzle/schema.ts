import {
  boolean,
  date,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Core identity table managed by email and password authentication. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  friendCode: varchar("friendCode", { length: 16 }).unique(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/**
 * Historical OTP delivery records retained for data-retention continuity.
 * Password authentication never reads or writes this table.
 */
export const emailLoginTokens = mysqlTable(
  "emailLoginTokens",
  {
    id: int("id").autoincrement().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
    expiresAt: timestamp("expiresAt").notNull(),
    usedAt: timestamp("usedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("email_login_tokens_email_idx").on(table.email)]
);

/** Mountain catalogue. The former client-side catalogue is migrated here. */
export const mountains = mysqlTable(
  "mountains",
  {
    id: varchar("id", { length: 128 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    elevation: int("elevation").notNull(),
    location: text("location").notNull(),
    prefecture: varchar("prefecture", { length: 64 }).notNull(),
    difficulty: mysqlEnum("difficulty", [
      "beginner",
      "intermediate",
      "advanced",
    ]).notNull(),
    description: text("description").notNull(),
    recommendedSeason: varchar("recommendedSeason", { length: 255 }).notNull(),
    estimatedTime: varchar("estimatedTime", { length: 255 }).notNull(),
    imageUrl: varchar("imageUrl", { length: 2048 }).notNull(),
    stampText: varchar("stampText", { length: 255 }).notNull(),
    stampIcon: varchar("stampIcon", { length: 64 }).notNull(),
    stampColor: varchar("stampColor", { length: 128 }).notNull(),
    stampBgColor: varchar("stampBgColor", { length: 128 }).notNull(),
    stampBorderColor: varchar("stampBorderColor", { length: 128 }).notNull(),
    isPublished: boolean("isPublished").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("mountains_prefecture_idx").on(table.prefecture),
    index("mountains_difficulty_idx").on(table.difficulty),
  ]
);

export const albums = mysqlTable("albums", {
  id: varchar("id", { length: 128 }).primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  coverColor: varchar("coverColor", { length: 128 }).notNull(),
  accentColor: varchar("accentColor", { length: 128 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const albumMountains = mysqlTable(
  "albumMountains",
  {
    albumId: varchar("albumId", { length: 128 })
      .notNull()
      .references(() => albums.id, { onDelete: "cascade" }),
    mountainId: varchar("mountainId", { length: 128 })
      .notNull()
      .references(() => mountains.id, { onDelete: "cascade" }),
    position: int("position").notNull(),
  },
  table => [
    primaryKey({ columns: [table.albumId, table.mountainId] }),
    index("album_mountains_mountain_idx").on(table.mountainId),
  ]
);

export const badges = mysqlTable("badges", {
  id: varchar("id", { length: 128 }).primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 64 }).notNull(),
  requirement: text("requirement").notNull(),
});

export const challengeTemplates = mysqlTable("challengeTemplates", {
  id: varchar("id", { length: 128 }).primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  xpReward: int("xpReward").notNull(),
});

/** One application profile is created for each authenticated Manus user. */
export const userProfiles = mysqlTable(
  "userProfiles",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    nickname: varchar("nickname", { length: 80 }).notNull(),
    avatarUrl: varchar("avatarUrl", { length: 2048 }).notNull(),
    bio: text("bio").notNull(),
    totalXp: int("totalXp").default(0).notNull(),
    level: int("level").default(1).notNull(),
    xp: int("xp").default(0).notNull(),
    xpToNextLevel: int("xpToNextLevel").default(150).notNull(),
    companionName: varchar("companionName", { length: 80 })
      .default("ヤマコ")
      .notNull(),
    companionAnimal: varchar("companionAnimal", { length: 32 })
      .default("squirrel")
      .notNull(),
    companionSkinStage: int("companionSkinStage").default(1).notNull(),
    homePrefecture: varchar("homePrefecture", { length: 64 })
      .default("京都")
      .notNull(),
    preferredCondition: varchar("preferredCondition", { length: 80 })
      .default("景色重視")
      .notNull(),
    isBanned: boolean("isBanned").default(false).notNull(),
    isPremium: boolean("isPremium").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("user_profiles_user_id_unique").on(table.userId)]
);

/** Individual climb records owned by the authenticated user. Photo values are S3 URLs, never base64 data. */
export const climbRecords = mysqlTable(
  "climbRecords",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mountainId: varchar("mountainId", { length: 128 })
      .notNull()
      .references(() => mountains.id, { onDelete: "restrict" }),
    climbDate: date("climbDate").notNull(),
    memo: text("memo").notNull(),
    weather: varchar("weather", { length: 32 }),
    companions: varchar("companions", { length: 255 }),
    photoUrls: json("photoUrls").$type<string[]>().notNull(),
    stampId: varchar("stampId", { length: 255 }).notNull(),
    xpEarned: int("xpEarned").notNull(),
    companionSkillUsed: varchar("companionSkillUsed", { length: 128 }),
    companionSkillName: varchar("companionSkillName", { length: 255 }),
    companionBonusXp: int("companionBonusXp"),
    hasRainbowGlow: boolean("hasRainbowGlow").default(false).notNull(),
    luckyFortune: varchar("luckyFortune", { length: 255 }),
    triviaText: text("triviaText"),
    companionBonusMessage: text("companionBonusMessage"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("climb_records_user_created_idx").on(table.userId, table.createdAt),
    index("climb_records_user_mountain_idx").on(table.userId, table.mountainId),
  ]
);

export const userChallenges = mysqlTable(
  "userChallenges",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    templateId: varchar("templateId", { length: 128 })
      .notNull()
      .references(() => challengeTemplates.id, { onDelete: "cascade" }),
    isCompleted: boolean("isCompleted").default(false).notNull(),
    completedAt: timestamp("completedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("user_challenges_user_template_unique").on(
      table.userId,
      table.templateId
    ),
  ]
);

export const userBadges = mysqlTable(
  "userBadges",
  {
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    badgeId: varchar("badgeId", { length: 128 })
      .notNull()
      .references(() => badges.id, { onDelete: "cascade" }),
    unlockedAt: timestamp("unlockedAt").defaultNow().notNull(),
  },
  table => [primaryKey({ columns: [table.userId, table.badgeId] })]
);

export const inquiries = mysqlTable(
  "inquiries",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: mysqlEnum("type", ["bug", "question", "feedback", "other"]).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content").notNull(),
    status: mysqlEnum("status", ["open", "answered", "closed"])
      .default("open")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("inquiries_user_created_idx").on(table.userId, table.createdAt),
  ]
);

export const inquiryReplies = mysqlTable(
  "inquiryReplies",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    inquiryId: varchar("inquiryId", { length: 64 })
      .notNull()
      .references(() => inquiries.id, { onDelete: "cascade" }),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sender: mysqlEnum("sender", ["user", "admin"]).notNull(),
    nickname: varchar("nickname", { length: 80 }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("inquiry_replies_inquiry_created_idx").on(
      table.inquiryId,
      table.createdAt
    ),
  ]
);

/** Persisted companion conversation history for each authenticated user. */
export const companionMessages = mysqlTable(
  "companionMessages",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: mysqlEnum("role", ["user", "model"]).notNull(),
    text: text("text").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("companion_messages_user_created_idx").on(
      table.userId,
      table.createdAt
    ),
  ]
);

/** A persistent hiking plan, created either with friends or Yamako. */
export const hikingPlans = mysqlTable(
  "hikingPlans",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    ownerId: int("ownerId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mode: mysqlEnum("mode", ["friends", "ai"]).notNull(),
    status: mysqlEnum("status", ["draft", "ready", "planned", "archived"])
      .default("draft")
      .notNull(),
    title: varchar("title", { length: 120 }).notNull(),
    mountainId: varchar("mountainId", { length: 128 }).references(
      () => mountains.id,
      { onDelete: "set null" }
    ),
    mountainName: varchar("mountainName", { length: 255 }),
    planDate: date("planDate"),
    meetingTime: varchar("meetingTime", { length: 16 }),
    meetingPlace: varchar("meetingPlace", { length: 255 }),
    routeSummary: text("routeSummary"),
    transport: varchar("transport", { length: 255 }),
    notes: text("notes"),
    equipmentChecklist: json("equipmentChecklist").$type<string[]>().notNull(),
    safetyNote: text("safetyNote"),
    version: int("version").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("hiking_plans_owner_updated_idx").on(table.ownerId, table.updatedAt),
    index("hiking_plans_owner_status_idx").on(table.ownerId, table.status),
    index("hiking_plans_mountain_idx").on(table.mountainId),
  ]
);

/** Membership controls plan visibility and group chat access. */
export const planParticipants = mysqlTable(
  "planParticipants",
  {
    planId: varchar("planId", { length: 64 })
      .notNull()
      .references(() => hikingPlans.id, { onDelete: "cascade" }),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: mysqlEnum("role", ["owner", "member"]).notNull(),
    membershipStatus: mysqlEnum("membershipStatus", [
      "invited",
      "active",
      "declined",
      "removed",
    ])
      .default("invited")
      .notNull(),
    invitedAt: timestamp("invitedAt").defaultNow().notNull(),
    joinedAt: timestamp("joinedAt"),
  },
  table => [
    primaryKey({ columns: [table.planId, table.userId] }),
    index("plan_participants_user_status_idx").on(
      table.userId,
      table.membershipStatus
    ),
    index("plan_participants_plan_status_idx").on(
      table.planId,
      table.membershipStatus
    ),
  ]
);

/** One thread per plan: friends chat together, or the owner chats with Yamako. */
export const planMessages = mysqlTable(
  "planMessages",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    planId: varchar("planId", { length: 64 })
      .notNull()
      .references(() => hikingPlans.id, { onDelete: "cascade" }),
    senderUserId: int("senderUserId").references(() => users.id, {
      onDelete: "set null",
    }),
    kind: mysqlEnum("kind", ["user", "ai", "system"]).default("user").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("plan_messages_plan_created_idx").on(table.planId, table.createdAt),
  ]
);

export const friendships = mysqlTable(
  "friendships",
  {
    id: int("id").autoincrement().primaryKey(),
    requesterId: int("requesterId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    addresseeId: int("addresseeId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", ["pending", "accepted", "declined"])
      .default("pending")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("friendships_pair_unique").on(
      table.requesterId,
      table.addresseeId
    ),
    index("friendships_addressee_status_idx").on(
      table.addresseeId,
      table.status
    ),
  ]
);

export const climbRecordParticipants = mysqlTable(
  "climbRecordParticipants",
  {
    recordId: varchar("recordId", { length: 64 })
      .notNull()
      .references(() => climbRecords.id, { onDelete: "cascade" }),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    primaryKey({ columns: [table.recordId, table.userId] }),
    index("record_participants_user_idx").on(table.userId, table.createdAt),
  ]
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Mountain = typeof mountains.$inferSelect;
export type Album = typeof albums.$inferSelect;
export type Badge = typeof badges.$inferSelect;
export type ChallengeTemplate = typeof challengeTemplates.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;
export type ClimbRecord = typeof climbRecords.$inferSelect;
export type HikingPlan = typeof hikingPlans.$inferSelect;
export type PlanParticipant = typeof planParticipants.$inferSelect;
export type PlanMessage = typeof planMessages.$inferSelect;
export type Friendship = typeof friendships.$inferSelect;
export type ClimbRecordParticipant =
  typeof climbRecordParticipants.$inferSelect;
