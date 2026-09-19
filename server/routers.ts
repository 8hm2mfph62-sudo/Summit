import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createClimbRecord,
  createInquiry,
  completeChallenge,
  deleteClimbRecord,
  getCatalogue,
  getDashboard,
  listCompanionMessages,
  listInquiries,
  resetUserProgress,
  sendCompanionMessage,
  updateClimbRecord,
  updateProfile,
} from "./db";
import { companionAnimals } from "./progress";
import { ensureFriendCode, listFriends, requestFriend, respondFriend, removeFriend, getAcceptedFriendIds } from "./friends";
import { storagePut } from "./storage";
import { consumeMagicLink, sendMagicLink } from "./email-auth";
import { issueEmailSession } from "./email-session";

const optionalText = (max: number) => z.string().trim().max(max).optional();
const photoUrlSchema = z.string().regex(/^\/manus-storage\//, "保存済み写真URLを指定してください。").max(2048);
const recordInput = z.object({
  mountainId: z.string().trim().min(1).max(128),
  climbDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "登頂日はYYYY-MM-DD形式で指定してください。"),
  memo: z.string().max(5000),
  photos: z.array(photoUrlSchema).max(5),
  weather: optionalText(32),
  companions: optionalText(255),
  companionSkillUsed: optionalText(128),
  companionSkillName: optionalText(255),
  hasRainbowGlow: z.boolean().optional(),
  luckyFortune: optionalText(255),
        triviaText: optionalText(5000),
  friendIds: z.array(z.number().int().positive()).max(20).optional(),
});

