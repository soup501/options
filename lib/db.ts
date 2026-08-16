import { Pool, PoolClient } from "pg";
import { ensureAccount, UserIdentity } from "@/lib/accounts";

const globalForDb = globalThis as unknown as { optionLabPool?: Pool };

export const pool =
  globalForDb.optionLabPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") globalForDb.optionLabPool = pool;

export async function withTransaction<T>(
  work: (client: PoolClient) => Promise<T>,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function withAccountTransaction<T>(
  identity: UserIdentity,
  work: (client: PoolClient) => Promise<T>,
) {
  return withTransaction(async (client) => {
    const accountId = await ensureAccount(client, identity);
    await client.query("SELECT set_config('app.account_id', $1, true)", [
      String(accountId),
    ]);
    return work(client);
  });
}

export async function withAccountIdTransaction<T>(
  accountId: number,
  work: (client: PoolClient) => Promise<T>,
) {
  return withTransaction(async (client) => {
    await client.query("SELECT set_config('app.account_id', $1, true)", [
      String(accountId),
    ]);
    return work(client);
  });
}
