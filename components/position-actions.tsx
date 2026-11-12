"use client";

import { useEffect, useState } from "react";
import { BASE_PATH } from "@/lib/base-path";

type Quote = {
  price: number;
  bid: number;
  ask: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  fetchedAt: string;
};

const money = (value: number) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type StockActionProps = {
  type: "stock";
  symbol: string;
  ownedQuantity: number;
};

type OptionActionProps = {
  type: "option";
  contractSymbol: string;
  underlying: string;
  kind: "Call" | "Put";
  strike: number;
  expiration: string;
  side: "long" | "short";
  quantityAvailable: number;
  openingPremium: number;
  currentMark: number | null;
  underlyingPrice: number | null;
};

type Props = StockActionProps | OptionActionProps;

export function PositionActions(props: Props) {
  const [open, setOpen] = useState(false);
  const [stockSide, setStockSide] = useState<"buy" | "sell">("sell");
  const [quantity, setQuantity] = useState("1");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [pendingAction, setPendingAction] = useState<"stock" | "close" | "exercise" | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState("");

  useEffect(() => {
    if (!open || props.type !== "stock") return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setQuoteError("");
      fetch(`${BASE_PATH}/api/quote?symbol=${encodeURIComponent(props.symbol)}`)
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error ?? "Quote unavailable.");
          if (!cancelled) setQuote(data);
        })
        .catch((error) => {
          if (!cancelled) setQuoteError(error instanceof Error ? error.message : "Quote unavailable.");
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, props]);

  const close = () => {
    if (!working) {
      setOpen(false);
      setMessage("");
    }
  };

  const runAction = async (action: "stock" | "close" | "exercise") => {
    const count = Number(quantity);
    const max = props.type === "stock" && stockSide === "sell"
      ? props.ownedQuantity
      : props.type === "option"
        ? props.quantityAvailable
        : Infinity;
    if (!Number.isInteger(count) || count < 1 || count > max) {
      setMessage(`Enter a whole quantity from 1 to ${max}.`);
      return;
    }
    setWorking(true);
    setMessage("");
    try {
      let endpoint: string;
      let payload: Record<string, unknown>;
      if (props.type === "stock") {
        endpoint = `${BASE_PATH}/api/stocks/trade`;
        payload = {
          symbol: props.symbol,
          side: stockSide,
          quantity: count,
          idempotencyKey: crypto.randomUUID(),
        };
      } else if (action === "exercise") {
        endpoint = `${BASE_PATH}/api/options/exercise`;
        payload = {
          contractSymbol: props.contractSymbol,
          quantity: count,
          idempotencyKey: crypto.randomUUID(),
        };
      } else {
        endpoint = `${BASE_PATH}/api/options/trade`;
        payload = {
          contractSymbol: props.contractSymbol,
          underlying: props.underlying,
          kind: props.kind,
          strike: props.strike,
          expiration: Math.floor(new Date(props.expiration).getTime() / 1000),
          effect: props.side === "long" ? "Sell to close" : "Buy to close",
          quantity: count,
          idempotencyKey: crypto.randomUUID(),
        };
      }
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Action could not be completed.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action could not be completed.");
    } finally {
      setWorking(false);
    }
  };

  const requestAction = (action: "stock" | "close" | "exercise") => {
    const count = Number(quantity);
    const max = props.type === "stock" && stockSide === "sell"
      ? props.ownedQuantity
      : props.type === "option"
        ? props.quantityAvailable
        : Infinity;
    if (!Number.isInteger(count) || count < 1 || count > max) {
      setMessage(`Enter a whole quantity from 1 to ${max}.`);
      return;
    }
    setMessage("");
    setPendingAction(action);
    setConfirming(true);
  };

  return (
    <>
      <button
        className="button outline position-manage-button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
          setMessage("");
        }}
      >
        Manage
      </button>
      {open && (
        <div className="modal-backdrop" role="presentation">
          <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="manage-position-title">
            <span className="eyebrow">POSITION ACTIONS</span>
            <h2 id="manage-position-title">
              {props.type === "stock" ? props.symbol : `${props.underlying} ${props.kind}`}
            </h2>
            {props.type === "stock" ? (
              <>
                <div className="segmented compact">
                  <button type="button" className={stockSide === "buy" ? "selected" : ""} onClick={() => setStockSide("buy")}>Buy</button>
                  <button type="button" className={stockSide === "sell" ? "selected" : ""} onClick={() => setStockSide("sell")}>Sell</button>
                </div>
                <p className="disclaimer">You currently own {props.ownedQuantity} shares. Buys use the live ask and sells use the live bid.</p>
                {quote ? (
                  <div className="confirm-summary">
                    <span>Current price</span>
                    <strong>{money(quote.price)}</strong>
                    <span>Bid / ask</span>
                    <strong>{money(quote.bid)} / {money(quote.ask)}</strong>
                    <span>Day range</span>
                    <strong>{money(quote.dayLow)} – {money(quote.dayHigh)}</strong>
                    <span>Change today</span>
                    <strong className={quote.change >= 0 ? "positive" : "negative"}>
                      {quote.change >= 0 ? "+" : "−"}{money(Math.abs(quote.change))} ({quote.changePercent.toFixed(2)}%)
                    </strong>
                    <span>Updated</span>
                    <strong>{new Date(quote.fetchedAt).toLocaleTimeString()}</strong>
                  </div>
                ) : quoteError ? (
                  <p className="error-message">{quoteError}</p>
                ) : (
                  <p className="disclaimer">Loading current market information...</p>
                )}
              </>
            ) : (
              <>
                <p className="disclaimer">
                  {props.side === "long" ? "Close this long contract or exercise it." : "Buy to close this short contract."}
                </p>
                <div className="confirm-summary">
                  <span>Strike price</span>
                  <strong>{money(props.strike)}</strong>
                  <span>Underlying price</span>
                  <strong>{props.underlyingPrice === null ? "Unavailable" : money(props.underlyingPrice)}</strong>
                  <span>Current option price</span>
                  <strong>{props.currentMark === null ? "Unavailable" : money(props.currentMark)}</strong>
                  <span>Opening premium</span>
                  <strong>{money(props.openingPremium)}</strong>
                  <span>Unrealized P/L</span>
                  <strong className={props.currentMark !== null && (props.side === "long" ? props.currentMark - props.openingPremium : props.openingPremium - props.currentMark) >= 0 ? "positive" : "negative"}>
                    {props.currentMark === null ? "Unavailable" : money((props.side === "long" ? props.currentMark - props.openingPremium : props.openingPremium - props.currentMark) * 100 * props.quantityAvailable)}
                  </strong>
                  <span>Expiration</span>
                  <strong>{new Date(props.expiration).toLocaleDateString()}</strong>
                </div>
              </>
            )}
            <label>
              Quantity
              <input type="number" min="1" max={props.type === "stock" && stockSide === "buy" ? undefined : props.type === "stock" ? props.ownedQuantity : props.quantityAvailable} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
            </label>
            {message && <p className="error-message">{message}</p>}
            {confirming && pendingAction ? (
              <>
                <div className="trade-summary">
                  <span className="eyebrow">TRADE SUMMARY</span>
                  <p>
                    {props.type === "stock"
                      ? `${stockSide === "buy" ? "Buy" : "Sell"} ${quantity} ${props.symbol} shares`
                      : pendingAction === "exercise"
                        ? `Exercise ${quantity} ${props.contractSymbol}`
                        : `${props.side === "long" ? "Close" : "Buy to close"} ${quantity} ${props.contractSymbol}`}
                  </p>
                  <div className="trade-summary-grid">
                    <div>
                      <span>Quantity</span>
                      <strong>{quantity}</strong>
                    </div>
                    <div>
                      <span>Current price</span>
                      <strong>
                        {props.type === "stock"
                          ? quote
                            ? money(stockSide === "buy" ? quote.ask : quote.bid)
                            : "Unavailable"
                          : props.currentMark === null
                            ? "Unavailable"
                            : money(props.currentMark)}
                      </strong>
                    </div>
                    <div>
                      <span>Estimated cash impact</span>
                      <strong>
                        {pendingAction === "exercise"
                          ? "Strike-dependent"
                          : props.type === "stock"
                            ? quote
                              ? `${stockSide === "buy" ? "−" : "+"}${money((stockSide === "buy" ? quote.ask : quote.bid) * Number(quantity))}`
                              : "Unavailable"
                            : props.currentMark === null
                              ? "Unavailable"
                              : `${props.side === "long" ? "+" : "−"}${money(props.currentMark * 100 * Number(quantity))}`}
                      </strong>
                    </div>
                    <div>
                      <span>Unrealized P/L</span>
                      <strong className={props.type === "option" && props.currentMark !== null ? ((props.side === "long" ? props.currentMark - props.openingPremium : props.openingPremium - props.currentMark) >= 0 ? "positive" : "negative") : ""}>
                        {props.type === "option" && props.currentMark !== null
                          ? money((props.side === "long" ? props.currentMark - props.openingPremium : props.openingPremium - props.currentMark) * 100 * Number(quantity))
                          : "See current stock mark"}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className="modal-actions">
                  <button className="button outline" disabled={working} onClick={() => setConfirming(false)}>Back</button>
                  <button className="button primary" disabled={working} onClick={() => void runAction(pendingAction)}>
                    {working ? "Processing..." : "Confirm simulated trade"}
                  </button>
                </div>
              </>
            ) : (
              <div className="modal-actions">
                <button className="button outline" onClick={close}>Cancel</button>
                {props.type === "option" && props.side === "long" && (
                  <button className="button secondary" disabled={working} onClick={() => requestAction("exercise")}>Exercise</button>
                )}
                <button className="button primary" disabled={working} onClick={() => requestAction(props.type === "stock" ? "stock" : "close")}>
                  {working ? "Processing..." : props.type === "stock" ? `${stockSide === "buy" ? "Buy" : "Sell"} stock` : props.side === "long" ? "Close option" : "Buy to close"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