function toTrpcError(error: unknown): never {
  if (error instanceof TRPCError) throw error;
  const message = error instanceof Error ? error.message : "データ処理中にエラーが発生しました。";
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    sendMagicLink: publicProcedure.input(z.object({ email: z.string().trim().email().max(320), origin: z.string().url().max(512) })).mutation(async ({ ctx, input }) => {
      try {
        return await sendMagicLink(input.email, input.origin);
      } catch (error) {
        return toTrpcError(error);
      }
    }),
    verifyMagicLink: publicProcedure.input(z.object({ token: z.string().trim().min(32).max(128) })).mutation(async ({ ctx, input }) => {
      try {
        const user = await consumeMagicLink(input.token);
        await issueEmailSession(user, ctx.req, ctx.res);
        return { success: true } as const;
      } catch (error) {
        return toTrpcError(error);
      }
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  catalogue: router({
    get: publicProcedure.query(async () => {
      try {
        return await getCatalogue();
      } catch (error) {
        return toTrpcError(error);
      }
    }),
  }),
  mountain: router({
    friends: router({
      me: protectedProcedure.query(async ({ ctx }) => {
        try {
          return { friendCode: await ensureFriendCode(ctx.user), friends: await listFriends(ctx.user) };
        } catch (error) { return toTrpcError(error); }
      }),
      request: protectedProcedure.input(z.object({ code: z.string().trim().min(4).max(16) })).mutation(async ({ ctx, input }) => {
        try { return await requestFriend(ctx.user, input.code); } catch (error) { return toTrpcError(error); }
      }),
      respond: protectedProcedure.input(z.object({ friendshipId: z.number().int().positive(), accept: z.boolean() })).mutation(async ({ ctx, input }) => {
        try { return await respondFriend(ctx.user, input.friendshipId, input.accept); } catch (error) { return toTrpcError(error); }
      }),
      remove: protectedProcedure.input(z.object({ friendshipId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        try { return await removeFriend(ctx.user, input.friendshipId); } catch (error) { return toTrpcError(error); }
      }),
    }),
    dashboard: protectedProcedure.query(async ({ ctx }) => {
      try {
        return await getDashboard(ctx.user);
      } catch (error) {
        return toTrpcError(error);
      }
    }),
    profile: router({
      update: protectedProcedure.input(z.object({
        nickname: z.string().trim().min(1, "ニックネームを入力してください。").max(80),
        bio: z.string().trim().max(5000),
        avatarUrl: z.string().trim().min(1).max(2048),
        companionName: z.string().trim().min(1).max(80),
        companionAnimal: z.enum(companionAnimals),
        companionSkinStage: z.number().int().min(1).max(6),
        homePrefecture: z.string().trim().min(1).max(64),
        preferredCondition: z.string().trim().min(1).max(80),
      })).mutation(async ({ ctx, input }) => {
        try {
          return await updateProfile(ctx.user, input);
        } catch (error) {
          return toTrpcError(error);
        }
      }),
    }),
    records: router({
      create: protectedProcedure.input(recordInput).mutation(async ({ ctx, input }) => {
        try {
          const friendIds = await getAcceptedFriendIds(ctx.user, input.friendIds || []);
        return await createClimbRecord(ctx.user, { ...input, friendIds });
        } catch (error) {
          return toTrpcError(error);
        }
      }),
      update: protectedProcedure.input(recordInput.pick({ climbDate: true, memo: true, photos: true, weather: true, companions: true }).extend({
        id: z.string().min(1).max(64),
      })).mutation(async ({ ctx, input }) => {
        try {
          return await updateClimbRecord(ctx.user, input);
        } catch (error) {
          return toTrpcError(error);
        }
      }),
      delete: protectedProcedure.input(z.object({ id: z.string().min(1).max(64) })).mutation(async ({ ctx, input }) => {
        try {
          return await deleteClimbRecord(ctx.user, input.id);
        } catch (error) {
          return toTrpcError(error);
        }
      }),
    }),
    progress: router({
      reset: protectedProcedure.mutation(async ({ ctx }) => {
        try {
          return await resetUserProgress(ctx.user);
        } catch (error) {
          return toTrpcError(error);
        }
      }),
    }),
    challenges: router({
      complete: protectedProcedure.input(z.object({ templateId: z.string().min(1).max(128) })).mutation(async ({ ctx, input }) => {
        try {
          return await completeChallenge(ctx.user, input.templateId);
        } catch (error) {
          return toTrpcError(error);
        }
      }),
    }),
    companion: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        try {
          return await listCompanionMessages(ctx.user);
        } catch (error) {
          return toTrpcError(error);
        }
      }),
      send: protectedProcedure.input(z.object({ text: z.string().trim().min(1).max(2000) })).mutation(async ({ ctx, input }) => {
        try {
          return await sendCompanionMessage(ctx.user, input.text);
        } catch (error) {
          return toTrpcError(error);
        }
      }),
    }),
    photos: router({
      upload: protectedProcedure.input(z.object({ dataUrl: z.string().min(32).max(4_200_000) })).mutation(async ({ ctx, input }) => {
        const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(input.dataUrl);
        if (!match) throw new TRPCError({ code: "BAD_REQUEST", message: "PNG、JPEG、WebP形式の画像を選択してください。" });
        const [, contentType, base64] = match;
        const bytes = Buffer.from(base64, "base64");
        if (bytes.length === 0 || bytes.length > 3 * 1024 * 1024) {
          throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "画像は3MB以下にしてください。" });
        }
        try {
          const extension = contentType.split("/")[1];
          const uploaded = await storagePut(`mountain/${ctx.user.id}/records/${Date.now()}.${extension}`, bytes, contentType);
          return { url: uploaded.url, key: uploaded.key };
        } catch (error) {
          return toTrpcError(error);
        }
      }),
    }),
    inquiries: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        try {
          return await listInquiries(ctx.user);
        } catch (error) {
          return toTrpcError(error);
        }
      }),
      create: protectedProcedure.input(z.object({
        type: z.enum(["bug", "question", "feedback", "other"]),
        title: z.string().trim().min(1).max(255),
        content: z.string().trim().min(1).max(10000),
      })).mutation(async ({ ctx, input }) => {
        try {
          return await createInquiry(ctx.user, input);
        } catch (error) {
          return toTrpcError(error);
        }
      }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
