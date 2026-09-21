import { describe, expect, it } from "vitest";
import {
  COMPANION_AI_LABEL,
  COMPANION_GEMINI_THINKING,
  COMPANION_GEMINI_MODEL,
  compactCompanionReply,
  companionReplyGuidance,
} from "./companion";

describe("companion reply formatting", () => {
  it("uses a Gemini model for Yamako responses", () => {
    expect(COMPANION_GEMINI_MODEL).toMatch(/^gemini-/);
    expect(COMPANION_AI_LABEL).toBe("Gemini");
    expect(COMPANION_GEMINI_THINKING).toEqual({ budget_tokens: 1024 });
  });

  it("keeps short replies unchanged", () => {
    expect(
      compactCompanionReply("雨具と水分を確認してね。安全第一で出発しよう。")
    ).toBe("雨具と水分を確認してね。安全第一で出発しよう。");
  });

  it("shortens unexpectedly long replies at a sentence boundary", () => {
    const longReply = `${"安全確認をしよう。".repeat(40)}最後まで読んでね。`;
    const compact = compactCompanionReply(longReply);
    expect(compact.length).toBeLessThanOrEqual(240);
    expect(compact.endsWith("…")).toBe(true);
  });

  it("requires concise, safety-first guidance", () => {
    expect(companionReplyGuidance).toContain("240文字以内");
    expect(companionReplyGuidance).toContain("安全に関わる内容");
  });
});
