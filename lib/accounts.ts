import { PoolClient } from "pg";

export type UserIdentity = {
  userId: string;
  email: string;
};

export async function ensureAccount(
  client: PoolClient,
  identity: UserIdentity,
) {
  const existing = await client.query(
    "SELECT id FROM accounts WHERE user_id = $1 OR email = $2 FOR UPDATE",
    [identity.userId, identity.email],
  );
  if (existing.rowCount) return existing.rows[0].id as number;

  const account = await client.query(
    "INSERT INTO accounts (user_id, email, cash, initial_cash, created_at, updated_at) VALUES ($1, $2, 20000, 20000, NOW(), NOW()) ON CONFLICT (user_id) DO NOTHING RETURNING id",
    [identity.userId, identity.email],
  );
  if (account.rowCount) return account.rows[0].id as number;

  const createdByConcurrentLogin = await client.query(
    "SELECT id FROM accounts WHERE user_id = $1 OR email = $2 FOR UPDATE",
    [identity.userId, identity.email],
  );
  if (createdByConcurrentLogin.rowCount)
    return createdByConcurrentLogin.rows[0].id as number;
  throw new Error("Unable to initialize the user account.");
}
