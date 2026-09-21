import { and, asc, desc, eq, inArray, ne, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  hikingPlans,
  mountains,
  planMessages,
  planParticipants,
  userProfiles,
  users,
  type HikingPlan,
  type User,
} from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import {
  COMPANION_GEMINI_MODEL,
  COMPANION_GEMINI_THINKING,
  compactCompanionReply,
} from "./companion";
import { databaseOrThrow } from "./db";
import { getAcceptedFriendIds } from "./friends";

const dateInput = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日付はYYYY-MM-DD形式で入力してください。");

export const planPatchSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    mountainId: z.string().trim().min(1).max(128).nullable().optional(),
    mountainName: z.string().trim().min(1).max(255).nullable().optional(),
    planDate: dateInput.nullable().optional(),
    meetingTime: z.string().trim().max(16).nullable().optional(),
    meetingPlace: z.string().trim().max(255).nullable().optional(),
    routeSummary: z.string().trim().max(5000).nullable().optional(),
    transport: z.string().trim().max(255).nullable().optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    equipmentChecklist: z
      .array(z.string().trim().min(1).max(120))
      .max(30)
      .optional(),
    safetyNote: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

export type PlanPatch = z.infer<typeof planPatchSchema>;

const AI_PLAN_JSON_SCHEMA = {
  name: "hiking_plan_turn",
  strict: true,
  schema: {
    type: "object",
    properties: {
      reply: { type: "string" },
      nextQuestion: { type: "string" },
      patch: {
        type: "object",
        properties: {
          title: { type: "string" },
          mountainName: { type: "string" },
          planDate: { type: "string" },
          meetingTime: { type: "string" },
          meetingPlace: { type: "string" },
          routeSummary: { type: "string" },
          transport: { type: "string" },
          notes: { type: "string" },
          equipmentChecklist: { type: "array", items: { type: "string" } },
          safetyNote: { type: "string" },
        },
        additionalProperties: false,
      },
      ready: { type: "boolean" },
    },
    required: ["reply", "nextQuestion", "patch", "ready"],
    additionalProperties: false,
  },
} as const;

const aiTurnSchema = z.object({
  reply: z.string().trim().min(1).max(1000),
  nextQuestion: z.string().trim().min(1).max(400),
  patch: planPatchSchema.omit({ mountainId: true }),
  ready: z.boolean(),
});

function toIso(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function toPlanDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : value.slice(0, 10);
}

function planPayload(plan: HikingPlan) {
  return {
    id: plan.id,
    ownerId: plan.ownerId,
    mode: plan.mode,
    status: plan.status,
    title: plan.title,
    mountainId: plan.mountainId,
    mountainName: plan.mountainName,
    planDate: toPlanDate(plan.planDate),
    meetingTime: plan.meetingTime,
    meetingPlace: plan.meetingPlace,
    routeSummary: plan.routeSummary,
    transport: plan.transport,
    notes: plan.notes,
    equipmentChecklist: plan.equipmentChecklist,
    safetyNote: plan.safetyNote,
    version: plan.version,
    createdAt: toIso(plan.createdAt),
    updatedAt: toIso(plan.updatedAt),
  };
}

async function assertMountain(mountainId: string | null | undefined) {
  if (!mountainId) return null;
  const db = await databaseOrThrow();
  const rows = await db
    .select({ id: mountains.id, name: mountains.name })
    .from(mountains)
    .where(and(eq(mountains.id, mountainId), eq(mountains.isPublished, true)))
    .limit(1);
  if (!rows[0]) throw new Error("選択された山が見つかりません。");
  return rows[0];
}

async function getMembership(userId: number, planId: string) {
  const db = await databaseOrThrow();
  const rows = await db
    .select({ plan: hikingPlans, participant: planParticipants })
    .from(hikingPlans)
    .leftJoin(
      planParticipants,
      and(
        eq(planParticipants.planId, hikingPlans.id),
        eq(planParticipants.userId, userId)
      )
    )
    .where(eq(hikingPlans.id, planId))
    .limit(1);
  const row = rows[0];
  const participant = row?.participant;
  if (!row || !participant) throw new Error("登山計画書が見つかりません。");
  return { plan: row.plan, participant };
}

async function requireActiveMember(user: User, planId: string) {
  const entry = await getMembership(user.id, planId);
  if (entry.participant.membershipStatus !== "active") {
    throw new Error("この登山計画書にはまだ参加していません。");
  }
  return entry;
}

async function requireOwner(user: User, planId: string) {
  const entry = await requireActiveMember(user, planId);
  if (entry.plan.ownerId !== user.id || entry.participant.role !== "owner") {
    throw new Error("計画書を編集できるのは作成者だけです。");
  }
  return entry;
}

