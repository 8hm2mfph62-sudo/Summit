import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "./_core/trpc";
import {
  createAnnouncement,
  deletePlayersByAdmin,
  grantPlayerXp,
  listAdminAnnouncements,
  listAdminPlayers,
  listPublishedAnnouncements,
  resetPlayerPasswordByAdmin,
  resetPlayerProgressByAdmin,
  setPlayerBanStatus,
  setPlayerRole,
  updateAnnouncement,
} from "./admin";
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
import {
  ensureFriendCode,
  listFriends,
  requestFriend,
  respondFriend,
  removeFriend,
  getAcceptedFriendIds,
} from "./friends";
import { storagePut } from "./storage";
import { loginWithPassword, registerWithPassword } from "./password-auth";
import { issuePasswordSession } from "./password-session";
import {
  createAiPlan,
  createFriendPlan,
  getPlan,
  listPlans,
  planPatchSchema,
  respondToPlanInvite,
  sendAiPlanTurn,
  sendPlanMessage,
  suggestPlanFromGroup,
  updatePlan,
} from "./plans";

const optionalText = (max: number) => z.string().trim().max(max).optional();
const photoUrlSchema = z
  .string()
  .regex(/^\/manus-storage\//, "保存済み写真URLを指定してください。")
  .max(2048);
const recordInput = z.object({
  mountainId: z.string().trim().min(1).max(128),
  climbDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "登頂日はYYYY-MM-DD形式で指定してください。"),
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
const announcementInput = z.object({
  title: z.string().trim().min(1, "件名を入力してください。").max(160),
  body: z.string().trim().min(1, "本文を入力してください。").max(10_000),
  category: z.enum(["info", "safety", "maintenance", "event"]),
  isPublished: z.boolean(),
});

function toTrpcError(error: unknown): never {
  if (error instanceof TRPCError) throw error;
  console.error("[tRPC] Request failed", error);
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message:
      "処理中にエラーが発生しました。時間をおいてもう一度お試しください。",
  });
}

