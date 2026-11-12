"use client";

import { useEffect, useState } from "react";
import { BASE_PATH } from "@/lib/base-path";

type Quote = {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  change: number;
  changePercent: number;
  fetchedAt: string;
};

const money = (value: number) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function StockInfoButton({ symbol }: { symbol: string }) {
  const [open, setOpen] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadingTimer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      fetch(`${BASE_PATH}/api/quote?symbol=${encodeURIComponent(symbol)}`)
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error ?? "Quote unavailable.");
          if (!cancelled) setQuote(data);
        })
        .catch((reason) => {
          if (!cancelled)
            setError(reason instanceof Error ? reason.message : "Quote unavailable.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(loadingTimer);
    };
  }, [open, symbol]);

  return (
    <>
      <button
        type="button"
        className="ticker ticker-button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        {symbol}
      </button>
      {open && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="confirm-modal stock-info-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${symbol}-info-title`}
          >
            <span className="eyebrow">MARKET SNAPSHOT</span>
            <h2 id={`${symbol}-info-title`}>{symbol}</h2>
            {loading ? (
              <p>Loading current market information...</p>
            ) : error ? (
              <p className="error-message">{error}</p>
            ) : quote ? (
              <>
                <div className="stock-info-price">
                  <strong>{money(quote.price)}</strong>
                  <span className={quote.change >= 0 ? "positive" : "negative"}>
                    {quote.change >= 0 ? "+" : "−"}{money(Math.abs(quote.change))} ({quote.changePercent.toFixed(2)}%)
                  </span>
                </div>
                <div className="confirm-summary">
                  <span>Bid</span>
                  <strong>{money(quote.bid)}</strong>
                  <span>Ask</span>
                  <strong>{money(quote.ask)}</strong>
                  <span>Updated</span>
                  <strong>{new Date(quote.fetchedAt).toLocaleTimeString()}</strong>
                </div>
              </>
            ) : null}
            <div className="modal-actions">
              <button className="button outline" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