async function planParticipantsPayload(planId: string) {
  const db = await databaseOrThrow();
  const rows = await db
    .select({
      userId: planParticipants.userId,
      role: planParticipants.role,
      membershipStatus: planParticipants.membershipStatus,
      invitedAt: planParticipants.invitedAt,
      joinedAt: planParticipants.joinedAt,
      nickname: userProfiles.nickname,
      avatarUrl: userProfiles.avatarUrl,
    })
    .from(planParticipants)
    .innerJoin(users, eq(users.id, planParticipants.userId))
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(planParticipants.planId, planId));
  return rows.map(row => ({
    userId: row.userId,
    role: row.role,
    membershipStatus: row.membershipStatus,
    nickname: row.nickname || "登山者",
    avatarUrl: row.avatarUrl || "🥾",
    invitedAt: toIso(row.invitedAt),
    joinedAt: toIso(row.joinedAt),
  }));
}

async function messagesPayload(planId: string) {
  const db = await databaseOrThrow();
  const rows = await db
    .select({
      id: planMessages.id,
      kind: planMessages.kind,
      body: planMessages.body,
      createdAt: planMessages.createdAt,
      senderUserId: planMessages.senderUserId,
      nickname: userProfiles.nickname,
      avatarUrl: userProfiles.avatarUrl,
    })
    .from(planMessages)
    .leftJoin(users, eq(users.id, planMessages.senderUserId))
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(planMessages.planId, planId))
    .orderBy(asc(planMessages.createdAt));
  return rows.map(row => ({
    id: row.id,
    kind: row.kind,
    body: row.body,
    senderUserId: row.senderUserId,
    nickname: row.kind === "ai" ? "ヤマコ" : row.nickname || "登山者",
    avatarUrl: row.kind === "ai" ? "🐿️" : row.avatarUrl || "🥾",
    createdAt: toIso(row.createdAt),
  }));
}

function missingFields(plan: HikingPlan) {
  const labels: Array<[boolean, string]> = [
    [!plan.mountainName && !plan.mountainId, "行き先の山"],
    [!plan.planDate, "登山日"],
    [!plan.routeSummary, "ルート・行程"],
    [!plan.meetingTime, "集合または出発時刻"],
    [!plan.equipmentChecklist.length, "必携装備"],
  ];
  return labels.filter(([missing]) => missing).map(([, label]) => label);
}

function planUpdateValues(patch: PlanPatch, mountainName?: string | null) {
  return {
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.mountainId !== undefined ? { mountainId: patch.mountainId } : {}),
    ...(patch.mountainName !== undefined
      ? { mountainName: patch.mountainName }
      : mountainName !== undefined
        ? { mountainName }
        : {}),
    ...(patch.planDate !== undefined
      ? {
          planDate: patch.planDate
            ? new Date(`${patch.planDate}T00:00:00.000Z`)
            : null,
        }
      : {}),
    ...(patch.meetingTime !== undefined
      ? { meetingTime: patch.meetingTime }
      : {}),
    ...(patch.meetingPlace !== undefined
      ? { meetingPlace: patch.meetingPlace }
      : {}),
    ...(patch.routeSummary !== undefined
      ? { routeSummary: patch.routeSummary }
      : {}),
    ...(patch.transport !== undefined ? { transport: patch.transport } : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    ...(patch.equipmentChecklist !== undefined
      ? { equipmentChecklist: Array.from(new Set(patch.equipmentChecklist)) }
      : {}),
    ...(patch.safetyNote !== undefined ? { safetyNote: patch.safetyNote } : {}),
  };
}

export async function createFriendPlan(
  user: User,
  input: { title: string; friendIds: number[] }
) {
  const friendIds = await getAcceptedFriendIds(user, input.friendIds);
  const db = await databaseOrThrow();
  const now = new Date();
  const planId = nanoid();
  await db.transaction(async tx => {
    await tx.insert(hikingPlans).values({
      id: planId,
      ownerId: user.id,
      mode: "friends",
      title: input.title.trim(),
      equipmentChecklist: [],
    });
    await tx.insert(planParticipants).values({
      planId,
      userId: user.id,
      role: "owner",
      membershipStatus: "active",
      joinedAt: now,
    });
    if (friendIds.length) {
      await tx.insert(planParticipants).values(
        friendIds.map(friendId => ({
          planId,
          userId: friendId,
          role: "member" as const,
          membershipStatus: "invited" as const,
        }))
      );
    }
    await tx.insert(planMessages).values({
      id: nanoid(),
      planId,
      kind: "system",
      body: friendIds.length
        ? "フレンドを招待しました。参加するとグループで相談できます。"
        : "フレンドを招待して、山行の相談を始めましょう。",
    });
  });
  return getPlan(user, planId);
}