function toPasswordAuthError(error: unknown): never {
  const message =
    error instanceof Error ? error.message : "ログインできませんでした。";
  if (message.includes("パスワード") || message.includes("メールアドレス")) {
    throw new TRPCError({ code: "BAD_REQUEST", message });
  }
  console.error("[Auth] Password authentication failed", error);
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message:
      "ログインを完了できませんでした。時間をおいてもう一度お試しください。",
  });
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => {
      if (!opts.ctx.user) return null;
      return {
        id: opts.ctx.user.id,
        name: opts.ctx.user.name || "登山者",
        email: opts.ctx.user.email,
        loginMethod: opts.ctx.user.loginMethod,
        role: opts.ctx.user.role,
      };
    }),
    register: publicProcedure
      .input(
        z.object({
          email: z.string().trim().email().max(320),
          password: z.string().min(8).max(128),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const user = await registerWithPassword(input.email, input.password);
          await issuePasswordSession(user, ctx.req, ctx.res);
          return { success: true } as const;
        } catch (error) {
          return toPasswordAuthError(error);
        }
      }),
    login: publicProcedure
      .input(
        z.object({
          email: z.string().trim().email().max(320),
          password: z.string().min(8).max(128),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const user = await loginWithPassword(input.email, input.password);
          await issuePasswordSession(user, ctx.req, ctx.res);
          return { success: true } as const;
        } catch (error) {
          return toPasswordAuthError(error);
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
  announcements: router({
    latest: protectedProcedure.query(async () => {
      try {
        return await listPublishedAnnouncements();
      } catch (error) {
        return toTrpcError(error);
      }
    }),
  }),
  admin: router({
    players: router({
      list: adminProcedure
        .input(z.object({ query: z.string().trim().max(160) }))
        .query(async ({ input }) => {
          try {
            return await listAdminPlayers(input.query);
          } catch (error) {
            return toTrpcError(error);
          }
        }),
      setRole: adminProcedure
        .input(
          z.object({
            userId: z.number().int().positive(),
            role: z.enum(["user", "admin"]),
          })
        )
        .mutation(async ({ ctx, input }) => {
          try {
            return await setPlayerRole(ctx.user, input.userId, input.role);
          } catch (error) {
            return toTrpcError(error);
          }
        }),
      setBanStatus: adminProcedure
        .input(
          z.object({
            userId: z.number().int().positive(),
            isBanned: z.boolean(),
          })
        )
        .mutation(async ({ ctx, input }) => {
          try {
            return await setPlayerBanStatus(
              ctx.user,
              input.userId,
              input.isBanned
            );
          } catch (error) {
            return toTrpcError(error);
          }
        }),
      grantXp: adminProcedure
        .input(
          z.object({
            userId: z.number().int().positive(),
            amount: z.number().int().min(1).max(10_000),
          })
        )
        .mutation(async ({ input }) => {
          try {
            return await grantPlayerXp(input.userId, input.amount);
          } catch (error) {
            return toTrpcError(error);
          }
        }),
      resetProgress: adminProcedure
        .input(z.object({ userId: z.number().int().positive() }))
        .mutation(async ({ input }) => {
          try {
            return await resetPlayerProgressByAdmin(input.userId);
          } catch (error) {
            return toTrpcError(error);
          }
        }),
      resetPassword: adminProcedure
        .input(
          z.object({
            userId: z.number().int().positive(),
            temporaryPassword: z
              .string()
              .min(8, "仮パスワードは8文字以上で設定してください。")
              .max(128, "仮パスワードは128文字以内で設定してください。"),
          })
        )
        .mutation(async ({ input }) => {
          try {
            return await resetPlayerPasswordByAdmin(
              input.userId,
              input.temporaryPassword
            );
          } catch (error) {
            return toTrpcError(error);
          }
        }),
      bulkDelete: adminProcedure
        .input(
          z.object({
            userIds: z
              .array(z.number().int().positive())
              .min(1, "削除するプレイヤーを選択してください。")
              .max(100, "一度に削除できるのは100人までです。")
              .refine(
                ids => new Set(ids).size === ids.length,
                "同じプレイヤーが重複しています。"
              ),
          })
        )
        .mutation(async ({ ctx, input }) => {
          try {
            return await deletePlayersByAdmin(ctx.user, input.userIds);
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "プレイヤーを削除できませんでした。";
            if (
              message.includes("削除") ||
              message.includes("管理者") ||
              message.includes("見つかりません")
            ) {
              throw new TRPCError({ code: "BAD_REQUEST", message });
            }
            return toTrpcError(error);
          }
        }),
    }),
    announcements: router({
      list: adminProcedure.query(async () => {
        try {
          return await listAdminAnnouncements();
        } catch (error) {
          return toTrpcError(error);
        }
      }),
      create: adminProcedure
        .input(announcementInput)
        .mutation(async ({ ctx, input }) => {
          try {
            return await createAnnouncement(ctx.user, input);
          } catch (error) {
            return toTrpcError(error);
          }
        }),
      update: adminProcedure
        .input(announcementInput.extend({ id: z.string().min(1).max(64) }))
        .mutation(async ({ input }) => {
          try {
            return await updateAnnouncement(input);
          } catch (error) {
            return toTrpcError(error);
          }
        }),
    }),
  }),
  mountain: router({
    friends: router({
      me: protectedProcedure.query(async ({ ctx }) => {
        try {
          return {
            friendCode: await ensureFriendCode(ctx.user),
            friends: await listFriends(ctx.user),
          };
        } catch (error) {
          return toTrpcError(error);
        }
      }),
      request: protectedProcedure
        .input(z.object({ code: z.string().trim().min(4).max(16) }))
        .mutation(async ({ ctx, input }) => {
          try {
            return await requestFriend(ctx.user, input.code);
          } catch (error) {
            return toTrpcError(error);
          }
        }),
      respond: protectedProcedure
        .input(
          z.object({
            friendshipId: z.number().int().positive(),
            accept: z.boolean(),
          })
        )
        .mutation(async ({ ctx, input }) => {
          try {
            return await respondFriend(
              ctx.user,
              input.friendshipId,
              input.accept
            );
          } catch (error) {
            return toTrpcError(error);
          }
        }),
      remove: protectedProcedure
        .input(z.object({ friendshipId: z.number().int().positive() }))
        .mutation(async ({ ctx, input }) => {
          try {
            return await removeFriend(ctx.user, input.friendshipId);
          } catch (error) {
            return toTrpcError(error);
          }
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
      update: protectedProcedure
        .input(
          z.object({
            nickname: z
              .string()
              .trim()
              .min(1, "ニックネームを入力してください。")
              .max(80),
            bio: z.string().trim().max(5000),
            avatarUrl: z.string().trim().min(1).max(2048),
            companionName: z.string().trim().min(1).max(80),
            companionAnimal: z.enum(companionAnimals),
            companionSkinStage: z.number().int().min(1).max(6),
            homePrefecture: z.string().trim().min(1).max(64),
            preferredCondition: z.string().trim().min(1).max(80),
          })
        )
        .mutation(async ({ ctx, input }) => {
          try {
            return await updateProfile(ctx.user, input);
          } catch (error) {
            return toTrpcError(error);
          }
        }),
    }),
    records: router({
      create: protectedProcedure
        .input(recordInput)
        .mutation(async ({ ctx, input }) => {
          try {
            const friendIds = await getAcceptedFriendIds(
              ctx.user,
              input.friendIds || []
            );
            return await createClimbRecord(ctx.user, { ...input, friendIds });
          } catch (error) {
            return toTrpcError(error);
          }
        }),
      update: protectedProcedure
        .input(
          recordInput
            .pick({
              climbDate: true,
              memo: true,
              photos: true,
              weather: true,
              companions: true,
            })
            .extend({
              id: z.string().min(1).max(64),
            })
        )
        .mutation(async ({ ctx, input }) => {
          try {
            return await updateClimbRecord(ctx.user, input);
          } catch (error) {
            return toTrpcError(error);
          }
        }),
      delete: protectedProcedure
        .input(z.object({ id: z.string().min(1).max(64) }))
        .mutation(async ({ ctx, input }) => {
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
      complete: protectedProcedure
        .input(z.object({ templateId: z.string().min(1).max(128) }))
        .mutation(async ({ ctx, input }) => {
          try {
            return await completeChallenge(ctx.user, input.templateId);
          } catch (error) {
            return toTrpcError(error);
          }
        }),
    }),
    plans: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        try {
          return await listPlans(ctx.user);
        } catch (error) {
          return toTrpcError(error);
        }
      }),
      get: protectedProcedure
        .input(z.object({ planId: z.string().min(1).max(64) }))
        .query(async ({ ctx, input }) => {
          try {
            return await getPlan(ctx.user, input.planId);
          } catch (error) {
            return toTrpcError(error);
          }
        }),
      createFriends: protectedProcedure
        .input(
          z.object({
            title: z.string().trim().min(1).max(120),
            friendIds: z.array(z.number().int().positive()).max(20),
          })
        )
        .mutation(async ({ ctx, input }) => {
          try {
            return await createFriendPlan(ctx.user, input);
          } catch (error) {
            return toTrpcError(error);
          }
        }),
      createAi: protectedProcedure.mutation(async ({ ctx }) => {
        try {
          return await createAiPlan(ctx.user);
        } catch (error) {
          return toTrpcError(error);
        }
      }),
      respondInvite: protectedProcedure
        .input(
          z.object({ planId: z.string().min(1).max(64), accept: z.boolean() })
        )
        .mutation(async ({ ctx, input }) => {
          try {
            return await respondToPlanInvite(
              ctx.user,
              input.planId,
              input.accept
            );
          } catch (error) {
            return toTrpcError(error);
          }
        }),
      sendMessage: protectedProcedure
        .input(
          z.object({
            planId: z.string().min(1).max(64),
            body: z.string().trim().min(1).max(2000),
          })
        )
        .mutation(async ({ ctx, input }) => {
          try {
            return await sendPlanMessage(ctx.user, input.planId, input.body);
          } catch (error) {
            return toTrpcError(error);
          }
        }),
      suggestFromGroup: protectedProcedure
        .input(z.object({ planId: z.string().min(1).max(64) }))
        .mutation(async ({ ctx, input }) => {
          try {
            return await suggestPlanFromGroup(ctx.user, input.planId);
          } catch (error) {
            return toTrpcError(error);
          }
        }),
      update: protectedProcedure
        .input(
          z.object({
            planId: z.string().min(1).max(64),
            expectedVersion: z.number().int().positive(),
            patch: planPatchSchema,
          })
        )
        .mutation(async ({ ctx, input }) => {
          try {
            return await updatePlan(
              ctx.user,
              input.planId,
              input.expectedVersion,
              input.patch
            );
          } catch (error) {
            return toTrpcError(error);
          }
        }),
      aiTurn: protectedProcedure
        .input(
          z.object({
            planId: z.string().min(1).max(64),
            expectedVersion: z.number().int().positive(),
            text: z.string().trim().min(1).max(1200),
          })
        )
        .mutation(async ({ ctx, input }) => {
          try {
            return await sendAiPlanTurn(
              ctx.user,
              input.planId,
              input.expectedVersion,
              input.text
            );
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
      send: protectedProcedure
        .input(z.object({ text: z.string().trim().min(1).max(2000) }))
        .mutation(async ({ ctx, input }) => {
          try {
            return await sendCompanionMessage(ctx.user, input.text);
          } catch (error) {
            return toTrpcError(error);
          }
        }),
    }),
    photos: router({
      upload: protectedProcedure
        .input(z.object({ dataUrl: z.string().min(32).max(4_200_000) }))
        .mutation(async ({ ctx, input }) => {
          const match =
            /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(
              input.dataUrl
            );
          if (!match)
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "PNG、JPEG、WebP形式の画像を選択してください。",
            });
          const [, contentType, base64] = match;
          const bytes = Buffer.from(base64, "base64");
          if (bytes.length === 0 || bytes.length > 3 * 1024 * 1024) {
            throw new TRPCError({
              code: "PAYLOAD_TOO_LARGE",
              message: "画像は3MB以下にしてください。",
            });
          }
          try {
            const extension = contentType.split("/")[1];
            const uploaded = await storagePut(
              `mountain/${ctx.user.id}/records/${Date.now()}.${extension}`,
              bytes,
              contentType
            );
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
      create: protectedProcedure
        .input(
          z.object({
            type: z.enum(["bug", "question", "feedback", "other"]),
            title: z.string().trim().min(1).max(255),
            content: z.string().trim().min(1).max(10000),
          })
        )
        .mutation(async ({ ctx, input }) => {
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
