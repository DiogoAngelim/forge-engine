import { LeaderboardScope } from "../../domain/enums";
import { Router } from "express";
import { z } from "zod";
import { getLeaderboard } from "../../application/engine/leaderboardService";
import { getPeriodKey } from "../../shared/time";

const querySchema = z.object({
  metric: z.string().default("Builder XP"),
  scope: z.enum(["GLOBAL", "APP", "LEAGUE"]).default("APP"),
  periodKey: z.string().optional(),
  leagueId: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).default(50)
});

export const leaderboardsRouter = Router();

leaderboardsRouter.get("/leaderboards", async (req, res) => {
  const appId = req.appContext!.appId;
  const query = querySchema.parse(req.query);

  const rows = await getLeaderboard(
    appId,
    query.metric,
    query.periodKey ?? getPeriodKey(new Date()),
    query.scope as LeaderboardScope,
    query.limit,
    query.leagueId
  );

  res.json({
    rows,
    metric: query.metric,
    scope: query.scope,
    periodKey: query.periodKey ?? getPeriodKey(new Date())
  });
});
