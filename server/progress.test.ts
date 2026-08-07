import { describe, expect, it } from "vitest";
import { calculateClimbXp, calculateLevel } from "./progress";

describe("Mountain progress rules", () => {
  it("calculates the first documented climb and companion multiplier", () => {
    expect(calculateClimbXp({
      isFirstClimb: true,
      hasPhoto: true,
      hasMemo: true,
      companionSkinStage: 3,
    })).toBe(187);
  });

  it("derives level and retained total experience consistently", () => {
    expect(calculateLevel(320)).toEqual({
      totalXp: 320,
      level: 3,
      xp: 320,
      xpToNextLevel: 150,
    });
  });
});
