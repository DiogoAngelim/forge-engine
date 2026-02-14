import { randomUUID } from "crypto";
import { Router } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../infra/db/client";
import { TransactionSource } from "../../domain/enums";
import { ConflictError, NotFoundError } from "../../shared/errors";

const spendSchema = z.object({
  userId: z.string().min(1),
  currency: z.string().min(1),
  amount: z.number().int().positive(),
  reason: z.string().min(2),
  metadata: z.record(z.any()).optional()
});

export const currencyRouter = Router();

currencyRouter.post("/currency/spend", async (req, res) => {
  const appId = req.appContext!.appId;
  const payload = spendSchema.parse(req.body);

  const userResult = await db.execute(
    sql`select id from users where app_id = ${appId} and external_id = ${payload.userId} limit 1`
  );
  const user = userResult.rows[0] as { id: string } | undefined;

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const aggregate = await db.execute(sql`
    select coalesce(sum(amount), 0)::int as total
    from currency_transactions
    where app_id = ${appId} and user_id = ${user.id} and currency = ${payload.currency}
  `);
  const current = Number((aggregate.rows[0] as { total: number }).total ?? 0);
  if (current < payload.amount) {
    throw new ConflictError("Insufficient balance");
  }

  const txId = randomUUID();
  await db.execute(sql`
    insert into currency_transactions (
      id, app_id, user_id, currency, amount, balance_after, source, reason, metadata
    ) values (
      ${txId}, ${appId}, ${user.id}, ${payload.currency}, ${-payload.amount}, ${current - payload.amount},
      ${TransactionSource.SYSTEM}, ${payload.reason}, ${payload.metadata ? JSON.stringify(payload.metadata) : null}
    )
  `);

  await db.execute(sql`
    insert into audit_logs (
      id, app_id, user_id, actor_type, actor_id, action, resource_type, resource_id, after
    ) values (
      ${randomUUID()}, ${appId}, ${user.id}, ${"api_key"}, ${req.appContext!.keyId}, ${"currency.spend"},
      ${"currency_transaction"}, ${txId}, ${JSON.stringify({
    currency: payload.currency,
    amount: -payload.amount,
    balanceAfter: current - payload.amount
  })}
    )
  `);

  const tx = {
    id: txId,
    appId,
    userId: user.id,
    currency: payload.currency,
    amount: -payload.amount,
    balanceAfter: current - payload.amount,
    source: TransactionSource.SYSTEM,
    reason: payload.reason
  };

  res.status(201).json({ transaction: tx });
});
