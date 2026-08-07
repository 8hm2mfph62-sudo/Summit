import { beforeEach, describe, expect, it, vi } from "vitest";

const fakeDb = vi.hoisted(() => {
  process.env.DATABASE_URL = "mysql://test:test@localhost:3306/mountain";
  return {
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
});

vi.mock("drizzle-orm/mysql2", () => ({ drizzle: () => fakeDb }));

import { deleteClimbRecord, updateClimbRecord } from "./db";

const otherUser = {
  id: 999,
  openId: "user-without-record-ownership",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function selectNoOwnedRecord() {
  fakeDb.select.mockImplementation(() => ({
    from: () => ({
      where: () => ({
        limit: async () => [],
      }),
    }),
  }));
}

describe("record ownership enforcement in database queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectNoOwnedRecord();
  });

  it("rejects an update when the record is not owned by the authenticated user", async () => {
    await expect(updateClimbRecord(otherUser, {
      id: "record-owned-by-another-user",
      climbDate: "2026-08-07",
      memo: "別ユーザーの記録を編集してはいけない",
      photos: [],
    })).rejects.toThrow("編集対象の登頂記録が見つかりません。");
    expect(fakeDb.update).not.toHaveBeenCalled();
  });

  it("rejects a deletion when the record is not owned by the authenticated user", async () => {
    await expect(deleteClimbRecord(otherUser, "record-owned-by-another-user"))
      .rejects.toThrow("削除対象の登頂記録が見つかりません。");
    expect(fakeDb.delete).not.toHaveBeenCalled();
  });
});