export async function createAiPlan(user: User) {
  const db = await databaseOrThrow();
  const planId = nanoid();
  const now = new Date();
  await db.transaction(async tx => {
    await tx.insert(hikingPlans).values({
      id: planId,
      ownerId: user.id,
      mode: "ai",
      title: "新しい登山計画",
      equipmentChecklist: [],
    });
    await tx.insert(planParticipants).values({
      planId,
      userId: user.id,
      role: "owner",
      membershipStatus: "active",
      joinedAt: now,
    });
    await tx.insert(planMessages).values({
      id: nanoid(),
      planId,
      kind: "ai",
      body: "計画書を一緒に作ろう。まず、どの山にいつ登る予定ですか？",
    });
  });
  return getPlan(user, planId);
}

export async function listPlans(user: User) {
  const db = await databaseOrThrow();
  const rows = await db
    .select({
      plan: hikingPlans,
      membershipStatus: planParticipants.membershipStatus,
    })
    .from(hikingPlans)
    .leftJoin(
      planParticipants,
      and(
        eq(planParticipants.planId, hikingPlans.id),
        eq(planParticipants.userId, user.id)
      )
    )
    .where(
      or(
        eq(hikingPlans.ownerId, user.id),
        and(
          eq(planParticipants.userId, user.id),
          ne(planParticipants.membershipStatus, "removed")
        )
      )
    )
    .orderBy(desc(hikingPlans.updatedAt));
  return rows.map(row => ({
    ...planPayload(row.plan),
    membershipStatus: row.membershipStatus || "active",
    missingFields: missingFields(row.plan),
  }));
}

export async function getPlan(user: User, planId: string) {
  const entry = await getMembership(user.id, planId);
  const canChat = entry.participant.membershipStatus === "active";
  const isOwner = entry.plan.ownerId === user.id;
  const [participants, messages] = await Promise.all([
    planParticipantsPayload(planId),
    canChat ? messagesPayload(planId) : Promise.resolve([]),
  ]);
  return {
    plan: planPayload(entry.plan),
    participants,
    messages,
    membershipStatus: entry.participant.membershipStatus,
    canChat,
    isOwner,
    missingFields: missingFields(entry.plan),
  };
}

export async function respondToPlanInvite(
  user: User,
  planId: string,
  accept: boolean
) {
  const entry = await getMembership(user.id, planId);
  if (entry.participant.membershipStatus !== "invited") {
    throw new Error("この招待には回答できません。");
  }
  const db = await databaseOrThrow();
  await db
    .update(planParticipants)
    .set({
      membershipStatus: accept ? "active" : "declined",
      joinedAt: accept ? new Date() : null,
    })
    .where(
      and(
        eq(planParticipants.planId, planId),
        eq(planParticipants.userId, user.id)
      )
    );
  if (accept) {
    await db.insert(planMessages).values({
      id: nanoid(),
      planId,
      kind: "system",
      body: "フレンドが計画に参加しました。",
    });
  }
  return getPlan(user, planId);
}

export async function sendPlanMessage(
  user: User,
  planId: string,
  body: string
) {
  const entry = await requireActiveMember(user, planId);
  if (entry.plan.mode !== "friends") {
    throw new Error("AI計画書ではヤマコへの回答を送信してください。");
  }
  const db = await databaseOrThrow();
  const message = {
    id: nanoid(),
    planId,
    senderUserId: user.id,
    kind: "user" as const,
    body: body.trim(),
  };
  await db.insert(planMessages).values(message);
  return { ...message, createdAt: new Date().toISOString() };
}

export async function updatePlan(
  user: User,
  planId: string,
  expectedVersion: number,
  patch: PlanPatch
) {
  const entry = await requireOwner(user, planId);
  if (entry.plan.version !== expectedVersion) {
    throw new Error("計画書が更新されています。最新の内容を確認してください。");
  }
  const mountain =
    patch.mountainId === undefined
      ? undefined
      : await assertMountain(patch.mountainId);
  const values = planUpdateValues(patch, mountain?.name);
  const db = await databaseOrThrow();
  await db
    .update(hikingPlans)
    .set({ ...values, version: entry.plan.version + 1 })
    .where(
      and(eq(hikingPlans.id, planId), eq(hikingPlans.version, expectedVersion))
    );
  return getPlan(user, planId);
}

