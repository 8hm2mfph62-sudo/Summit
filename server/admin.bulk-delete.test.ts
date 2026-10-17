import { describe, expect, it } from "vitest";
import type { User } from "../drizzle/schema";
import { deletePlayersByAdmin } from "./admin";

const admin = {
  id: 1,
  openId: "admin-1",
  email: "admin@example.com",
  name: "管理者",
  passwordHash: "hash",
  sessionVersion: 1,
  loginMethod: "password",
  friendCode: "MNT-ADMIN",
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
} as User;

describe("bulk player deletion safeguards", () => {
  it("rejects an empty selection before accessing the database", async () => {
    await expect(deletePlayersByAdmin(admin, [])).rejects.toThrow(
      "削除するプレイヤーを選択してください。"
    );
  });

  it("rejects a selection that includes the acting administrator", async () => {
    await expect(deletePlayersByAdmin(admin, [admin.id, 9])).rejects.toThrow(
      "自分自身のアカウントは一括削除できません。"
    );
  });
});
