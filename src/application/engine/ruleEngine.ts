import { RewardRuleModel } from "../../domain/models";
import { JsonObject, RewardGrant } from "../../domain/types";

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return fallback;
};

const compare = (left: unknown, op: string, right: unknown): boolean => {
  switch (op) {
    case "eq":
      return left === right;
    case "neq":
      return left !== right;
    case "gt":
      return asNumber(left) > asNumber(right);
    case "gte":
      return asNumber(left) >= asNumber(right);
    case "lt":
      return asNumber(left) < asNumber(right);
    case "lte":
      return asNumber(left) <= asNumber(right);
    case "in":
      return Array.isArray(right) ? right.includes(left) : false;
    default:
      return false;
  }
};

const readPath = (payload: JsonObject, path: string): unknown => {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (typeof acc === "object" && acc !== null && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, payload);
};

const computeMultiplier = (rule: RewardRuleModel, metadata: JsonObject, streakCount: number): number => {
  let multiplier = 1;

  if (rule.multiplierConfig && typeof rule.multiplierConfig === "object") {
    const config = rule.multiplierConfig as Record<string, unknown>;
    const field = typeof config.field === "string" ? config.field : undefined;
    const map = typeof config.map === "object" && config.map ? (config.map as Record<string, unknown>) : undefined;

    if (field && map) {
      const fieldValue = String(readPath(metadata, field) ?? "");
      const mapped = map[fieldValue];
      multiplier *= asNumber(mapped, 1);
    }
  }

  if (rule.streakBonusConfig && typeof rule.streakBonusConfig === "object") {
    const config = rule.streakBonusConfig as Record<string, unknown>;
    const every = asNumber(config.every, 0);
    const bonusMultiplier = asNumber(config.bonusMultiplier, 1);
    if (every > 0 && streakCount > 0 && streakCount % every === 0) {
      multiplier *= bonusMultiplier;
    }
  }

  if (rule.timeBonusConfig && typeof rule.timeBonusConfig === "object") {
    const cfg = rule.timeBonusConfig as Record<string, unknown>;
    const utcHour = new Date().getUTCHours();
    const fromHour = asNumber(cfg.fromHour, -1);
    const toHour = asNumber(cfg.toHour, -1);
    const timeMultiplier = asNumber(cfg.multiplier, 1);

    if (fromHour >= 0 && toHour >= 0 && utcHour >= fromHour && utcHour < toHour) {
      multiplier *= timeMultiplier;
    }
  }

  return multiplier;
};

export const evaluateRules = (
  rules: RewardRuleModel[],
  metadata: JsonObject,
  streakCount: number
): RewardGrant => {
  const grant: RewardGrant = {
    trackAwards: {},
    currencyAwards: {},
    matchedRuleIds: [],
    metadata: {}
  };

  for (const rule of rules) {
    const conditions = Array.isArray((rule.conditions as Record<string, unknown>)?.all)
      ? ((rule.conditions as Record<string, unknown>).all as Record<string, unknown>[])
      : [];

    const matched = conditions.every((condition) => {
      const field = String(condition.field ?? "");
      const op = String(condition.op ?? "eq");
      const value = condition.value;
      return compare(readPath(metadata, field), op, value);
    });

    if (!matched) {
      continue;
    }

    const multiplier = computeMultiplier(rule, metadata, streakCount);

    const xpAwards = (rule.xpAwards ?? {}) as Record<string, unknown>;
    const currencyAwards = (rule.currencyAwards ?? {}) as Record<string, unknown>;

    for (const [track, amount] of Object.entries(xpAwards)) {
      grant.trackAwards[track] = (grant.trackAwards[track] ?? 0) + Math.round(asNumber(amount) * multiplier);
    }

    for (const [currency, amount] of Object.entries(currencyAwards)) {
      grant.currencyAwards[currency] =
        (grant.currencyAwards[currency] ?? 0) + Math.round(asNumber(amount) * multiplier);
    }

    grant.matchedRuleIds.push(rule.id);
  }

  return grant;
};
