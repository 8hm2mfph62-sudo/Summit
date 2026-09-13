import { beforeEach, describe, expect, it, vi } from "vitest";

const fakeDb = vi.hoisted(() => ({ select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() }));
vi.mock("./db", () => ({ databaseOrThrow: async () => fakeDb }));

import { getAcceptedFriendIds, normalizeFriendCode, requestFriend } from "./friends";

type UserLike = { id: number; openId: string; role: "user"; createdAt: Date; updatedAt: Date; lastSignedIn: Date };
const user = { id: 1, openId: "user-1", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } satisfies UserLike;

function queueSelectResults(...results: unknown[]) {
  let index = 0;
  fakeDb.select.mockImplementation(() => {
    const result = results[index++] ?? [];
    const whereResult = { limit: async () => result, then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) };
    return { from: () => ({ where: () => whereResult }) };
  });
}

describe("friend code and friendship authorization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("normalizes prefix, spaces, and letter casing", () => {
    expect(normalizeFriendCode(" mnt ab12cd34 ")).toBe("MNT-AB12CD34");
    expect(normalizeFriendCode("ab12cd34")).toBe("MNT-AB12CD34");
  });

  it("rejects a self-request before creating a friendship", async () => {
    queueSelectResults([{ id: 1, friendCode: "MNT-SELF123" }]);
    await expect(requestFriend(user, "MNT-SELF123")).rejects.toThrow("自分自身はフレンドに追加できません。");
    expect(fakeDb.insert).not.toHaveBeenCalled();
  });

  it("rejects a duplicate pending request", async () => {
    queueSelectResults([{ id: 2, friendCode: "MNT-FRIEND1" }], [{ status: "pending" }]);
    await expect(requestFriend(user, "mnt-friend1")).rejects.toThrow("すでに送信済み");
    expect(fakeDb.insert).not.toHaveBeenCalled();
  });

  it("rejects an unaccepted friend as a record participant", async () => {
    queueSelectResults([{ requesterId: 1, addresseeId: 2 }]);
    await expect(getAcceptedFriendIds(user, [3])).rejects.toThrow("フレンドではありません");
  });
});
