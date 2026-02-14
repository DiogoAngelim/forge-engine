import { Router } from "express";
import { adminOnly } from "./middlewares/admin";
import { appsRouter } from "../../modules/apps/apps.routes";
import { usersRouter } from "../../modules/users/users.routes";
import { eventsRouter } from "../../modules/events/events.routes";
import { rulesRouter } from "../../modules/rules/rules.routes";
import { achievementsRouter } from "../../modules/achievements/achievements.routes";
import { seasonsRouter } from "../../modules/seasons/seasons.routes";
import { currencyRouter } from "../../modules/currency/currency.routes";
import { leaderboardsRouter } from "../../modules/leaderboards/leaderboards.routes";

export const apiRouter = Router();

apiRouter.use(appsRouter);
apiRouter.use(usersRouter);
apiRouter.use(eventsRouter);
apiRouter.use(leaderboardsRouter);
apiRouter.use("/", adminOnly, rulesRouter);
apiRouter.use("/", adminOnly, achievementsRouter);
apiRouter.use("/", adminOnly, seasonsRouter);
apiRouter.use(currencyRouter);
