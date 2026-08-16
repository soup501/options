import { withAccountIdTransaction } from "@/lib/db";
import { yahoo } from "@/lib/yahoo";
import { executeOptionTrade } from "@/lib/trading/options";
import { settleExpiredOptions } from "@/lib/trading/settlement";

export async function runOptionSettlement(accountId: number) {
  return withAccountIdTransaction(accountId, async (client) => {
  const autoSellCandidates = await client.query(
    "SELECT id, contract_symbol, underlying, kind, strike, expiration, remaining_contracts FROM option_lots WHERE account_id = current_setting('app.account_id')::int AND status = 'open' AND side = 'long' AND kind = 'Put' AND remaining_contracts > 0 AND expiration > NOW()",
  );
  const autoSales: Array<{
    id: number;
    contractSymbol: string;
    underlying: string;
    kind: "Put";
    strike: number;
    expiration: string;
    quantity: number;
    premium: number;
  }> = [];
  for (const lot of autoSellCandidates.rows) {
    try {
      const quote = (await yahoo.quote(lot.underlying)) as {
        regularMarketPrice?: number;
      };
      if (
        typeof quote.regularMarketPrice !== "number" ||
        quote.regularMarketPrice >= Number(lot.strike)
      )
        continue;
      const chain = await yahoo.options(lot.underlying, {
        date: new Date(lot.expiration),
      });
      const contract = (chain.options?.[0]?.puts ?? []).find(
        (item) => item.contractSymbol === lot.contract_symbol,
      );
      const premium = contract?.bid && contract.bid > 0
        ? contract.bid
        : contract?.lastPrice;
      if (typeof premium !== "number" || premium <= 0) continue;
      autoSales.push({
        id: lot.id,
        contractSymbol: lot.contract_symbol,
        underlying: lot.underlying,
        kind: "Put",
        strike: Number(lot.strike),
        expiration: new Date(lot.expiration).toISOString(),
        quantity: lot.remaining_contracts,
        premium,
      });
    } catch {
      continue;
    }
  }
  const pending = await client.query(
    "SELECT DISTINCT underlying FROM option_lots WHERE account_id = current_setting('app.account_id')::int AND status = 'open' AND remaining_contracts > 0 AND expiration::date < CURRENT_DATE",
  );
  const prices: Record<string, number> = {};
  for (const row of pending.rows) {
    const quote = (await yahoo.quote(row.underlying)) as {
      regularMarketPrice?: number;
    };
    if (typeof quote.regularMarketPrice === "number")
      prices[row.underlying] = quote.regularMarketPrice;
  }
    for (const sale of autoSales) {
      await executeOptionTrade(client, {
        contractSymbol: sale.contractSymbol,
        underlying: sale.underlying,
        kind: sale.kind,
        strike: sale.strike,
        expiration: sale.expiration,
        effect: "Sell to close",
        quantity: sale.quantity,
        premium: sale.premium,
        idempotencyKey: `auto-sell-itm:${sale.id}`,
      });
    }
    const settled = await settleExpiredOptions(client, prices);
    return { autoSold: autoSales.length, settled };
  });
}
