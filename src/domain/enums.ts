export type LeaderboardScope = "GLOBAL" | "APP" | "LEAGUE";
export type StreakMode = "DAILY" | "WEEKLY";
export type AchievementKind = "MILESTONE" | "CONDITIONAL";

export const TransactionSource = {
  RULE: "RULE",
  MANUAL: "MANUAL",
  SYSTEM: "SYSTEM",
  SEASON: "SEASON"
} as const;

export type TransactionSourceValue = (typeof TransactionSource)[keyof typeof TransactionSource];