async function extractGroupSuggestion(
  plan: HikingPlan,
  messages: Awaited<ReturnType<typeof messagesPayload>>
) {
  const transcript = messages
    .filter(message => message.kind === "user")
    .slice(-20)
    .map(message => `${message.nickname}: ${message.body}`)
    .join("\n");
  const result = await invokeLLM({
    model: COMPANION_GEMINI_MODEL,
    thinking: COMPANION_GEMINI_THINKING,
    responseFormat: {
      type: "json_schema",
      json_schema: {
        name: "group_hiking_plan_suggestion",
        strict: true,
        schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            patch: AI_PLAN_JSON_SCHEMA.schema.properties.patch,
          },
          required: ["summary", "patch"],
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: "system",
        content:
          "あなたは登山計画書の編集補助です。会話に明示された情報だけを抽出し、推測で補わないでください。出力はJSONだけにし、思考過程を書かないでください。",
      },
      {
        role: "user",
        content: `現在の計画書:\n${JSON.stringify(planPayload(plan))}\n\n会話:\n${transcript || "（まだ会話がありません）"}`,
      },
    ],
  });
  const content = result.choices[0]?.message.content;
  if (typeof content !== "string")
    throw new Error("AIが計画書の提案を作れませんでした。");
  const parsed = z
    .object({
      summary: z.string().trim().min(1).max(500),
      patch: planPatchSchema.omit({ mountainId: true }),
    })
    .parse(JSON.parse(content));
  return {
    summary: compactCompanionReply(parsed.summary),
    patch: parsed.patch,
  };
}

export async function suggestPlanFromGroup(user: User, planId: string) {
  const entry = await requireActiveMember(user, planId);
  if (entry.plan.mode !== "friends") {
    throw new Error("グループ会話のある計画書だけを要約できます。");
  }
  const messages = await messagesPayload(planId);
  return extractGroupSuggestion(entry.plan, messages);
}

export async function sendAiPlanTurn(
  user: User,
  planId: string,
  expectedVersion: number,
  text: string
) {
  const entry = await requireOwner(user, planId);
  if (entry.plan.mode !== "ai") {
    throw new Error("AI計画書だけで利用できる会話です。");
  }
  if (entry.plan.version !== expectedVersion) {
    throw new Error("計画書が更新されています。最新の内容を確認してください。");
  }
  const db = await databaseOrThrow();
  const history = await messagesPayload(planId);
  const userMessage = {
    id: nanoid(),
    planId,
    senderUserId: user.id,
    kind: "user" as const,
    body: text.trim(),
  };
  await db.insert(planMessages).values(userMessage);

  const result = await invokeLLM({
    model: COMPANION_GEMINI_MODEL,
    thinking: COMPANION_GEMINI_THINKING,
    responseFormat: { type: "json_schema", json_schema: AI_PLAN_JSON_SCHEMA },
    messages: [
      {
        role: "system",
        content:
          "あなたは日本の登山計画書を一緒に作る安全重視の相棒ヤマコです。質問は一度に一つだけ。会話に明示された内容だけをpatchへ入れ、推測しないでください。必ず日本語で、replyは120文字目安・240文字以内。悪天候、日没後行動、無灯火、危険な単独行、体調不良には中止や公式情報確認を優先するsafetyNoteを加えてください。思考過程は書かずJSONだけを返してください。",
      },
      {
        role: "user",
        content: `現在の計画書:\n${JSON.stringify(planPayload(entry.plan))}\n\n過去の会話:\n${history
          .slice(-10)
          .map(
            message =>
              `${message.kind === "ai" ? "ヤマコ" : message.nickname}: ${message.body}`
          )
          .join("\n")}\n\n今回の回答:\n${text.trim()}`,
      },
    ],
  });
  const content = result.choices[0]?.message.content;
  if (typeof content !== "string")
    throw new Error("ヤマコの返答を取得できませんでした。");
  const ai = aiTurnSchema.parse(JSON.parse(content));
  const values = planUpdateValues(ai.patch);
  const nextVersion = entry.plan.version + 1;
  await db
    .update(hikingPlans)
    .set({
      ...values,
      status: ai.ready ? "ready" : entry.plan.status,
      version: nextVersion,
    })
    .where(
      and(eq(hikingPlans.id, planId), eq(hikingPlans.version, expectedVersion))
    );
  const assistantMessage = {
    id: nanoid(),
    planId,
    kind: "ai" as const,
    body: `${compactCompanionReply(ai.reply)}\n\n${ai.nextQuestion}`,
  };
  await db.insert(planMessages).values(assistantMessage);
  return getPlan(user, planId);
}

export function planMissingFieldsForTest(
  plan: Pick<
    HikingPlan,
    | "mountainName"
    | "mountainId"
    | "planDate"
    | "routeSummary"
    | "meetingTime"
    | "equipmentChecklist"
  >
) {
  return missingFields(plan as HikingPlan);
}
