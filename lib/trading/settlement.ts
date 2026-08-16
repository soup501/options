import { PoolClient } from "pg";

const multiplier = 100;

type PriceMap = Record<string, number>;

async function consumeShares(
  client: PoolClient,
  symbol: string,
  quantity: number,
) {
  const lots = await client.query(
    "SELECT id, remaining_quantity, cost_basis FROM stock_lots WHERE account_id = current_setting('app.account_id')::int AND symbol = $1 AND remaining_quantity > 0 ORDER BY acquired_at, id FOR UPDATE",
    [symbol],
  );
  const owned = lots.rows.reduce((sum, lot) => sum + lot.remaining_quantity, 0);
  if (owned < quantity) return false;
  let remaining = quantity;
  for (const lot of lots.rows) {
    if (!remaining) break;
    const used = Math.min(remaining, lot.remaining_quantity);
    await client.query(
      "UPDATE stock_lots SET remaining_quantity = remaining_quantity - $1 WHERE id = $2",
      [used, lot.id],
    );
    remaining -= used;
  }
  return true;
}

export async function settleExpiredOptions(
  client: PoolClient,
  prices: PriceMap,
) {
  const account = await client.query(
    "SELECT cash FROM accounts WHERE id = current_setting('app.account_id')::int FOR UPDATE",
  );
  if (!account.rowCount)
    throw new Error("Account is not initialized. Run setup_db.py first.");
  let cash = Number(account.rows[0].cash);
  const expired = await client.query(
    "SELECT id, contract_symbol, underlying, kind, strike, expiration, side, remaining_contracts, opening_premium FROM option_lots WHERE account_id = current_setting('app.account_id')::int AND status = 'open' AND remaining_contracts > 0 AND expiration::date < CURRENT_DATE ORDER BY expiration, id FOR UPDATE",
  );
  const results: Array<{
    contractSymbol: string;
    outcome: string;
    quantity: number;
  }> = [];

  for (const lot of expired.rows) {
    const price = prices[lot.underlying];
    if (typeof price !== "number") continue;
    const quantity = lot.remaining_contracts;
    const intrinsic =
      lot.kind === "Call"
        ? price > Number(lot.strike)
        : price < Number(lot.strike);
    let outcome = "expired_worthless";

    if (!intrinsic) {
      outcome = "expired_worthless";
    } else if (lot.side === "short" && lot.kind === "Call") {
      const shortCalls = await client.query(
        "SELECT COALESCE(SUM(remaining_contracts), 0)::int AS quantity FROM option_lots WHERE account_id = current_setting('app.account_id')::int AND kind = 'Call' AND side = 'short' AND status = 'open' AND underlying = $1 AND remaining_contracts > 0",
        [lot.underlying],
      );
      const shares = await client.query(
        "SELECT COALESCE(SUM(remaining_quantity), 0)::int AS quantity FROM stock_lots WHERE account_id = current_setting('app.account_id')::int AND symbol = $1 AND remaining_quantity > 0",
        [lot.underlying],
      );
      const available =
        Number(shares.rows[0].quantity) -
        Number(shortCalls.rows[0].quantity) * multiplier +
        quantity * multiplier;
      if (
        available >= quantity * multiplier &&
        (await consumeShares(client, lot.underlying, quantity * multiplier))
      ) {
        cash += Number(lot.strike) * multiplier * quantity;
        outcome = "assigned_short_call";
      } else {
        outcome = "insufficient_assignment_resources";
      }
    } else if (lot.side === "short" && lot.kind === "Put") {
      const required = Number(lot.strike) * multiplier * quantity;
      if (cash >= required) {
        cash -= required;
        await client.query(
          "INSERT INTO stock_lots (account_id, symbol, quantity, remaining_quantity, cost_basis, acquired_at) VALUES (current_setting('app.account_id')::int, $1, $2, $2, $3, NOW())",
          [
            lot.underlying,
            quantity * multiplier,
            Number(lot.strike) - Number(lot.opening_premium),
          ],
        );
        outcome = "assigned_short_put";
      } else {
        outcome = "insufficient_assignment_resources";
      }
    } else if (lot.side === "long" && lot.kind === "Call") {
      const required = Number(lot.strike) * multiplier * quantity;
      if (cash >= required) {
        cash -= required;
        await client.query(
          "INSERT INTO stock_lots (account_id, symbol, quantity, remaining_quantity, cost_basis, acquired_at) VALUES (current_setting('app.account_id')::int, $1, $2, $2, $3, NOW())",
          [
            lot.underlying,
            quantity * multiplier,
            Number(lot.strike) + Number(lot.opening_premium),
          ],
        );
        outcome = "exercised_long_call";
      } else {
        outcome = "insufficient_exercise_resources";
      }
    } else if (lot.side === "long" && lot.kind === "Put") {
      const requiredShares = quantity * multiplier;
      const shares = await client.query(
        "SELECT COALESCE(SUM(remaining_quantity), 0)::int AS quantity FROM stock_lots WHERE account_id = current_setting('app.account_id')::int AND symbol = $1 AND remaining_quantity > 0",
        [lot.underlying],
      );
      const shortCalls = await client.query(
        "SELECT COALESCE(SUM(remaining_contracts), 0)::int AS quantity FROM option_lots WHERE account_id = current_setting('app.account_id')::int AND underlying = $1 AND kind = 'Call' AND side = 'short' AND status = 'open' AND remaining_contracts > 0",
        [lot.underlying],
      );
      const availableShares =
        Number(shares.rows[0].quantity) -
        Number(shortCalls.rows[0].quantity) * multiplier;
      if (
        availableShares >= requiredShares &&
        (await consumeShares(client, lot.underlying, requiredShares))
      ) {
        cash += Number(lot.strike) * requiredShares;
        outcome = "exercised_long_put";
      } else {
        outcome = "insufficient_exercise_resources";
      }
    }

    if (
      outcome !== "insufficient_assignment_resources" &&
      outcome !== "insufficient_exercise_resources"
    ) {
      await client.query(
        "UPDATE option_lots SET remaining_contracts = 0, status = $1, settlement_outcome = $1, settled_at = NOW() WHERE id = $2",
        [outcome, lot.id],
      );
      await client.query(
        "INSERT INTO option_trades (account_id, idempotency_key, contract_symbol, underlying, kind, strike, expiration, effect, quantity, premium, realized_pnl, created_at) VALUES (current_setting('app.account_id')::int, $1, $2, $3, $4, $5, $6, $7, $8, $9, 0, NOW()) ON CONFLICT (idempotency_key) DO NOTHING",
        [
          `settlement:${lot.id}`,
          lot.contract_symbol,
          lot.underlying,
          lot.kind,
          lot.strike,
          lot.expiration,
          outcome.includes("assigned")
            ? "Assignment"
            : outcome.includes("exercised")
              ? "Exercise"
              : "Expiration",
          quantity,
          lot.opening_premium,
        ],
      );
      if (outcome !== "expired_worthless") {
        await client.query(
            "INSERT INTO cash_ledger (account_id, entry_type, amount, created_at) VALUES (current_setting('app.account_id')::int, $1, $2, NOW())",
          [
            outcome,
            outcome.includes("call") && lot.side === "short"
              ? Number(lot.strike) * multiplier * quantity
              : outcome.includes("put") && lot.side === "short"
                ? -Number(lot.strike) * multiplier * quantity
                : outcome.includes("call")
                  ? -Number(lot.strike) * multiplier * quantity
                  : Number(lot.strike) * multiplier * quantity,
          ],
        );
      }
    } else {
      await client.query(
        "UPDATE option_lots SET remaining_contracts = 0, status = $1, settlement_outcome = $1, settled_at = NOW() WHERE id = $2",
        [outcome, lot.id],
      );
      await client.query(
        "INSERT INTO option_trades (account_id, idempotency_key, contract_symbol, underlying, kind, strike, expiration, effect, quantity, premium, realized_pnl, created_at) VALUES (current_setting('app.account_id')::int, $1, $2, $3, $4, $5, $6, $7, $8, $9, 0, NOW()) ON CONFLICT (idempotency_key) DO NOTHING",
        [
          `settlement:${lot.id}`,
          lot.contract_symbol,
          lot.underlying,
          lot.kind,
          lot.strike,
          lot.expiration,
          "Expiration",
          quantity,
          lot.opening_premium,
        ],
      );
    }
    results.push({ contractSymbol: lot.contract_symbol, outcome, quantity });
  }
  await client.query(
    "UPDATE accounts SET cash = $1, updated_at = NOW() WHERE id = current_setting('app.account_id')::int",
    [cash],
  );
  return results;
}
