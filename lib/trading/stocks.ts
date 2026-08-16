import { PoolClient } from "pg";

type TradeInput = {
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  idempotencyKey: string;
};

const cents = (value: number) => value.toFixed(2);

export async function executeStockTrade(client: PoolClient, input: TradeInput) {
  const duplicate = await client.query(
    "SELECT id, symbol, side, quantity, price, realized_pnl FROM stock_trades WHERE idempotency_key = $1",
    [input.idempotencyKey],
  );
  if (duplicate.rowCount) return { duplicate: true, trade: duplicate.rows[0] };

  const accountResult = await client.query(
    "SELECT id, cash FROM accounts WHERE id = current_setting('app.account_id')::int FOR UPDATE",
  );
  if (!accountResult.rowCount)
    throw new Error("Account is not initialized. Run setup_db.py first.");
  const cash = Number(accountResult.rows[0].cash);
  const total = input.price * input.quantity;
  let realizedPnl = 0;

  if (input.side === "buy") {
    if (cash < total)
      throw new Error(`Insufficient cash. Available cash is $${cents(cash)}.`);
    await client.query(
      "INSERT INTO stock_lots (account_id, symbol, quantity, remaining_quantity, cost_basis, acquired_at) VALUES (current_setting('app.account_id')::int, $1, $2, $2, $3, NOW())",
      [input.symbol, input.quantity, input.price],
    );
    await client.query(
      "UPDATE accounts SET cash = cash - $1, updated_at = NOW() WHERE id = current_setting('app.account_id')::int",
      [total],
    );
  } else {
    const lots = await client.query(
      "SELECT id, remaining_quantity, cost_basis FROM stock_lots WHERE account_id = current_setting('app.account_id')::int AND symbol = $1 AND remaining_quantity > 0 ORDER BY acquired_at, id FOR UPDATE",
      [input.symbol],
    );
    const owned = lots.rows.reduce(
      (sum, lot) => sum + lot.remaining_quantity,
      0,
    );
    if (owned < input.quantity)
      throw new Error(
        `Insufficient shares. You own ${owned} ${input.symbol} shares.`,
      );
    let remaining = input.quantity;
    for (const lot of lots.rows) {
      if (!remaining) break;
      const used = Math.min(remaining, lot.remaining_quantity);
      realizedPnl += (input.price - Number(lot.cost_basis)) * used;
      await client.query(
        "UPDATE stock_lots SET remaining_quantity = remaining_quantity - $1 WHERE id = $2",
        [used, lot.id],
      );
      remaining -= used;
    }
    await client.query(
      "UPDATE accounts SET cash = cash + $1, updated_at = NOW() WHERE id = current_setting('app.account_id')::int",
      [total],
    );
  }

  const trade = await client.query(
    "INSERT INTO stock_trades (account_id, idempotency_key, symbol, side, quantity, price, realized_pnl, created_at) VALUES (current_setting('app.account_id')::int, $1, $2, $3, $4, $5, $6, NOW()) RETURNING id, symbol, side, quantity, price, realized_pnl",
    [
      input.idempotencyKey,
      input.symbol,
      input.side,
      input.quantity,
      input.price,
      realizedPnl,
    ],
  );
  await client.query(
    "INSERT INTO cash_ledger (account_id, trade_id, entry_type, amount, created_at) VALUES (current_setting('app.account_id')::int, $1, $2, $3, NOW())",
    [
      trade.rows[0].id,
      `stock_${input.side}`,
      input.side === "buy" ? -total : total,
    ],
  );
  return { duplicate: false, trade: trade.rows[0] };
}

export async function getPortfolio(client: PoolClient) {
  const [
    account,
    holdings,
    options,
    closedOptions,
    activity,
    optionActivity,
    ledger,
  ] = await Promise.all([
    client.query("SELECT cash, initial_cash FROM accounts WHERE id = current_setting('app.account_id')::int"),
    client.query(
      "SELECT symbol, SUM(remaining_quantity)::int AS quantity, SUM(remaining_quantity * cost_basis) / SUM(remaining_quantity) AS cost_basis FROM stock_lots WHERE account_id = current_setting('app.account_id')::int AND remaining_quantity > 0 GROUP BY symbol ORDER BY symbol",
    ),
    client.query(
      "SELECT contract_symbol, underlying, kind, strike, expiration, side, status, SUM(remaining_contracts)::int AS quantity, SUM(remaining_contracts * opening_premium) / SUM(remaining_contracts) AS opening_premium FROM option_lots WHERE account_id = current_setting('app.account_id')::int AND status = 'open' AND remaining_contracts > 0 GROUP BY contract_symbol, underlying, kind, strike, expiration, side, status ORDER BY expiration",
    ),
    client.query(
      "SELECT contract_symbol, underlying, kind, strike, expiration, side, status, remaining_contracts AS quantity, opening_premium, settlement_outcome, settled_at FROM option_lots WHERE account_id = current_setting('app.account_id')::int AND status <> 'open' ORDER BY settled_at DESC NULLS LAST, expiration DESC",
    ),
    client.query(
      "SELECT side, symbol, quantity, price, realized_pnl, created_at FROM stock_trades WHERE account_id = current_setting('app.account_id')::int ORDER BY created_at DESC LIMIT 20",
    ),
    client.query(
      "SELECT CASE WHEN effect LIKE 'Buy%' THEN 'buy' ELSE 'sell' END AS side, underlying AS symbol, quantity, premium AS price, realized_pnl, effect AS description, created_at FROM option_trades WHERE account_id = current_setting('app.account_id')::int ORDER BY created_at DESC LIMIT 20",
    ),
    client.query(
      "SELECT amount, created_at FROM cash_ledger WHERE account_id = current_setting('app.account_id')::int ORDER BY created_at",
    ),
  ]);
  let cash = Number(account.rows[0]?.initial_cash ?? 10000);
  const cashHistory = [cash];
  for (const entry of ledger.rows) {
    cash += Number(entry.amount);
    cashHistory.push(cash);
  }
  const combinedActivity = [...activity.rows, ...optionActivity.rows]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 20);
  return {
    account: account.rows[0] ?? null,
    holdings: holdings.rows,
    options: options.rows,
    closedOptions: closedOptions.rows,
    cashHistory,
    activity: combinedActivity,
  };
}
