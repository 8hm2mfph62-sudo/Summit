export const XP_PER_LEVEL = 150;

export function calculateLevel(totalXp: number) {
  const normalized = Math.max(0, Math.floor(totalXp));
  return {
    totalXp: normalized,
    level: Math.floor(normalized / XP_PER_LEVEL) + 1,
    xp: normalized,
    xpToNextLevel: XP_PER_LEVEL,
  };
}

export function calculateClimbXp(input: {
  isFirstClimb: boolean;
  hasPhoto: boolean;
  hasMemo: boolean;
  companionSkinStage: number;
}) {
  const baseXp = 30 + (input.isFirstClimb ? 100 : 0) + (input.hasPhoto ? 30 : 0) + (input.hasMemo ? 10 : 0);
  const multiplier = input.companionSkinStage >= 5
    ? 1.25
    : input.companionSkinStage >= 4
      ? 1.15
      : input.companionSkinStage >= 3
        ? 1.1
        : 1;

  return Math.round(baseXp * multiplier);
}

export const companionAnimals = ["squirrel", "fox", "bear", "rabbit", "owl", "deer", "cat", "dog"] as const;
