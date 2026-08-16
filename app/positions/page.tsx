import {
  AppShell,
  EducationNote,
  Metric,
  SectionHeader,
} from "@/components/app-shell";
import { daysUntilExpiration, formatExpirationDate } from "@/lib/expiration";
import { withAccountTransaction } from "@/lib/db";
import { ensureAccount } from "@/lib/accounts";
import { getAuthenticatedIdentity } from "@/lib/auth-account";
import { getPortfolio } from "@/lib/trading/stocks";
import { runOptionSettlement } from "@/lib/trading/run-settlement";
import { yahoo } from "@/lib/yahoo";
import { StockInfoButton } from "@/components/stock-info-button";
import { PositionActions } from "@/components/position-actions";

export const dynamic = "force-dynamic";

export default async function Positions() {
  let portfolio: Awaited<ReturnType<typeof getPortfolio>> | null = null;
  const identity = await getAuthenticatedIdentity();
  if (process.env.DATABASE_URL && identity) {
    const accountId = await withAccountTransaction(identity, (client) =>
      ensureAccount(client, identity),
    );
    await runOptionSettlement(accountId).catch(() => null);
    try {
      portfolio = await withAccountTransaction(identity, (client) =>
        getPortfolio(client),
      );
    } catch {
      portfolio = null;
    }
  }
  const cash = portfolio?.account ? Number(portfolio.account.cash) : null;
  const stockMarks = Object.fromEntries(
    await Promise.all(
      (portfolio?.holdings ?? []).map(async (holding) => {
        try {
          const quote = (await yahoo.quote(holding.symbol)) as {
            regularMarketPrice?: number;
          };
          return [holding.symbol, quote.regularMarketPrice ?? null];
        } catch {
          return [holding.symbol, null];
        }
      }),
    ),
  ) as Record<string, number | null>;
  const underlyingMarks = Object.fromEntries(
    await Promise.all(
      [
        ...new Set(
          (portfolio?.options ?? []).map((option) => option.underlying),
        ),
      ].map(async (symbol) => {
        try {
          const quote = (await yahoo.quote(symbol)) as {
            regularMarketPrice?: number;
          };
          return [symbol, quote.regularMarketPrice ?? null];
        } catch {
          return [symbol, null];
        }
      }),
    ),
  ) as Record<string, number | null>;
  const optionMarks = Object.fromEntries(
    await Promise.all(
      (portfolio?.options ?? []).map(async (option) => {
        try {
          const chain = await yahoo.options(option.underlying, {
            date: new Date(option.expiration),
          });
           const contracts = chain.options?.flatMap((expiration) =>
             option.kind === "Call" ? expiration.calls : expiration.puts,
           ) ?? [];
           const contract = contracts.find(
             (item) => item.contractSymbol === option.contract_symbol,
           ) as { bid?: number; ask?: number; lastPrice?: number } | undefined;
           const mark = option.side === "long" ? contract?.bid : contract?.ask;
           if (!contract || !(mark && mark > 0)) {
             const quote = (await yahoo.quote(option.contract_symbol)) as {
               bid?: number;
               ask?: number;
               regularMarketPrice?: number;
             };
             const quoteMark = option.side === "long" ? quote.bid : quote.ask;
             return [
               option.contract_symbol,
               quoteMark && quoteMark > 0
                 ? quoteMark
                 : (quote.regularMarketPrice ?? contract?.lastPrice ?? null),
             ];
           }
           return [option.contract_symbol, mark];
        } catch {
          return [option.contract_symbol, null];
        }
      }),
    ),
  ) as Record<string, number | null>;
  const stockValue = (portfolio?.holdings ?? []).reduce(
    (total, holding) =>
      total + (stockMarks[holding.symbol] ?? 0) * holding.quantity,
    0,
  );
  const optionValue = (portfolio?.options ?? []).reduce(
    (total, option) =>
      total +
      (optionMarks[option.contract_symbol] ?? 0) *
        100 *
        option.quantity *
        (option.side === "long" ? 1 : -1),
    0,
  );
  const equity = cash === null ? null : cash + stockValue + optionValue;
  return (
    <AppShell>
      <div className="page-wrap">
        <div className="page-heading">
          <div>
            <span className="eyebrow">ACCOUNT POSITIONS</span>
            <h1>Portfolio positions</h1>
            <p className="subtitle">
              See cash, live marks, unrealized P/L, open options, and settled
              contracts in one place.
            </p>
          </div>
        </div>
        <div className="metric-grid">
          <Metric
            label="Account cash"
            value={cash === null ? "--" : `$${cash.toFixed(2)}`}
            change="After settlement"
          />
          <Metric
            label="Estimated equity"
            value={equity === null ? "--" : `$${equity.toFixed(2)}`}
            change="Cash + live marks"
          />
          <Metric
            label="Open options"
            value={`${portfolio?.options.length ?? 0}`}
            change="Active lots"
          />
          <Metric
            label="Settled options"
            value={`${portfolio?.closedOptions.length ?? 0}`}
            change="Lifecycle history"
          />
        </div>
        <section className="card">
          <SectionHeader eyebrow="STOCK HOLDINGS" title="Owned shares" />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Shares</th>
                  <th>Basis</th>
                  <th>Mark</th>
                   <th>Market value</th>
                   <th>Unrealized P/L</th>
                   <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {portfolio?.holdings.length ? (
                  portfolio.holdings.map((holding) => {
                    const mark = stockMarks[holding.symbol];
                    const pnl =
                      mark === null
                        ? null
                        : (mark - Number(holding.cost_basis)) *
                          holding.quantity;
                    return (
                      <tr key={holding.symbol}>
                        <td>
                          <StockInfoButton symbol={holding.symbol} />
                        </td>
                        <td>{holding.quantity}</td>
                        <td>${Number(holding.cost_basis).toFixed(2)}</td>
                        <td>{mark === null ? "--" : `$${mark.toFixed(2)}`}</td>
                        <td>
                          {mark === null
                            ? "--"
                            : `$${(mark * holding.quantity).toFixed(2)}`}
                        </td>
                        <td
                          className={
                            pnl !== null && pnl >= 0 ? "positive" : "negative"
                          }
                        >
                          {pnl === null ? "--" : `$${pnl.toFixed(2)}`}
                        </td>
                        <td>
                          <PositionActions
                            type="stock"
                            symbol={holding.symbol}
                            ownedQuantity={holding.quantity}
                          />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                     <td colSpan={7}>No stock holdings.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card">
          <SectionHeader eyebrow="ACTIVE OPTIONS" title="Open contracts" />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Contract</th>
                  <th>Side</th>
                  <th>Qty</th>
                  <th>Underlying price</th>
                  <th>Premium</th>
                  <th>Mark</th>
                   <th>Unrealized P/L</th>
                    <th>Expiration</th>
                   <th>DTE</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {portfolio?.options.length ? (
                  portfolio.options.map((option) => {
                    const mark = optionMarks[option.contract_symbol];
                    const pnl =
                      mark === null
                        ? null
                        : (option.side === "long"
                            ? mark - Number(option.opening_premium)
                            : Number(option.opening_premium) - mark) *
                          100 *
                          option.quantity;
                    const underlyingPrice = underlyingMarks[option.underlying];
                    return (
                      <tr key={option.contract_symbol}>
                        <td>
                          <strong>
                            <StockInfoButton symbol={option.underlying} /> {option.kind}
                          </strong>
                          <span className="company">
                            {option.contract_symbol}
                          </span>
                        </td>
                        <td>{option.side}</td>
                        <td>{option.quantity}</td>
                        <td>
                          {underlyingPrice === null
                            ? "--"
                            : `$${underlyingPrice.toFixed(2)}`}
                        </td>
                        <td>${Number(option.opening_premium).toFixed(2)}</td>
                        <td>{mark === null ? "--" : `$${mark.toFixed(2)}`}</td>
                        <td
                          className={
                            pnl !== null && pnl >= 0 ? "positive" : "negative"
                          }
                        >
                          {pnl === null ? "--" : `$${pnl.toFixed(2)}`}
                        </td>
                        <td>{formatExpirationDate(option.expiration)}</td>
                        <td>{daysUntilExpiration(option.expiration)}</td>
                        <td>{option.status}</td>
                        <td>
                          <PositionActions
                            type="option"
                            contractSymbol={option.contract_symbol}
                            underlying={option.underlying}
                            kind={option.kind}
                            strike={Number(option.strike)}
                            expiration={option.expiration}
                            side={option.side}
                            quantityAvailable={option.quantity}
                            openingPremium={Number(option.opening_premium)}
                            currentMark={mark}
                            underlyingPrice={underlyingPrice}
                          />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                     <td colSpan={11}>No open option contracts.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <EducationNote>
            Underlying prices use the latest Yahoo quote. Long option marks use
            the bid and short marks use the ask, matching the simulated close
            price.
          </EducationNote>
        </section>
        <section className="card">
          <SectionHeader
            eyebrow="SETTLED OPTIONS"
            title="Expiration and exercise history"
          />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Contract</th>
                  <th>Side</th>
                  <th>Outcome</th>
                  <th>Expiration</th>
                  <th>Settled</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {portfolio?.closedOptions.length ? (
                  portfolio.closedOptions.map((option) => (
                    <tr key={`${option.contract_symbol}-${option.settled_at}`}>
                      <td>
                        <strong>
                          {option.underlying} {option.kind}
                        </strong>
                        <span className="company">
                          {option.contract_symbol}
                        </span>
                      </td>
                      <td>{option.side}</td>
                      <td>{option.settlement_outcome ?? "Closed"}</td>
                      <td>{formatExpirationDate(option.expiration)}</td>
                      <td>
                        {option.settled_at
                          ? new Date(option.settled_at).toLocaleString()
                          : "--"}
                      </td>
                      <td>{option.status}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>No settled option contracts.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
