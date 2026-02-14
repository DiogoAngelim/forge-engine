import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../../config/env";

export const pgPool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20
});

export const db = drizzle(pgPool);

export const connectDb = async (): Promise<void> => {
  await pgPool.query("select 1");
};

export const closeDb = async (): Promise<void> => {
  await pgPool.end();
};
