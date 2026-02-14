import { JsonObject } from "./types";
import { AchievementKind } from "./enums";

export interface RewardRuleModel {
  id: string;
  appId: string;
  name: string;
  description: string | null;
  eventType: string;
  isActive: boolean;
  priority: number;
  conditions: JsonObject;
  xpAwards: JsonObject;
  currencyAwards: JsonObject;
  multiplierConfig: JsonObject | null;
  timeBonusConfig: JsonObject | null;
  streakBonusConfig: JsonObject | null;
}

export interface AchievementModel {
  id: string;
  code: string;
  kind: AchievementKind;
  repeatable: boolean;
  conditions: JsonObject;
}
