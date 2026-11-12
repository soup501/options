import Link from "next/link";
import { auth } from "@/auth";
import {
  AppShell,
  EducationNote,
  Metric,
  SectionHeader,
  Sparkline,
} from "@/components/app-shell";
import { withAccountTransaction } from "@/lib/db";
import { ensureAccount } from "@/lib/accounts";
import { getAuthenticatedIdentity } from "@/lib/auth-account";
import { getPortfolio } from "@/lib/trading/stocks";
import { PositionTable } from "@/components/position-table";
import { formatExpirationDate } from "@/lib/expiration";
import { runOptionSettlement } from "@/lib/trading/run-settlement";
import { yahoo } from "@/lib/yahoo";
import { PortfolioValueChart } from "@/components/portfolio-value-chart";

export const dynamic = "force-dynamic";

export default async function Home() {
  let portfolio: Awaited<ReturnType<typeof getPortfolio>> | null = null;
  const session = await auth();
  const displayName = session?.user?.name ?? session?.user?.email;
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
  const holdings = portfolio?.holdings ?? [];
  const options = portfolio?.options ?? [];
  const positions = holdings.length + options.length;
  const firstOption = options[0];
  const stockMarks = Object.fromEntries(
    await Promise.all(
      holdings.map(async (holding) => {
        try {
          const quote = (await yahoo.quote(holding.symbol)) as {
            regularMarketPrice?: number;
          };
          return [holding.symbol, quote.regularMarketPrice ?? null];
        } catch {
          return [holding.symbol, null];
        }
      }),
    )
  ) as Record<string, number | null>;
  const optionMarks = Object.fromEntries(
    await Promise.all(
      options.map(async (option) => {
        try {
          const quote = (await yahoo.quote(option.contract_symbol)) as {
            bid?: number;
            ask?: number;
            regularMarketPrice?: number;
          };
          const mark =
            option.side === "long"
              ? (quote.bid ?? quote.regularMarketPrice)
              : (quote.ask ?? quote.regularMarketPrice);
          return [option.contract_symbol, mark ?? null];
        } catch {
          return [option.contract_symbol, null];
        }
      }),
    )
  ) as Record<string, number | null>;
  const stockBreakdown = holdings.map((holding) => ({
    symbol: holding.symbol,
    value:
      (stockMarks[holding.symbol] ?? Number(holding.cost_basis)) *
      holding.quantity,
  }));
  const optionBreakdown = options.map((option) => ({
    label: `${option.underlying} ${option.kind} ${Number(option.strike).toFixed(0)}`,
    value:
      (optionMarks[option.contract_symbol] ?? Number(option.opening_premium)) *
      100 *
      option.quantity *
      (option.side === "long" ? 1 : -1),
    quantity: option.quantity,
    side: option.side,
  }));
  return (
    <AppShell>
      <div className="page-wrap">
        <div className="page-heading">
          <div>
            <span className="eyebrow">LEARNING PORTFOLIO</span>
            <h1>
              Good morning, {displayName} <span className="wave">✦</span>
            </h1>
            <p className="subtitle">
              Here is how your persisted paper portfolio is doing.
            </p>
          </div>
          <Link href="/stocks" className="button primary">
            ＋ New trade
          </Link>
        </div>
        <div className="metric-grid">
          <Metric
            label="Account cash"
            value={
              portfolio?.account
                ? `$${Number(portfolio.account.cash).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                : "--"
            }
            change="Persisted balance"
          />
          <Metric
            label="Available cash"
            value={
              portfolio?.account
                ? `$${Number(portfolio.account.cash).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                : "--"
            }
            change="Before collateral"
          />
          <Metric
            label="Invested"
            value={`${positions} position${positions === 1 ? "" : "s"}`}
            change="Open stock and option lots"
          />
          <Metric
            label="Total return"
            value="--"
            change="Market marks pending"
          />
        </div>
        <PortfolioValueChart
          cash={Number(portfolio?.account?.cash ?? 0)}
          stocks={stockBreakdown}
          options={optionBreakdown}
        />
        <div className="dashboard-grid">
          <section className="card performance-card">
            <SectionHeader
              eyebrow="CASH LEDGER"
              title="Cash balance over time"
              action={
                <select className="select">
                  <option>1M</option>
                  <option>3M</option>
                  <option>All time</option>
                </select>
              }
            />
            <div className="chart-total">
              <strong>
                {portfolio?.account
                  ? `$${Number(portfolio.account.cash).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                  : "--"}
              </strong>
              <span className="change">Persisted cash movements</span>
            </div>
            <Sparkline values={portfolio?.cashHistory} />
            <div className="axis">
              <span>Start</span>
              <span>Recent</span>
              <span>Now</span>
            </div>
          </section>
          <section className="card alert-card">
            <SectionHeader eyebrow="ACTION CENTER" title="Worth a look" />
            {firstOption ? (
              <Link href="/options" className="alert-item">
                <span className="alert-badge amber">!</span>
                <div>
                  <strong>
                    {firstOption.underlying} {firstOption.kind.toLowerCase()}{" "}
                    position
                  </strong>
                  <p>
                    {formatExpirationDate(firstOption.expiration)} ·{" "}
                    {firstOption.quantity} contract
                    {firstOption.quantity === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="arrow">›</span>
              </Link>
            ) : (
              <Link href="/options" className="alert-item">
                <span className="alert-badge blue">i</span>
                <div>
                  <strong>No open option positions</strong>
                  <p>Choose a contract to start learning.</p>
                </div>
                <span className="arrow">›</span>
              </Link>
            )}
            <EducationNote>
              Quotes are delayed or may be unavailable. Every fill shows its
              source and timestamp before you confirm.
            </EducationNote>
          </section>
        </div>
        <section className="card positions-card">
          <SectionHeader
            eyebrow="YOUR PORTFOLIO"
            title="Open positions"
            action={
              <Link href="/options" className="text-link">
                View all positions →
              </Link>
            }
          />
          <PositionTable
            holdings={holdings}
            options={options}
            stockMarks={stockMarks}
            optionMarks={optionMarks}
          />
        </section>
        <section className="bottom-grid">
          <div>
            <SectionHeader
              eyebrow="RECENT ACTIVITY"
              title="Latest moves"
              action={
                <Link href="/stocks" className="text-link">
                  Trade stocks →
                </Link>
              }
            />
            <div className="activity-list">
              {portfolio?.activity.length ? (
                portfolio.activity.map((trade, index) => (
                  <div key={`${trade.created_at}-${index}`}>
                    <span className="activity-icon buy">↗</span>
                    <p>
                      <strong>
                        {trade.description ??
                          `${trade.side === "buy" ? "Bought" : "Sold"} ${trade.quantity} ${trade.symbol}`}
                      </strong>
                      <small>
                        {new Date(trade.created_at).toLocaleString()} · Filled
                        at ${Number(trade.price).toFixed(2)}
                      </small>
                    </p>
                    <b>
                      {trade.side === "sell"
                        ? `$${Number(trade.realized_pnl).toFixed(2)}`
                        : `-$${(Number(trade.price) * trade.quantity).toFixed(2)}`}
                    </b>
                  </div>
                ))
              ) : (
                <p>No trades recorded yet.</p>
              )}
            </div>
          </div>
          <div className="tip-card">
            <span className="eyebrow">CONCEPT OF THE DAY</span>
            <h3>What is a covered call?</h3>
            <p>
              Learn how selling a call against shares you own can generate
              premium, and understand the trade-off.
            </p>
            <Link href="/learn" className="button secondary">
              Read the lesson →
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
