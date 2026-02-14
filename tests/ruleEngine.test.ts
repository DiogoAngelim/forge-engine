import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { evaluateRules } from "../src/application/engine/ruleEngine";
import type { RewardRuleModel } from "../src/domain/models";

const baseRule: RewardRuleModel = {
  id: "r1",
  appId: "app",
  name: "rule",
  description: null,
  eventType: "task_completed",
  isActive: true,
  priority: 1,
  conditions: {
    all: [{ field: "difficulty", op: "eq", value: "hard" }]
  },
  xpAwards: { "Builder XP": 10 },
  currencyAwards: { coins: 2 },
  multiplierConfig: null,
  timeBonusConfig: null,
  streakBonusConfig: null
};

describe("ruleEngine.evaluateRules", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-14T19:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty grant when no rules match", () => {
    const grant = evaluateRules([baseRule], { difficulty: "easy" }, 1);
    expect(grant.trackAwards).toEqual({});
    expect(grant.currencyAwards).toEqual({});
    expect(grant.matchedRuleIds).toEqual([]);
  });

  it("applies metadata, streak and time multipliers", () => {
    const rule: RewardRuleModel = {
      ...baseRule,
      multiplierConfig: {
        field: "difficulty",
        map: {
          easy: 1,
          hard: 1.5
        }
      },
      streakBonusConfig: {
        every: 7,
        bonusMultiplier: 2
      },
      timeBonusConfig: {
        fromHour: 18,
        toHour: 22,
        multiplier: 1.2
      }
    };

    const grant = evaluateRules([rule], { difficulty: "hard" }, 14);

    expect(grant.matchedRuleIds).toEqual(["r1"]);
    expect(grant.trackAwards["Builder XP"]).toBe(36);
    expect(grant.currencyAwards.coins).toBe(7);
  });

  it("supports all operators and unknown operators", () => {
    const opsRule: RewardRuleModel = {
      ...baseRule,
      id: "ops",
      conditions: {
        all: [
          { field: "a", op: "neq", value: 2 },
          { field: "a", op: "gt", value: 0 },
          { field: "a", op: "gte", value: 1 },
          { field: "a", op: "lt", value: 2 },
          { field: "a", op: "lte", value: 1 },
          { field: "b", op: "in", value: ["x", "y"] }
        ]
      }
    };

    const unknownOpRule: RewardRuleModel = {
      ...baseRule,
      id: "unknown",
      conditions: {
        all: [{ field: "a", op: "unknown", value: 1 }]
      }
    };

    const nestedRule: RewardRuleModel = {
      ...baseRule,
      id: "nested",
      conditions: {
        all: [{ field: "meta.depth.value", op: "eq", value: 9 }]
      },
      xpAwards: { "Builder XP": 5 },
      currencyAwards: {}
    };

    const grant = evaluateRules([opsRule, unknownOpRule, nestedRule], { a: 1, b: "x", meta: { depth: { value: 9 } } }, 1);

    expect(grant.matchedRuleIds).toEqual(["ops", "nested"]);
    expect(grant.trackAwards["Builder XP"]).toBe(15);
  });

  it("handles invalid conditions and multiplier fallbacks", () => {
    const rule: RewardRuleModel = {
      ...baseRule,
      id: "invalid",
      conditions: {} as never,
      multiplierConfig: {
        field: "difficulty",
        map: {
          hard: "not-number"
        }
      },
      timeBonusConfig: {
        fromHour: -1,
        toHour: -1,
        multiplier: 5
      },
      streakBonusConfig: {
        every: 0,
        bonusMultiplier: 9
      }
    };

    const grant = evaluateRules([rule], { difficulty: "hard" }, 0);
    expect(grant.matchedRuleIds).toEqual(["invalid"]);
    expect(grant.trackAwards["Builder XP"]).toBe(10);
  });

  it("handles missing paths, non-array conditions, and invalid in operator payload", () => {
    const missingPathRule: RewardRuleModel = {
      ...baseRule,
      id: "missing-path",
      conditions: {
        all: [{ field: "meta.unknown.path", op: "eq", value: "x" }]
      }
    };

    const nonArrayRule: RewardRuleModel = {
      ...baseRule,
      id: "non-array",
      conditions: {
        all: "invalid"
      } as never
    };

    const invalidInRule: RewardRuleModel = {
      ...baseRule,
      id: "invalid-in",
      conditions: {
        all: [{ field: "difficulty", op: "in", value: "hard" }]
      }
    };

    const grant = evaluateRules(
      [missingPathRule, nonArrayRule, invalidInRule],
      { difficulty: "hard", meta: { depth: { value: "exists" } } },
      3
    );

    expect(grant.matchedRuleIds).toEqual(["non-array"]);
    expect(grant.trackAwards["Builder XP"]).toBe(10);
  });

  it("handles non-object configs and non-numeric comparisons", () => {
    const configShapeRule: RewardRuleModel = {
      ...baseRule,
      id: "config-shapes",
      conditions: {
        all: [
          { field: "num", op: "gte", value: "bad-number" },
          { field: "num", op: "lte", value: "also-bad" }
        ]
      },
      multiplierConfig: "not-an-object" as never,
      streakBonusConfig: "not-an-object" as never,
      timeBonusConfig: "not-an-object" as never
    };

    const outOfWindowRule: RewardRuleModel = {
      ...baseRule,
      id: "out-of-window",
      conditions: {
        all: [{ field: "difficulty", op: "eq", value: "hard" }]
      },
      timeBonusConfig: {
        fromHour: 0,
        toHour: 1,
        multiplier: 9
      },
      streakBonusConfig: {
        every: 5,
        bonusMultiplier: 3
      }
    };

    const grant = evaluateRules([configShapeRule, outOfWindowRule], { difficulty: "hard", num: "NaN" as never }, 4);

    expect(grant.matchedRuleIds).toEqual(["config-shapes", "out-of-window"]);
    expect(grant.trackAwards["Builder XP"]).toBe(20);
    expect(grant.currencyAwards.coins).toBe(4);
  });

  it("uses defaults when condition fields and award maps are nullish", () => {
    const defaultedRule: RewardRuleModel = {
      ...baseRule,
      id: "defaulted",
      conditions: {
        all: [{}]
      } as never,
      xpAwards: null as never,
      currencyAwards: undefined as never
    };

    const grant = evaluateRules([defaultedRule], {}, 1);

    expect(grant.matchedRuleIds).toEqual(["defaulted"]);
    expect(grant.trackAwards).toEqual({});
    expect(grant.currencyAwards).toEqual({});
  });

  it("skips multiplier when config object has invalid field/map shapes", () => {
    const invalidMultiplierRule: RewardRuleModel = {
      ...baseRule,
      id: "invalid-multiplier-shapes",
      multiplierConfig: {
        field: 123,
        map: null
      } as never
    };

    const grant = evaluateRules([invalidMultiplierRule], { difficulty: "hard" }, 1);

    expect(grant.matchedRuleIds).toEqual(["invalid-multiplier-shapes"]);
    expect(grant.trackAwards["Builder XP"]).toBe(10);
    expect(grant.currencyAwards.coins).toBe(2);
  });
});
