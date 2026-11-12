import { PoolClient } from "pg";

const multiplier = 100;

export async function exerciseLongOption(
  client: PoolClient,
  input: { contractSymbol: string; quantity: number; idempotencyKey: string },
) {
  const duplicate = await client.query(
    "SELECT id, contract_symbol, effect, quantity FROM option_trades WHERE idempotency_key = $1",
    [input.idempotencyKey],
  );
  if (duplicate.rowCount) return { duplicate: true, trade: duplicate.rows[0] };
  const account = await client.query(
    "SELECT cash FROM accounts WHERE id = current_setting('app.account_id')::int FOR UPDATE",
  );
  if (!account.rowCount)
    throw new Error("Account is not initialized. Run setup_db.py first.");
  const lotResult = await client.query(
    "SELECT id, underlying, kind, strike, opening_premium, remaining_contracts FROM option_lots WHERE account_id = current_setting('app.account_id')::int AND contract_symbol = $1 AND side = 'long' AND status = 'open' AND remaining_contracts > 0 ORDER BY opened_at, id FOR UPDATE",
    [input.contractSymbol],
  );
  const available = lotResult.rows.reduce(
    (sum, lot) => sum + lot.remaining_contracts,
    0,
  );
  if (available < input.quantity)
    throw new Error("Insufficient long option contracts to exercise.");
  const lot = lotResult.rows[0];
  const totalShares = input.quantity * multiplier;
  const cash = Number(account.rows[0].cash);
  let cashDelta = 0;
  if (lot.kind === "Call") {
    const debit = Number(lot.strike) * totalShares;
    if (cash < debit)
      throw new Error(
        `Insufficient cash to exercise. Required cash is $${debit.toFixed(2)}.`,
      );
    cashDelta = -debit;
  } else {
    const shares = await client.query(
      "SELECT COALESCE(SUM(remaining_quantity), 0)::int AS quantity FROM stock_lots WHERE account_id = current_setting('app.account_id')::int AND symbol = $1 AND remaining_quantity > 0",
      [lot.underlying],
    );
    const shortCalls = await client.query(
      "SELECT COALESCE(SUM(remaining_contracts), 0)::int AS quantity FROM option_lots WHERE account_id = current_setting('app.account_id')::int AND underlying = $1 AND kind = 'Call' AND side = 'short' AND status = 'open' AND remaining_contracts > 0",
      [lot.underlying],
    );
    if (
      Number(shares.rows[0].quantity) -
        Number(shortCalls.rows[0].quantity) * multiplier <
      totalShares
    )
      throw new Error(
        `Insufficient unreserved shares to exercise. Required shares: ${totalShares}.`,
      );
    const stockLots = await client.query(
      "SELECT id, remaining_quantity FROM stock_lots WHERE account_id = current_setting('app.account_id')::int AND symbol = $1 AND remaining_quantity > 0 ORDER BY acquired_at, id FOR UPDATE",
      [lot.underlying],
    );
    let remaining = totalShares;
    for (const stockLot of stockLots.rows) {
      if (!remaining) break;
      const used = Math.min(remaining, stockLot.remaining_quantity);
      await client.query(
        "UPDATE stock_lots SET remaining_quantity = remaining_quantity - $1 WHERE id = $2",
        [used, stockLot.id],
      );
      remaining -= used;
    }
    cashDelta = Number(lot.strike) * totalShares;
  }
  let remainingContracts = input.quantity;
  for (const optionLot of lotResult.rows) {
    if (!remainingContracts) break;
    const used = Math.min(remainingContracts, optionLot.remaining_contracts);
    if (lot.kind === "Call") {
      await client.query(
        "INSERT INTO stock_lots (account_id, symbol, quantity, remaining_quantity, cost_basis, acquired_at) VALUES (current_setting('app.account_id')::int, $1, $2, $2, $3, NOW())",
        [
          lot.underlying,
          used * multiplier,
          Number(lot.strike) + Number(optionLot.opening_premium),
        ],
      );
    }
    await client.query(
      "UPDATE option_lots SET remaining_contracts = remaining_contracts - $1, status = CASE WHEN remaining_contracts = $1 THEN 'exercised' ELSE status END, settlement_outcome = CASE WHEN remaining_contracts = $1 THEN 'exercised' ELSE settlement_outcome END, settled_at = CASE WHEN remaining_contracts = $1 THEN NOW() ELSE settled_at END WHERE id = $2",
      [used, optionLot.id],
    );
    remainingContracts -= used;
  }
  await client.query(
    "UPDATE accounts SET cash = cash + $1, updated_at = NOW() WHERE id = current_setting('app.account_id')::int",
    [cashDelta],
  );
  const trade = await client.query(
    "INSERT INTO option_trades (account_id, idempotency_key, contract_symbol, underlying, kind, strike, expiration, effect, quantity, premium, realized_pnl, created_at) SELECT current_setting('app.account_id')::int, $1, contract_symbol, underlying, kind, strike, expiration, 'Exercise', $2, 0, 0, NOW() FROM option_lots WHERE id = $3 RETURNING id, contract_symbol, effect, quantity",
    [input.idempotencyKey, input.quantity, lot.id],
  );
  await client.query(
    "INSERT INTO cash_ledger (account_id, entry_type, amount, created_at) VALUES (current_setting('app.account_id')::int, $1, $2, NOW())",
    ["option_exercise", cashDelta],
  );
  return { duplicate: false, trade: trade.rows[0] };
}
