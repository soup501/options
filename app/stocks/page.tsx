"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { BASE_PATH } from "@/lib/base-path";
import {
  AppShell,
  EducationNote,
  SectionHeader,
  Sparkline,
} from "@/components/app-shell";

type Quote = {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  fetchedAt: string;
};
type Holding = { symbol: string; quantity: number; cost_basis: string };
type Activity = {
  side: "buy" | "sell";
  symbol: string;
  quantity: number;
  price: string;
  realized_pnl: string;
  created_at: string;
};
type Portfolio = {
  account: { cash: string } | null;
  holdings: Holding[];
  activity: Activity[];
};

const money = (value: number) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Stocks() {
  const [symbol, setSymbol] = useState("AAPL");
  const [shares, setShares] = useState("10");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [message, setMessage] = useState("");
  const [quantityWarning, setQuantityWarning] = useState("");
  const [loading, setLoading] = useState(false);
  const [trading, setTrading] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const loadPortfolio = useCallback(async () => {
    const response = await fetch(`${BASE_PATH}/api/portfolio`);
    if (!response.ok)
      throw new Error(
        (await response.json()).error ?? "Portfolio unavailable.",
      );
    setPortfolio(await response.json());
  }, []);

  const loadQuote = useCallback(async (nextSymbol: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${BASE_PATH}/api/quote?symbol=${encodeURIComponent(nextSymbol)}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Quote unavailable.");
      setQuote(data);
      setMessage("");
    } catch (error) {
      setQuote(null);
      setMessage(error instanceof Error ? error.message : "Quote unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.all([loadQuote(symbol), loadPortfolio()]).catch((error) =>
        setMessage(
          error instanceof Error ? error.message : "Portfolio unavailable.",
        ),
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadPortfolio, loadQuote, symbol]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const nextSymbol = symbol.trim().toUpperCase();
    if (/^[A-Z.\-]{1,10}$/.test(nextSymbol)) {
      setSymbol(nextSymbol);
      void loadQuote(nextSymbol);
    } else setMessage("Enter a valid ticker symbol.");
  };

  const submitTrade = async () => {
    const quantity = Number(shares);
    if (!quote || !Number.isInteger(quantity) || quantity < 1) {
      setMessage("Enter a whole-share quantity after a quote loads.");
      return;
    }
    setTrading(true);
    setMessage("");
    try {
      const response = await fetch(`${BASE_PATH}/api/stocks/trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: quote.symbol,
          side,
          quantity,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Trade could not be completed.");
      const realized = Number(data.trade.realized_pnl ?? 0);
      setMessage(
        `${side === "buy" ? "Bought" : "Sold"} ${quantity} ${quote.symbol} at ${money(data.fillPrice)}.${
          side === "sell" ? ` Realized stock P/L: ${money(realized)}.` : ""
        }`,
      );
      setReviewing(false);
      await loadPortfolio();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Trade could not be completed.",
      );
    } finally {
      setTrading(false);
    }
  };

  const reviewTrade = () => {
    if (!quote || !Number.isInteger(quantity) || quantity < 1) {
      setMessage("Enter a whole-share quantity after a quote loads.");
      return;
    }
    setReviewing(true);
  };

  const fillPrice = side === "buy" ? (quote?.ask ?? 0) : (quote?.bid ?? 0);
  const quantity = Number(shares) || 0;
  const ownedShares =
    portfolio?.holdings.find((item) => item.symbol === quote?.symbol)?.quantity ??
    0;
  const maxShares =
    side === "buy"
      ? Math.floor(Number(portfolio?.account?.cash ?? 0) / fillPrice)
      : ownedShares;

  return (
    <AppShell>
      <div className="page-wrap">
        <div className="page-heading">
          <div>
            <span className="eyebrow">MARKET EXPLORER</span>
            <h1>Trade stocks</h1>
            <p className="subtitle">
              Paper fills use the current Yahoo ask for buys and bid for sells.
            </p>
          </div>
          <span className="freshness">
            <i />{" "}
            {quote
              ? `Yahoo Finance · ${new Date(quote.fetchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
              : loading
                ? "Fetching quote..."
                : "Quote unavailable"}
          </span>
        </div>
        <form className="search-row" onSubmit={submitSearch}>
          <input
            className="search-input"
            value={symbol}
            onChange={(event) => setSymbol(event.target.value.toUpperCase())}
            aria-label="Stock symbol"
            placeholder="Search symbol"
          />
          <button className="button secondary" type="submit">
            Search
          </button>
        </form>
        <div className="stock-layout">
          <section className="card quote-card">
            <div className="quote-top">
              <div>
                <span className="ticker large">{quote?.symbol ?? symbol}</span>
                <span className="company">Live market quote</span>
              </div>
              <span
                className={
                  quote && quote.change >= 0
                    ? "change positive"
                    : "change negative"
                }
              >
                {quote
                  ? `${quote.change >= 0 ? "↗ +" : "↘ −"}${Math.abs(quote.changePercent).toFixed(2)}%`
                  : "--"}
              </span>
            </div>
            <div className="quote-price">
              <strong>{quote ? money(quote.price) : "--"}</strong>
              <span>USD · Yahoo may be delayed</span>
            </div>
            <Sparkline color="#4da787" />
            <div className="quote-stats">
              <div>
                <span>Bid</span>
                <b>{quote ? money(quote.bid) : "--"}</b>
              </div>
              <div>
                <span>Ask</span>
                <b>{quote ? money(quote.ask) : "--"}</b>
              </div>
              <div>
                <span>Position</span>
                <b>
                  {portfolio?.holdings.find(
                    (item) => item.symbol === quote?.symbol,
                  )?.quantity ?? 0}{" "}
                  shares
                </b>
              </div>
            </div>
          </section>
          <section className="card trade-ticket">
            <SectionHeader eyebrow="PAPER TRADE" title="Order ticket" />
            <div className="segmented">
              <button
                type="button"
                className={side === "buy" ? "selected" : ""}
                onClick={() => setSide("buy")}
              >
                Buy
              </button>
              <button
                type="button"
                className={side === "sell" ? "selected" : ""}
                onClick={() => setSide("sell")}
              >
                Sell
              </button>
            </div>
            <label>
              Shares
              <input
                type="number"
                min="1"
                step="1"
                value={shares}
                onChange={(event) => {
                  const next = event.target.value;
                  const nextQuantity = Number(next);
                  if (Number.isInteger(nextQuantity) && nextQuantity > maxShares) {
                    setShares(String(maxShares));
                    setQuantityWarning(
                      `Limited to ${maxShares} share${maxShares === 1 ? "" : "s"} available to ${side}.`,
                    );
                  } else {
                    setShares(next);
                    setQuantityWarning("");
                  }
                }}
              />
            </label>
            {quantityWarning && (
              <p className="warning-message" role="status">
                {quantityWarning}
              </p>
            )}
            <div className="estimate">
              <span>Estimated {side === "buy" ? "debit" : "credit"}</span>
              <strong>
                {side === "buy" ? "−" : "+"}
                {money(quantity * fillPrice)}
              </strong>
            </div>
            <EducationNote>
              {side === "buy"
                ? `You will buy at the current ask of ${money(fillPrice)}.`
                : `You will sell at the current bid of ${money(fillPrice)}. FIFO realized gain/loss is calculated from your stored lots.`}{" "}
              This is a simulation, not a real market fill.
            </EducationNote>
            <button
              className="button primary full"
              disabled={trading || !quote}
              onClick={reviewTrade}
            >
              {trading ? "Filling..." : `Review ${side} order`}
            </button>
            {message && (
              <p
                className={
                  message.includes("could not") ||
                  message.includes("Insufficient")
                    ? "error-message"
                    : "success-message"
                }
              >
                ✓ {message}
              </p>
            )}
          </section>
        </div>
        {reviewing && quote && (
          <div className="modal-backdrop" role="presentation">
            <div
              className="confirm-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="stock-confirm-title"
            >
              <span className="eyebrow">CONFIRM SIMULATED ORDER</span>
              <h2 id="stock-confirm-title">
                {side === "buy" ? "Buy" : "Sell"} {quantity} {quote.symbol} shares
              </h2>
              <p>
                Review the details below before submitting this paper trade.
                The order will use the current {side === "buy" ? "ask" : "bid"}.
              </p>
              <div className="confirm-summary">
                <span>Order type</span>
                <strong>{side === "buy" ? "Buy shares" : "Sell shares"}</strong>
                <span>Shares</span>
                <strong>{quantity}</strong>
                <span>Estimated fill price</span>
                <strong>{money(fillPrice)}</strong>
                <span>Estimated {side === "buy" ? "debit" : "credit"}</span>
                <strong>
                  {side === "buy" ? "−" : "+"}{money(quantity * fillPrice)}
                </strong>
                <span>Day range</span>
                <strong>{money(quote.dayLow)} – {money(quote.dayHigh)}</strong>
                <span>Change today</span>
                <strong className={quote.change >= 0 ? "positive" : "negative"}>
                  {quote.change >= 0 ? "+" : "−"}{money(Math.abs(quote.change))} ({quote.changePercent.toFixed(2)}%)
                </strong>
                <span>Quote time</span>
                <strong>
                  {new Date(quote.fetchedAt).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </strong>
              </div>
              <EducationNote>
                This creates a paper-trading record only. No brokerage or
                real-money order will be placed.
              </EducationNote>
              <div className="modal-actions">
                <button
                  className="button outline"
                  disabled={trading}
                  onClick={() => setReviewing(false)}
                >
                  Cancel
                </button>
                <button
                  className="button primary"
                  disabled={trading}
                  onClick={() => void submitTrade()}
                >
                  {trading ? "Filling..." : "Confirm simulated trade"}
                </button>
              </div>
            </div>
          </div>
        )}
        <section className="card">
          <SectionHeader eyebrow="ACCOUNT" title="Persisted portfolio" />
          <div className="balance-row">
            <div>
              <span className="eyebrow">AVAILABLE CASH</span>
              <strong>
                {portfolio?.account
                  ? money(Number(portfolio.account.cash))
                  : "--"}
              </strong>
            </div>
            <div>
              <span className="eyebrow">OPEN STOCKS</span>
              <strong>{portfolio?.holdings.length ?? "--"}</strong>
            </div>
            <div>
              <span className="eyebrow">TRADES RECORDED</span>
              <strong>{portfolio?.activity.length ?? "--"}</strong>
            </div>
          </div>
        </section>
        <section className="card">
          <SectionHeader eyebrow="HOLDINGS" title="Stock positions" />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Shares</th>
                  <th>Average basis</th>
                  <th>Current value</th>
                  <th>Unrealized P/L</th>
                </tr>
              </thead>
              <tbody>
                {portfolio?.holdings.length ? (
                  portfolio.holdings.map((holding) => {
                    const mark =
                      holding.symbol === quote?.symbol
                        ? quote.price
                        : Number(holding.cost_basis);
                    const value = holding.quantity * mark;
                    const pnl =
                      holding.quantity * (mark - Number(holding.cost_basis));
                    return (
                      <tr key={holding.symbol}>
                        <td>
                          <strong className="ticker">{holding.symbol}</strong>
                        </td>
                        <td>{holding.quantity}</td>
                        <td>{money(Number(holding.cost_basis))}</td>
                        <td>{money(value)}</td>
                        <td className={pnl >= 0 ? "positive" : "negative"}>
                          {money(pnl)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5}>
                      No persisted stock positions yet. Buy shares to create
                      your first FIFO lot.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card">
          <SectionHeader eyebrow="ACTIVITY" title="Recent stock trades" />
          <div className="activity-list">
            {portfolio?.activity.length ? (
              portfolio.activity.map((trade, index) => (
                <div key={`${trade.created_at}-${index}`}>
                  <span
                    className={`activity-icon ${trade.side === "buy" ? "buy" : "deposit"}`}
                  >
                    {trade.side === "buy" ? "↗" : "↘"}
                  </span>
                  <p>
                    <strong>
                      {trade.side === "buy" ? "Bought" : "Sold"}{" "}
                      {trade.quantity} {trade.symbol}
                    </strong>
                    <small>
                      {new Date(trade.created_at).toLocaleString()} · Filled at{" "}
                      {money(Number(trade.price))}
                    </small>
                  </p>
                  <b
                    className={
                      Number(trade.realized_pnl) >= 0 ? "positive" : "negative"
                    }
                  >
                    {trade.side === "sell"
                      ? money(Number(trade.realized_pnl))
                      : `−${money(Number(trade.price) * trade.quantity)}`}
                  </b>
                </div>
              ))
            ) : (
              <p>No trades recorded yet.</p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
