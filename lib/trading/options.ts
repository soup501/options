import { PoolClient } from "pg";
import { TradeConflictError } from "@/lib/trading/errors";

type OptionInput = {
  contractSymbol: string;
  underlying: string;
  kind: "Call" | "Put";
  strike: number;
  expiration: string;
  effect: "Buy to open" | "Sell to close" | "Sell to open" | "Buy to close";
  quantity: number;
  premium: number;
  idempotencyKey: string;
};

const multiplier = 100;
const money = (value: number) => value.toFixed(2);

export async function executeOptionTrade(
  client: PoolClient,
  input: OptionInput,
) {
  const duplicate = await client.query(
    "SELECT id, contract_symbol, effect, quantity, premium, realized_pnl FROM option_trades WHERE idempotency_key = $1",
    [input.idempotencyKey],
  );
  if (duplicate.rowCount) return { duplicate: true, trade: duplicate.rows[0] };

  const account = await client.query(
    "SELECT cash FROM accounts WHERE id = current_setting('app.account_id')::int FOR UPDATE",
  );
  if (!account.rowCount)
    throw new TradeConflictError("Account is not initialized. Run setup_db.py first.");
  const cash = Number(account.rows[0].cash);
  const openingSide = input.effect.includes("open")
    ? input.effect.startsWith("Buy")
      ? "long"
      : "short"
    : input.effect.startsWith("Sell")
      ? "long"
      : "short";
  const isOpening = input.effect.includes("open");
  const total = input.premium * multiplier * input.quantity;
  let realizedPnl = 0;

  if (isOpening) {
    if (openingSide === "long" && cash < total)
      throw new TradeConflictError(`Insufficient cash. Available cash is $${money(cash)}.`);
    if (openingSide === "short" && input.kind === "Call") {
      const shares = await client.query(
        "SELECT COALESCE(SUM(remaining_quantity), 0)::int AS quantity FROM stock_lots WHERE account_id = current_setting('app.account_id')::int AND symbol = $1 AND remaining_quantity > 0",
        [input.underlying],
      );
      const shortCalls = await client.query(
        "SELECT COALESCE(SUM(remaining_contracts), 0)::int AS quantity FROM option_lots WHERE account_id = current_setting('app.account_id')::int AND underlying = $1 AND kind = 'Call' AND side = 'short' AND remaining_contracts > 0",
        [input.underlying],
      );
      const availableShares =
        Number(shares.rows[0].quantity) -
        Number(shortCalls.rows[0].quantity) * multiplier;
      if (availableShares < input.quantity * multiplier)
        throw new TradeConflictError(
          `Insufficient unreserved shares. A covered call needs ${input.quantity * multiplier} available shares.`,
        );
    }
    if (openingSide === "short" && input.kind === "Put") {
      const reserved = await client.query(
        "SELECT COALESCE(SUM(remaining_contracts * strike * 100), 0) AS amount FROM option_lots WHERE account_id = current_setting('app.account_id')::int AND kind = 'Put' AND side = 'short' AND remaining_contracts > 0",
      );
      if (
        cash <
        Number(reserved.rows[0].amount) +
          input.strike * multiplier * input.quantity
      )
        throw new TradeConflictError(
          `Insufficient cash collateral. This cash-secured put requires $${money(input.strike * multiplier * input.quantity)}.`,
        );
    }
    await client.query(
      "INSERT INTO option_lots (account_id, contract_symbol, underlying, kind, strike, expiration, side, remaining_contracts, opening_premium, opened_at, status) VALUES (current_setting('app.account_id')::int, $1, $2, $3, $4, $5, $6, $7, $8, NOW(), 'open')",
      [
        input.contractSymbol,
        input.underlying,
        input.kind,
        input.strike,
        input.expiration,
        openingSide,
        input.quantity,
        input.premium,
      ],
    );
  } else {
    const lots = await client.query(
      "SELECT id, remaining_contracts, opening_premium, expiration FROM option_lots WHERE account_id = current_setting('app.account_id')::int AND contract_symbol = $1 AND side = $2 AND status = 'open' AND remaining_contracts > 0 ORDER BY opened_at, id FOR UPDATE",
      [input.contractSymbol, openingSide],
    );
    const available = lots.rows.reduce(
      (sum, lot) => sum + lot.remaining_contracts,
      0,
    );
    if (available < input.quantity)
      throw new TradeConflictError(`Insufficient ${openingSide} option contracts to close.`);
    let remaining = input.quantity;
    for (const lot of lots.rows) {
      if (!remaining) break;
      const used = Math.min(remaining, lot.remaining_contracts);
      realizedPnl +=
        (openingSide === "long"
          ? input.premium - Number(lot.opening_premium)
          : Number(lot.opening_premium) - input.premium) *
        multiplier *
        used;
      await client.query(
        "UPDATE option_lots SET remaining_contracts = remaining_contracts - $1, status = CASE WHEN remaining_contracts = $1 THEN 'closed' ELSE status END, settlement_outcome = CASE WHEN remaining_contracts = $1 AND expiration < NOW() THEN 'closed_expired' ELSE settlement_outcome END, settled_at = CASE WHEN remaining_contracts = $1 THEN NOW() ELSE settled_at END WHERE id = $2",
        [used, lot.id],
      );
      remaining -= used;
    }
  }

  await client.query(
    "UPDATE accounts SET cash = cash + $1, updated_at = NOW() WHERE id = current_setting('app.account_id')::int",
    [input.effect.startsWith("Buy") ? -total : total],
  );
  const trade = await client.query(
    "INSERT INTO option_trades (account_id, idempotency_key, contract_symbol, underlying, kind, strike, expiration, effect, quantity, premium, realized_pnl, created_at) VALUES (current_setting('app.account_id')::int, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) RETURNING id, contract_symbol, effect, quantity, premium, realized_pnl",
    [
      input.idempotencyKey,
      input.contractSymbol,
      input.underlying,
      input.kind,
      input.strike,
      input.expiration,
      input.effect,
      input.quantity,
      input.premium,
      realizedPnl,
    ],
  );
  await client.query(
    "INSERT INTO cash_ledger (account_id, entry_type, amount, created_at) VALUES (current_setting('app.account_id')::int, $1, $2, NOW())",
    [
      `option_${input.effect.toLowerCase().replaceAll(" ", "_")}`,
      input.effect.startsWith("Buy") ? -total : total,
    ],
  );
  return { duplicate: false, trade: trade.rows[0] };
}
