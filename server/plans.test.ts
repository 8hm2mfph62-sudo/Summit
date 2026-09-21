import { describe, expect, it } from "vitest";
import { planMissingFieldsForTest, planPatchSchema } from "./plans";

describe("hiking plan validation", () => {
  it("accepts only explicitly editable plan fields", () => {
    expect(
      planPatchSchema.parse({
        title: "秋の大文字山ハイク",
        planDate: "2026-10-18",
        equipmentChecklist: ["雨具", "ヘッドライト"],
      })
    ).toMatchObject({ title: "秋の大文字山ハイク" });

    expect(() =>
      planPatchSchema.parse({ title: "不正な更新", ownerId: 999 })
    ).toThrow();
  });

  it("identifies the safety-critical fields still needed for a plan", () => {
    expect(
      planMissingFieldsForTest({
        mountainId: null,
        mountainName: null,
        planDate: null,
        routeSummary: null,
        meetingTime: null,
        equipmentChecklist: [],
      })
    ).toEqual([
      "行き先の山",
      "登山日",
      "ルート・行程",
      "集合または出発時刻",
      "必携装備",
    ]);

    expect(
      planMissingFieldsForTest({
        mountainId: "atagosan",
        mountainName: "愛宕山",
        planDate: new Date("2026-10-18T00:00:00.000Z"),
        routeSummary: "表参道を往復",
        meetingTime: "07:00",
        equipmentChecklist: ["雨具"],
      })
    ).toEqual([]);
  });
});
