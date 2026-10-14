import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMock = vi.hoisted(() => ({
  completeChallenge: vi.fn(),
  createClimbRecord: vi.fn(),
  createInquiry: vi.fn(),
  databaseOrThrow: vi.fn(),
  deleteClimbRecord: vi.fn(),
  getCatalogue: vi.fn(),
  getDashboard: vi.fn(),
  listCompanionMessages: vi.fn(),
  listInquiries: vi.fn(),
  resetUserProgress: vi.fn(),
  sendCompanionMessage: vi.fn(),
  updateClimbRecord: vi.fn(),
  updateProfile: vi.fn(),
}));

const plansMock = vi.hoisted(() => ({
  createAiPlan: vi.fn(),
  createFriendPlan: vi.fn(),
  getPlan: vi.fn(),
  listPlans: vi.fn(),
  respondToPlanInvite: vi.fn(),
  sendAiPlanTurn: vi.fn(),
  sendPlanMessage: vi.fn(),
  suggestPlanFromGroup: vi.fn(),
  updatePlan: vi.fn(),
}));

const adminMock = vi.hoisted(() => ({
  createAnnouncement: vi.fn(),
  grantPlayerXp: vi.fn(),
  listAdminAnnouncements: vi.fn(),
  listAdminPlayers: vi.fn(),
  listPublishedAnnouncements: vi.fn(),
  resetPlayerProgressByAdmin: vi.fn(),
  setPlayerBanStatus: vi.fn(),
  setPlayerRole: vi.fn(),
  updateAnnouncement: vi.fn(),
}));

vi.mock("./db", () => dbMock);
vi.mock("./admin", () => adminMock);
vi.mock("./storage", () => ({ storagePut: vi.fn() }));
vi.mock("./plans", async importOriginal => {
  const actual = await importOriginal<typeof import("./plans")>();
  return { ...actual, ...plansMock };
});

import { appRouter } from "./routers";

const user = {
  id: 42,
  openId: "mountain-test-user",
  email: "hiker@example.com",
  name: "Hiker",
  loginMethod: "manus",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function createContext(): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as TrpcContext["res"],
  };
}

function createAnonymousContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  return {
    ...createContext(),
    user: { ...user, role: "admin" },
  };
}

