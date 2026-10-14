import { describe, expect, it } from "vitest";
import {
  createPlanPdfModel,
  planPdfFilename,
  planPdfMarkup,
  type PlanPdfInput,
} from "./planPdf";

const completePlan: PlanPdfInput = {
  plan: {
    id: "plan-1",
    mode: "friends",
    status: "ready",
    title: "秋の大文字山ハイク",
    mountainName: "大文字山",
    planDate: "2026-10-18",
    meetingTime: "07:30",
    meetingPlace: "銀閣寺前",
    routeSummary: "銀閣寺から大文字山を往復",
    transport: "公共交通機関",
    notes: "下山後に昼食",
    equipmentChecklist: ["雨具", "ヘッドライト"],
    safetyNote: "前日に天気と登山道を確認する。",
    updatedAt: "2026-10-14T12:00:00.000Z",
  },
  participants: [
    {
      userId: 1,
      role: "owner",
      membershipStatus: "active",
      nickname: "山田太郎",
    },
    {
      userId: 2,
      role: "member",
      membershipStatus: "invited",
      nickname: "佐藤花子",
    },
  ],
  missingFields: [],
};

describe("plan PDF export", () => {
  it("formats saved plan data into a printable Japanese model", () => {
    const model = createPlanPdfModel(
      completePlan,
      new Date("2026-10-14T00:00:00.000Z")
    );

    expect(model.filename).toBe("登山計画書_秋の大文字山ハイク_20261014.pdf");
    expect(model.modeLabel).toBe("フレンド計画");
    expect(model.statusLabel).toBe("確認待ち");
    expect(model.meeting).toBe("07:30 ／ 銀閣寺前");
    expect(model.participants).toEqual([
      { label: "山田太郎（作成者）", status: "参加" },
      { label: "佐藤花子", status: "招待中" },
    ]);
    expect(model.equipment).toEqual(["雨具", "ヘッドライト"]);
  });

  it("uses safe fallbacks and a file-safe title for incomplete plans", () => {
    const model = createPlanPdfModel(
      {
        ...completePlan,
        plan: {
          ...completePlan.plan,
          title: "山行 / <未定>",
          mountainName: null,
          planDate: null,
          meetingTime: null,
          meetingPlace: null,
          routeSummary: null,
          equipmentChecklist: [],
          safetyNote: null,
          notes: null,
        },
        missingFields: ["行き先の山", "登山日"],
      },
      new Date("2026-11-02T00:00:00.000Z")
    );

    expect(model.filename).toBe("登山計画書_山行 未定_20261102.pdf");
    expect(model.destination).toBe("未定");
    expect(model.meeting).toBe("未定");
    expect(model.safetyNote).toContain("公式情報");
  });

  it("escapes user-supplied text before creating PDF markup", () => {
    const model = createPlanPdfModel({
      ...completePlan,
      plan: {
        ...completePlan.plan,
        title: '<img src=x onerror="alert(1)">',
        notes: "<script>alert('unsafe')</script>",
      },
    });
    const markup = planPdfMarkup(model);

    expect(markup).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(markup).toContain(
      "&lt;script&gt;alert(&#39;unsafe&#39;)&lt;/script&gt;"
    );
    expect(markup).not.toContain("<script>alert");
  });

  it("removes filesystem-reserved characters from downloaded filenames", () => {
    expect(planPdfFilename('登山:計画/書*? "A"', new Date("2026-10-01"))).toBe(
      "登山計画書_登山計画書 A_20261001.pdf"
    );
  });
});
