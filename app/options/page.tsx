"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { AppShell, EducationNote, SectionHeader } from "@/components/app-shell";
import { PayoffChart } from "@/components/payoff-chart";
import { HistoryChart } from "@/components/history-chart";
import { BASE_PATH } from "@/lib/base-path";

type Quote = {
  symbol: string;
  price: number;
  currency: string;
  fetchedAt: string;
  change: number;
  changePercent: number;
};
type PopularQuote = Quote & { name: string; type: "Stock" | "ETF" };
type Contract = {
  symbol: string;
  strike: number;
  bid: number;
  ask: number;
  last: number;
  iv: number;
  volume: number;
  openInterest: number;
  expiration: number;
};
const money = (value: number) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateLabel = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const daysToExpiration = (timestamp: number) =>
  Math.max(
    0,
    Math.round(
      (Date.UTC(
        new Date(timestamp * 1000).getUTCFullYear(),
        new Date(timestamp * 1000).getUTCMonth(),
        new Date(timestamp * 1000).getUTCDate(),
      ) -
        Date.UTC(
          new Date().getUTCFullYear(),
          new Date().getUTCMonth(),
          new Date().getUTCDate(),
        )) /
        86400000,
    ),
  );
const durationOptions = [1, 3, 7, 30, 60, 90];
const normalCdf = (value: number) => {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const polynomial =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return 0.5 * (1 + sign * polynomial);
};
const probabilityItm = (
  spot: number,
  strike: number,
  iv: number,
  expiration: number,
  kind: "Calls" | "Puts",
) => {
  const years = Math.max(
    (expiration * 1000 - Date.now()) / (365.25 * 86400000),
    1 / 365.25,
  );
  const volatility = Math.max(iv, 0.0001);
  const d2 =
    (Math.log(spot / strike) + (0.04 + (volatility * volatility) / 2) * years) /
    (volatility * Math.sqrt(years));
  return Math.max(
    0,
    Math.min(1, kind === "Calls" ? normalCdf(d2) : normalCdf(-d2)),
  );
};