describe("mountain tRPC CRUD", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates a validated record for the current authenticated user", async () => {
    dbMock.createClimbRecord.mockResolvedValue({
      record: { id: "record-1" },
      xpEarned: 130,
      levelUp: false,
      level: 1,
    });
    const caller = appRouter.createCaller(createContext());

    const result = await caller.mountain.records.create({
      mountainId: "hiei",
      climbDate: "2026-08-07",
      memo: "山頂からの景色がとても美しかった。",
      photos: ["/manus-storage/mountain/test.jpg"],
      weather: "晴れ",
    });

    expect(result).toMatchObject({ xpEarned: 130 });
    expect(dbMock.createClimbRecord).toHaveBeenCalledWith(
      user,
      expect.objectContaining({
        mountainId: "hiei",
        photos: ["/manus-storage/mountain/test.jpg"],
      })
    );
  });

  it("rejects an unpersisted image URL before calling the data layer", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.mountain.records.create({
        mountainId: "hiei",
        climbDate: "2026-08-07",
        memo: "test",
        photos: ["data:image/png;base64,not-permitted"],
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMock.createClimbRecord).not.toHaveBeenCalled();
  });

  it("updates and deletes only through authenticated CRUD procedures", async () => {
    dbMock.updateClimbRecord.mockResolvedValue({ records: [] });
    dbMock.deleteClimbRecord.mockResolvedValue({ records: [] });
    const caller = appRouter.createCaller(createContext());

    await caller.mountain.records.update({
      id: "record-1",
      climbDate: "2026-08-08",
      memo: "更新済みの登頂記録",
      photos: [],
    });
    await caller.mountain.records.delete({ id: "record-1" });

    expect(dbMock.updateClimbRecord).toHaveBeenCalledWith(
      user,
      expect.objectContaining({ id: "record-1" })
    );
    expect(dbMock.deleteClimbRecord).toHaveBeenCalledWith(user, "record-1");
  });

  it("rejects unauthenticated mutation attempts before they reach the data layer", async () => {
    const caller = appRouter.createCaller(createAnonymousContext());

    await expect(
      caller.mountain.records.delete({ id: "record-1" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(dbMock.deleteClimbRecord).not.toHaveBeenCalled();
  });

  it("binds a mutation to the authenticated session user instead of caller-controlled ownership input", async () => {
    const otherUser = { ...user, id: 777, openId: "another-user" };
    dbMock.deleteClimbRecord.mockResolvedValue({ records: [] });
    const caller = appRouter.createCaller({
      ...createContext(),
      user: otherUser,
    });

    await caller.mountain.records.delete({ id: "record-owned-by-session" });

    expect(dbMock.deleteClimbRecord).toHaveBeenCalledWith(
      otherUser,
      "record-owned-by-session"
    );
    expect(dbMock.deleteClimbRecord).not.toHaveBeenCalledWith(
      user,
      "record-owned-by-session"
    );
  });

  it("updates the profile and retrieves the real catalogue through the tRPC contract", async () => {
    dbMock.updateProfile.mockResolvedValue({ profile: { nickname: "登山者" } });
    dbMock.getCatalogue.mockResolvedValue({
      mountains: [],
      albums: [],
      badges: [],
    });
    const caller = appRouter.createCaller(createContext());

    await caller.mountain.profile.update({
      nickname: "登山者",
      bio: "山が好きです",
      avatarUrl: "🥾",
      companionName: "ヤマコ",
      companionAnimal: "squirrel",
      companionSkinStage: 1,
      homePrefecture: "京都",
      preferredCondition: "景色重視",
    });
    await expect(caller.catalogue.get()).resolves.toEqual({
      mountains: [],
      albums: [],
      badges: [],
    });
    expect(dbMock.updateProfile).toHaveBeenCalledWith(
      user,
      expect.objectContaining({ nickname: "登山者" })
    );
  });

  it("persists companion messages under the authenticated user through tRPC", async () => {
    dbMock.sendCompanionMessage.mockResolvedValue({
      userMessage: {
        id: "message-1",
        role: "user",
        text: "装備を確認したい",
        createdAt: new Date().toISOString(),
      },
      reply: {
        id: "message-2",
        role: "model",
        text: "雨具と水分を確認しましょう。",
        createdAt: new Date().toISOString(),
      },
    });
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.mountain.companion.send({ text: "装備を確認したい" })
    ).resolves.toMatchObject({
      reply: { id: "message-2" },
    });
    expect(dbMock.sendCompanionMessage).toHaveBeenCalledWith(
      user,
      "装備を確認したい"
    );
  });

  it("reloads the persisted companion history for the authenticated user", async () => {
    const history = [
      {
        id: "message-1",
        role: "user",
        text: "装備を確認したい",
        createdAt: new Date().toISOString(),
      },
      {
        id: "message-2",
        role: "model",
        text: "雨具と水分を確認しましょう。",
        createdAt: new Date().toISOString(),
      },
    ];
    dbMock.listCompanionMessages.mockResolvedValue(history);
    const caller = appRouter.createCaller(createContext());

    await expect(caller.mountain.companion.list()).resolves.toEqual(history);
    expect(dbMock.listCompanionMessages).toHaveBeenCalledWith(user);
  });

  it("creates an AI plan only for the authenticated session user", async () => {
    plansMock.createAiPlan.mockResolvedValue({ plan: { id: "plan-ai-1" } });
    const caller = appRouter.createCaller(createContext());

    await expect(caller.mountain.plans.createAi()).resolves.toMatchObject({
      plan: { id: "plan-ai-1" },
    });
    expect(plansMock.createAiPlan).toHaveBeenCalledWith(user);
  });

  it("rejects unauthenticated plan mutations before the plan service", async () => {
    const caller = appRouter.createCaller(createAnonymousContext());

    await expect(caller.mountain.plans.createAi()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(plansMock.createAiPlan).not.toHaveBeenCalled();
  });

  it("blocks player administration for a non-admin even when authenticated", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.admin.players.list({ query: "" })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(adminMock.listAdminPlayers).not.toHaveBeenCalled();
  });

  it("allows only an admin to operate players and publish announcements", async () => {
    adminMock.listAdminPlayers.mockResolvedValue([
      { id: 9, nickname: "登山者" },
    ]);
    adminMock.setPlayerBanStatus.mockResolvedValue({ id: 9, isBanned: true });
    adminMock.createAnnouncement.mockResolvedValue({ id: "notice-1" });
    const admin = { ...user, role: "admin" as const };
    const caller = appRouter.createCaller(createAdminContext());

    await expect(caller.admin.players.list({ query: "山" })).resolves.toEqual([
      { id: 9, nickname: "登山者" },
    ]);
    await caller.admin.players.setBanStatus({ userId: 9, isBanned: true });
    await caller.admin.announcements.create({
      title: "安全情報",
      body: "天気予報を確認してください。",
      category: "safety",
      isPublished: true,
    });

    expect(adminMock.listAdminPlayers).toHaveBeenCalledWith("山");
    expect(adminMock.setPlayerBanStatus).toHaveBeenCalledWith(admin, 9, true);
    expect(adminMock.createAnnouncement).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({ category: "safety", isPublished: true })
    );
  });
});