export default function Options() {
  const [kind, setKind] = useState<"Calls" | "Puts">("Calls");
  const [effect, setEffect] = useState("Buy to open");
  const [contractCount, setContractCount] = useState("1");
  const [message, setMessage] = useState("");
  const [ticker, setTicker] = useState("AAPL");
  const [symbolInput, setSymbolInput] = useState("AAPL");
  const [suggestions, setSuggestions] = useState<
    Array<{ symbol: string; name: string; exchange: string }>
  >([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [popular, setPopular] = useState<PopularQuote[]>([]);
  const [expiration, setExpiration] = useState<number | null>(null);
  const [durationTarget, setDurationTarget] = useState<number | null>(null);
  const [loadedExpiration, setLoadedExpiration] = useState<number | null>(null);
  const [loadedKind, setLoadedKind] = useState<"Calls" | "Puts">("Calls");
  const [expirations, setExpirations] = useState<number[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selected, setSelected] = useState<Contract | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [loading, setLoading] = useState(false);
  const loadSymbol = useCallback(
    async (symbol: string) => {
      setLoading(true);
      setMessage("");
      try {
        const [quoteResponse, optionsResponse] = await Promise.all([
          fetch(`${BASE_PATH}/api/quote?symbol=${symbol}`),
          fetch(`${BASE_PATH}/api/options?symbol=${symbol}`, { cache: "no-store" }),
        ]);
        const nextQuote = await quoteResponse.json();
        const nextOptions = await optionsResponse.json();
        if (!quoteResponse.ok || !optionsResponse.ok)
          throw new Error(nextOptions.error ?? "Market data unavailable");
        setQuote({ ...nextQuote, symbol });
        setTicker(symbol);
        setExpirations(nextOptions.expirations);
        const nextExpiration = nextOptions.expirations[0] ?? null;
        setExpiration(nextExpiration);
        setDurationTarget(null);
        setLoadedExpiration(nextExpiration);
        setLoadedKind(kind);
        setContracts(kind === "Calls" ? nextOptions.calls : nextOptions.puts);
        setSelected(null);
      } catch (error) {
        setQuote(null);
        setContracts([]);
        setMessage(
          error instanceof Error ? error.message : "Market data unavailable.",
        );
      } finally {
        setLoading(false);
      }
    },
    [kind],
  );
  useEffect(() => {
    const initialFetch = window.setTimeout(() => {
      void loadSymbol(ticker);
    }, 0);
    const timer = window.setInterval(async () => {
      const response = await fetch(`${BASE_PATH}/api/quote?symbol=${ticker}`);
      if (response.ok) setQuote(await response.json());
    }, 30000);
    return () => {
      window.clearTimeout(initialFetch);
      window.clearInterval(timer);
    };
  }, [loadSymbol, ticker]);
  useEffect(() => {
    void fetch(`${BASE_PATH}/api/options/settle`, { method: "POST" });
    const symbols: Array<{
      symbol: string;
      name: string;
      type: "Stock" | "ETF";
    }> = [
      { symbol: "AAPL", name: "Apple", type: "Stock" },
      { symbol: "NVDA", name: "NVIDIA", type: "Stock" },
      { symbol: "MSFT", name: "Microsoft", type: "Stock" },
      { symbol: "AMZN", name: "Amazon", type: "Stock" },
      { symbol: "GOOGL", name: "Alphabet", type: "Stock" },
      { symbol: "META", name: "Meta", type: "Stock" },
      { symbol: "TSLA", name: "Tesla", type: "Stock" },
      { symbol: "JPM", name: "JPMorgan", type: "Stock" },
      { symbol: "AVGO", name: "Broadcom", type: "Stock" },
      { symbol: "BRK-B", name: "Berkshire", type: "Stock" },
      { symbol: "SPY", name: "S&P 500", type: "ETF" },
      { symbol: "QQQ", name: "Nasdaq 100", type: "ETF" },
      { symbol: "IWM", name: "Russell 2000", type: "ETF" },
      { symbol: "DIA", name: "Dow Jones", type: "ETF" },
      { symbol: "VTI", name: "Total Market", type: "ETF" },
      { symbol: "VOO", name: "S&P 500", type: "ETF" },
      { symbol: "XLK", name: "Technology", type: "ETF" },
      { symbol: "XLF", name: "Financials", type: "ETF" },
      { symbol: "GLD", name: "Gold", type: "ETF" },
      { symbol: "TLT", name: "Long Treasuries", type: "ETF" },
    ];
    fetch(`${BASE_PATH}/api/quotes?symbols=${symbols.map((item) => item.symbol).join(",")}`)
      .then((response) => (response.ok ? response.json() : { quotes: [] }))
      .then((data) =>
        setPopular(
          (data.quotes ?? [])
            .map((quote: Quote) => {
              const item = symbols.find(
                (candidate) => candidate.symbol === quote.symbol,
              );
              return item
                ? { ...quote, name: item.name, type: item.type }
                : null;
            })
            .filter(
              (item: PopularQuote | null): item is PopularQuote =>
                item !== null,
            ),
        ),
      );
  }, []);
  useEffect(() => {
    if (!expiration || (expiration === loadedExpiration && kind === loadedKind))
      return;
    const timer = window.setTimeout(() => {
      setContracts([]);
      setSelected(null);
      setLoading(true);
      fetch(`${BASE_PATH}/api/options?symbol=${ticker}&date=${expiration}`, {
        cache: "no-store",
      })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok)
            throw new Error(data.error ?? "Expiration unavailable.");
          return data;
        })
        .then((data) => {
          const next = kind === "Calls" ? data.calls : data.puts;
          if (!Array.isArray(next))
            throw new Error("No contracts returned for this expiration.");
          setContracts(next);
          setLoadedExpiration(expiration);
          setLoadedKind(kind);
        })
        .catch((error) =>
          setMessage(
            error instanceof Error ? error.message : "Expiration unavailable.",
          ),
        )
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [kind, expiration, ticker, loadedExpiration, loadedKind]);
  const submitTicker = (event: FormEvent) => {
    event.preventDefault();
    const next = symbolInput.trim().toUpperCase();
    if (/^[A-Z.\-]{1,10}$/.test(next)) loadSymbol(next);
    else setMessage("Enter a valid ticker symbol.");
  };
  const updateSymbolInput = (value: string) => {
    const next = value.toUpperCase();
    setSymbolInput(next);
    if (!next.trim()) {
      setSuggestions([]);
      return;
    }
    fetch(`${BASE_PATH}/api/search?q=${encodeURIComponent(next)}`)
      .then((response) => (response.ok ? response.json() : { quotes: [] }))
      .then((data) => setSuggestions(data.quotes ?? []));
  };
  const selectDuration = (days: number) => {
    if (!expirations.length) return;
    const closest = expirations.reduce((best, date) =>
      Math.abs(daysToExpiration(date) - days) <
      Math.abs(daysToExpiration(best) - days)
        ? date
        : best,
    );
    setDurationTarget(days);
    setExpiration(closest);
  };
  const premium = selected ? selected.ask || selected.last : 0;
  const transactionPrice = selected
    ? effect.includes("sell")
      ? selected.bid || selected.last
      : selected.ask || selected.last
    : 0;
  const position: "long" | "short" = effect.includes("open")
    ? effect.startsWith("Sell")
      ? "short"
      : "long"
    : effect.startsWith("Sell")
      ? "long"
      : "short";
  const strike = selected?.strike ?? 0;
  const breakEven =
    kind === "Calls" ? strike + transactionPrice : strike - transactionPrice;
  const maxLoss =
    position === "short" && kind === "Puts"
      ? Math.max(0, strike - transactionPrice) * 100
      : position === "short" && kind === "Calls"
        ? Number.POSITIVE_INFINITY
        : transactionPrice * 100 * (selected ? 1 : 0);
  const maxLossLabel = Number.isFinite(maxLoss) ? money(maxLoss) : "Unlimited";
  const tradeExplanation =
    effect === "Sell to open"
      ? kind === "Calls"
        ? `You are agreeing to sell 100 shares of ${ticker} at ${money(strike)} if assigned. You receive ${money(transactionPrice * 100)} premium; profit is capped at that premium and losses can be substantial if the stock rises.`
        : `You are agreeing to buy 100 shares of ${ticker} at ${money(strike)} if assigned. You receive ${money(transactionPrice * 100)} premium; maximum loss is approximately ${maxLossLabel} if the stock falls to zero.`
      : effect === "Buy to open"
        ? kind === "Calls"
          ? `You are buying the right to buy 100 shares of ${ticker} at ${money(strike)}. You pay ${money(transactionPrice * 100)}; maximum loss is that premium and break-even is ${money(breakEven)}.`
          : `You are buying the right to sell 100 shares of ${ticker} at ${money(strike)}. You pay ${money(transactionPrice * 100)}; maximum loss is that premium and break-even is ${money(breakEven)}.`
        : effect === "Sell to close"
          ? `You are closing a long ${kind.toLowerCase().slice(0, -1)} for an estimated ${money(transactionPrice * 100)} credit. Realized profit or loss depends on the premium you originally paid.`
          : `You are closing a short ${kind.toLowerCase().slice(0, -1)} for an estimated ${money(transactionPrice * 100)} debit. Realized profit or loss depends on the premium you originally received.`;
  const contractMeaning =
    kind === "Calls"
      ? position === "long"
        ? `Right to buy 100 shares at ${money(strike)}`
        : `Obligation to sell 100 shares at ${money(strike)}`
      : position === "long"
        ? `Right to sell 100 shares at ${money(strike)}`
        : `Obligation to buy 100 shares at ${money(strike)}`;
  const potentialLossLabel = effect.includes("open")
    ? maxLossLabel
    : "Basis dependent";
  const potentialGainLabel = effect.includes("open")
    ? position === "short"
      ? money(transactionPrice * 100)
      : kind === "Calls"
        ? "Unlimited"
        : money(Math.max(0, strike - transactionPrice) * 100)
    : "Basis dependent";
  const currentPrice = quote?.price ?? strike;
  const range = Math.max(50, Math.abs(currentPrice - strike) + 25);
  const chartMin = Math.max(0, Math.min(currentPrice, strike) - range);
  const chartMax = Math.max(currentPrice, strike) + range;
  const visibleContracts = quote
    ? contracts
        .slice()
        .sort(
          (a, b) =>
            Math.abs(a.strike - quote.price) - Math.abs(b.strike - quote.price),
        )
        .slice(0, 24)
        .sort((a, b) => a.strike - b.strike)
    : contracts.slice(0, 24);
  const currentPriceMarkerIndex = quote
    ? visibleContracts.findIndex((contract) => contract.strike >= quote.price)
    : -1;
  const confirmTrade = async () => {
    if (!selected || !expiration) return;
    const quantity = Number(contractCount);
    setMessage("");
    try {
      const response = await fetch(`${BASE_PATH}/api/options/trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractSymbol: selected.symbol,
          underlying: ticker,
          kind: kind === "Calls" ? "Call" : "Put",
          strike,
          expiration,
          effect,
          quantity,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Option trade could not be completed.");
      setReviewing(false);
      setMessage(
        `Simulated ${effect.toLowerCase()} filled: ${quantity} ${ticker} ${kind.toLowerCase().slice(0, -1)} at ${money(data.fillPremium)}.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Option trade could not be completed.",
      );
    }
  };
  return (
    <AppShell>
      <div className="page-wrap">
        <div className="page-heading">
          <div>
            <span className="eyebrow">OPTIONS EXPLORER</span>
            <h1>Understand the chain</h1>
            <p className="subtitle">
              Search any supported US stock or ETF and explore its live listed
              contracts.
            </p>
          </div>
          <span className="freshness">
            <i />{" "}
            {quote
              ? `Yahoo Finance · ${new Date(quote.fetchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
              : loading
                ? "Fetching market data..."
                : "Market data unavailable"}
          </span>
        </div>
        <section className="popular-panel">
          <div className="popular-heading">
            <div>
              <span className="eyebrow">MARKET SNAPSHOT</span>
              <strong>Popular stocks & funds</strong>
            </div>
            <span>Click a row to explore its options</span>
          </div>
          <div className="popular-grid">
            {popular.length ? (
              popular.map((item) => (
                <button
                  className={
                    item.symbol === ticker
                      ? "popular-stock selected"
                      : "popular-stock"
                  }
                  key={item.symbol}
                  onClick={() => {
                    setSymbolInput(item.symbol);
                    void loadSymbol(item.symbol);
                  }}
                >
                  <span className="popular-symbol">
                    {item.symbol}
                    <small>
                      {item.name} · {item.type}
                    </small>
                  </span>
                  <span className="popular-price">{money(item.price)}</span>
                  <span
                    className={
                      item.change >= 0
                        ? "popular-change positive"
                        : "popular-change negative"
                    }
                  >
                    {item.change >= 0 ? "+" : "−"}
                    {money(Math.abs(item.change))}
                    <small>
                      {item.changePercent >= 0 ? "+" : "−"}
                      {Math.abs(item.changePercent).toFixed(2)}%
                    </small>
                  </span>
                  <span className="popular-bar">
                    <i
                      style={{
                        width: `${Math.min(100, Math.max(12, Math.abs(item.changePercent) * 18))}%`,
                      }}
                    />
                  </span>
                </button>
              ))
            ) : (
              <div className="popular-loading">Loading market snapshot...</div>
            )}
          </div>
        </section>
        <form className="option-toolbar" onSubmit={submitTicker}>
          <div className="typeahead">
            <input
              className="search-input"
              value={symbolInput}
              onChange={(e) => updateSymbolInput(e.target.value)}
              onBlur={() => window.setTimeout(() => setSuggestions([]), 150)}
              aria-label="Underlying symbol"
              placeholder="Search ticker"
            />
            {suggestions.length > 0 && (
              <div className="suggestions">
                {suggestions.map((item) => (
                  <button
                    type="button"
                    key={`${item.symbol}-${item.exchange}`}
                    onMouseDown={() => {
                      setSuggestions([]);
                      setSymbolInput(item.symbol);
                      void loadSymbol(item.symbol);
                    }}
                  >
                    <strong>{item.symbol}</strong>
                    <span>
                      {item.name} · {item.exchange}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="button secondary" type="submit">
            Search
          </button>
        </form>
        <section className="card underlying-ticker">
          <div>
            <span className="eyebrow">UNDERLYING STOCK</span>
            <strong>{ticker}</strong>
            <span className="ticker-label">Current market price</span>
          </div>
          <div className="ticker-price">
            {quote ? money(quote.price) : "--"}
            <span>{quote?.currency ?? "USD"}</span>
          </div>
          <div className="ticker-status">
            <i /> Refreshes every 30 seconds
            <br />
            <small>Yahoo Finance quote · may be delayed</small>
          </div>
        </section>
        <HistoryChart symbol={ticker} currentPrice={quote?.price ?? null} />
        <div className="option-chain-controls">
          <span className="expiration-label">Expiration</span>
          <div
            className="segmented compact"
            aria-label="Target contract duration"
          >
            {durationOptions.map((days) => (
              <button
                key={days}
                type="button"
                className={durationTarget === days ? "selected" : ""}
                onClick={() => selectDuration(days)}
                disabled={!expirations.length}
                title={`Select the listed expiration closest to ${days} days`}
              >
                {days}D
              </button>
            ))}
          </div>
          <select
            aria-label="Expiration"
            className="select"
            value={expiration ?? ""}
            onChange={(e) => {
              setDurationTarget(null);
              setExpiration(Number(e.target.value));
            }}
            disabled={!expirations.length}
          >
            {expirations.length ? (
              expirations.map((date) => (
                <option key={date} value={date}>
                  {dateLabel(date)} · {daysToExpiration(date)} DTE
                </option>
              ))
            ) : (
              <option>No expirations</option>
            )}
          </select>
          <div className="segmented compact" aria-label="Option type">
            <button
              type="button"
              className={kind === "Calls" ? "selected" : ""}
              onClick={() => setKind("Calls")}
            >
              Calls
            </button>
            <button
              type="button"
              className={kind === "Puts" ? "selected" : ""}
              onClick={() => setKind("Puts")}
            >
              Puts
            </button>
          </div>
        </div>
        <div className="option-layout">
          <section className="card chain-card">
            <SectionHeader
              eyebrow={`${ticker} · ${expiration ? `${dateLabel(expiration).toUpperCase()} · ${daysToExpiration(expiration)} DTE` : "NO EXPIRATIONS"}`}
              title={`${kind} chain`}
              action={
                <span className="tag fresh">Standard · 100 multiplier</span>
              }
            />
            <div className="table-wrap">
              <table className="chain">
                <thead>
                  <tr>
                    <th>Strike</th>
                    <th>Bid</th>
                    <th>Ask</th>
                    <th>Last</th>
                    <th>IV</th>
                    <th>Est. ITM at expiry</th>
                    <th>Long break-even</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleContracts.map((contract, index) => (
                    <>
                      {index === currentPriceMarkerIndex && (
                        <tr
                          className="current-price-row"
                          key={`current-${ticker}`}
                        >
                          <td colSpan={8}>
                            <span>Current stock price</span>
                            <strong>{quote ? money(quote.price) : "--"}</strong>
                          </td>
                        </tr>
                      )}
                      <tr
                        className={
                          selected?.symbol === contract.symbol
                            ? "selected-row"
                            : ""
                        }
                        key={contract.symbol}
                        onClick={() => setSelected(contract)}
                      >
                        <td className="strike">{money(contract.strike)}</td>
                        <td>{money(contract.bid)}</td>
                        <td>{money(contract.ask)}</td>
                        <td>{money(contract.last)}</td>
                        <td>{(contract.iv * 100).toFixed(1)}%</td>
                        <td className="probability-cell">
                          {quote && expiration
                            ? `${(probabilityItm(quote.price, contract.strike, contract.iv, expiration, kind) * 100).toFixed(0)}%`
                            : "--"}
                        </td>
                        <td className="break-even-cell">
                          {money(
                            kind === "Calls"
                              ? contract.strike +
                                  (contract.ask || contract.last)
                              : contract.strike -
                                  (contract.ask || contract.last),
                          )}
                        </td>
                      </tr>
                    </>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-foot">
              {loading
                ? "Loading live contracts..."
                : contracts.length
                  ? "Select a contract to build a trade."
                  : "No contracts returned for this symbol."}
            </div>
          </section>
          <section className="card trade-ticket">
            <SectionHeader eyebrow="CONTRACT BUILDER" title="Your trade" />
            {selected ? (
              <>
                <div className="contract-name">
                  <strong>
                    {ticker} {money(strike)} {kind.slice(0, -1)}
                  </strong>
                  <span>
                    {expiration
                      ? `${dateLabel(expiration)} · ${daysToExpiration(expiration)} DTE`
                      : ""}{" "}
                    · Standard contract
                  </span>
                </div>
                <div className="trade-summary">
                  <span className="eyebrow">TRADE SUMMARY</span>
                  <p>{contractMeaning}</p>
                  <div className="trade-summary-grid">
                    <div>
                      <span>Strike price</span>
                      <strong>{money(strike)}</strong>
                    </div>
                    <div>
                      <span>Break-even</span>
                      <strong>{money(breakEven)}</strong>
                    </div>
                    <div>
                      <span>Potential loss</span>
                      <strong className="loss-value">
                        {potentialLossLabel}
                      </strong>
                    </div>
                    <div>
                      <span>Potential gain</span>
                      <strong className="positive">{potentialGainLabel}</strong>
                    </div>
                  </div>
                </div>
                <label>
                  Position effect
                  <select
                    value={effect}
                    onChange={(e) => setEffect(e.target.value)}
                  >
                    <option>Buy to open</option>
                    <option>Sell to close</option>
                    <option>Sell to open</option>
                    <option>Buy to close</option>
                  </select>
                </label>
                <label>
                  Contracts
                  <input
                    type="number"
                    min="1"
                    value={contractCount}
                    onChange={(e) => setContractCount(e.target.value)}
                  />
                </label>
                <div className="estimate">
                  <span>
                    {effect.includes("sell")
                      ? "Estimated credit"
                      : "Estimated debit"}
                  </span>
                  <strong>
                    {effect.includes("sell") ? "+" : "−"}
                    {money(premium * 100)}
                  </strong>
                </div>
                <EducationNote>
                  <strong>
                    {effect === "Sell to open" ? "Obligation:" : "Risk:"}
                  </strong>{" "}
                  {effect === "Sell to open"
                    ? "You may be assigned and must meet collateral requirements."
                    : `The maximum loss for this long option is ${maxLossLabel}.`}
                </EducationNote>
                <button
                  className="button primary full"
                  onClick={() => setReviewing(true)}
                  type="button"
                >
                  Review trade
                </button>
              </>
            ) : (
              <div className="empty-ticket">
                <span className="empty-icon">◇</span>
                <strong>Select a contract</strong>
                <p>
                  Choose a row in the live option chain to see its premium,
                  risk, and trade controls.
                </p>
              </div>
            )}
            {message && <p className="success-message">✓ {message}</p>}
          </section>
        </div>
        {selected && (
          <section className="card payoff">
            <SectionHeader
              eyebrow={`EXPIRATION OUTCOMES · ${expiration ? `${dateLabel(expiration).toUpperCase()} · ${daysToExpiration(expiration)} DTE` : "SELECT AN EXPIRATION"}`}
              title={`${position === "long" ? "Long" : "Short"} ${kind.slice(0, -1)} payoff`}
              action={
                <span className="tag">
                  Long {kind.slice(0, -1)} ·{" "}
                  {expiration ? dateLabel(expiration) : "No expiry"}
                </span>
              }
            />
            <div className="trade-explanation">
              <span className="note-icon">i</span>
              <p>{tradeExplanation}</p>
            </div>
            <div className="payoff-grid">
              <PayoffChart
                kind={kind}
                position={position}
                strike={strike}
                premium={transactionPrice}
                currentPrice={currentPrice}
                minPrice={chartMin}
                maxPrice={chartMax}
                money={money}
              />
              <div className="payoff-facts">
                <div>
                  <span>
                    {effect.includes("sell")
                      ? "Premium received"
                      : "Premium paid"}
                  </span>
                  <strong>{money(transactionPrice * 100)}</strong>
                </div>
                <div>
                  <span>Break-even</span>
                  <strong>{money(breakEven)}</strong>
                </div>
                <div>
                  <span>Maximum loss</span>
                  <strong className="loss-value">{maxLossLabel}</strong>
                </div>
                <div>
                  <span>Contract multiplier</span>
                  <strong>100 shares</strong>
                </div>
              </div>
            </div>
          </section>
        )}
        {reviewing && selected && (
          <div className="modal-backdrop" role="presentation">
            <div
              className="confirm-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
            >
              <span className="eyebrow">CONFIRM SIMULATED ORDER</span>
              <h2 id="confirm-title">
                {effect} {ticker} {kind.toLowerCase().slice(0, -1)}
              </h2>
              <p>
                You are about to simulate 1 contract at a premium of{" "}
                <strong>{money(premium)}</strong> per share, or{" "}
                <strong className="loss-value">{maxLossLabel}</strong> total.
              </p>
              <div className="confirm-summary">
                <span>Underlying price</span>
                <strong>{quote ? money(quote.price) : "Unavailable"}</strong>
                <span>Expiration</span>
                <strong>
                  {expiration ? dateLabel(expiration) : "Unavailable"}
                </strong>
                <span>Maximum loss</span>
                <strong className="loss-value">
                  {effect.includes("open") && !effect.includes("Sell")
                    ? maxLossLabel
                    : "See collateral rules"}
                </strong>
              </div>
              <EducationNote>
                This creates a paper-trading record only. No brokerage or
                real-money order will be placed.
              </EducationNote>
              <div className="modal-actions">
                <button
                  className="button outline"
                  onClick={() => setReviewing(false)}
                >
                  Cancel
                </button>
                <button className="button primary" onClick={confirmTrade}>
                  Confirm simulated trade
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
