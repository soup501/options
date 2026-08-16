"use client";

import { useState } from "react";
import { formatExpirationDate } from "@/lib/expiration";
import { StockInfoButton } from "@/components/stock-info-button";

type StockPosition = { symbol: string; quantity: number; cost_basis: string };
type OptionPosition = {
  contract_symbol: string;
  underlying: string;
  kind: "Call" | "Put";
  strike: string;
  expiration: string;
  side: "long" | "short";
  status: string;
  quantity: number;
  opening_premium: string;
};

type Selected =
  | { type: "stock"; position: StockPosition }
  | { type: "option"; position: OptionPosition };

const money = (value: number) => `$${value.toFixed(2)}`;

export function PositionTable({
  holdings,
  options,
  stockMarks,
  optionMarks,
}: {
  holdings: StockPosition[];
  options: OptionPosition[];
  stockMarks: Record<string, number | null>;
  optionMarks: Record<string, number | null>;
}) {
  const [selected, setSelected] = useState<Selected | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const positions = holdings.length + options.length;

  const open = (value: Selected) => {
    setSelected(value);
    setQuantity("1");
    setMessage("");
  };
  const close = () => {
    setSelected(null);
    setMessage("");
  };
  const runAction = async (action: "sell" | "exercise") => {
    if (!selected) return;
    const count = Number(quantity);
    if (!Number.isInteger(count) || count < 1) {
      setMessage("Enter a valid whole-unit quantity.");
      return;
    }
    setWorking(true);
    setMessage("");
    try {
      let endpoint: string;
      let payload: Record<string, unknown>;
      if (selected.type === "stock") {
        endpoint = "/api/stocks/trade";
        payload = {
          symbol: selected.position.symbol,
          side: "sell",
          quantity: count,
          idempotencyKey: crypto.randomUUID(),
        };
      } else if (action === "exercise") {
        endpoint = "/api/options/exercise";
        payload = {
          contractSymbol: selected.position.contract_symbol,
          quantity: count,
          idempotencyKey: crypto.randomUUID(),
        };
      } else {
        endpoint = "/api/options/trade";
        payload = {
          contractSymbol: selected.position.contract_symbol,
          underlying: selected.position.underlying,
          kind: selected.position.kind,
          strike: Number(selected.position.strike),
          expiration: Math.floor(
            new Date(selected.position.expiration).getTime() / 1000,
          ),
          effect:
            selected.position.side === "long"
              ? "Sell to close"
              : "Buy to close",
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
      if (!response.ok)
        throw new Error(data.error ?? "Action could not be completed.");
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Action could not be completed.",
      );
    } finally {
      setWorking(false);
    }
  };
  const selectedOptionMark =
    selected?.type === "option"
      ? (optionMarks[selected.position.contract_symbol] ?? null)
      : null;
  const selectedOptionPnl =
    selected?.type === "option" && selectedOptionMark !== null
      ? (selected.position.side === "long"
          ? selectedOptionMark - Number(selected.position.opening_premium)
          : Number(selected.position.opening_premium) - selectedOptionMark) *
        100 *
        selected.position.quantity
      : null;

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Position</th>
              <th>Type</th>
              <th>Quantity</th>
              <th>Avg. basis</th>
              <th>Mark</th>
              <th>Unrealized P/L</th>
              <th>Expiration</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding) => (
              <tr
                className="clickable-row"
                key={`stock-${holding.symbol}`}
                onClick={() => open({ type: "stock", position: holding })}
                onKeyDown={(event) =>
                  event.key === "Enter" &&
                  open({ type: "stock", position: holding })
                }
                tabIndex={0}
                role="button"
              >
                <td>
                  <StockInfoButton symbol={holding.symbol} />
                  <span className="company">Stock</span>
                </td>
                <td>
                  <span className="tag stock">Stock</span>
                </td>
                <td>{holding.quantity} shares</td>
                <td>{money(Number(holding.cost_basis))}</td>
                <td>
                  {stockMarks[holding.symbol] === null
                    ? "--"
                    : money(stockMarks[holding.symbol]!)}
                </td>
                <td
                  className={
                    stockMarks[holding.symbol] !== null &&
                    stockMarks[holding.symbol]! >= Number(holding.cost_basis)
                      ? "positive"
                      : "negative"
                  }
                >
                  {stockMarks[holding.symbol] === null
                    ? "--"
                    : money(
                        (stockMarks[holding.symbol]! - Number(holding.cost_basis)) *
                          holding.quantity,
                      )}
                </td>
                <td>--</td>
                <td>Open</td>
              </tr>
            ))}
            {options.map((option) => (
              <tr
                className="clickable-row"
                key={`option-${option.contract_symbol}`}
                onClick={() => open({ type: "option", position: option })}
                onKeyDown={(event) =>
                  event.key === "Enter" &&
                  open({ type: "option", position: option })
                }
                tabIndex={0}
                role="button"
              >
                <td>
                  <StockInfoButton symbol={option.underlying} />
                  <span className="company">{option.contract_symbol}</span>
                </td>
                <td>
                  <span className="tag call">
                    {option.side} {option.kind}
                  </span>
                </td>
                <td>
                  {option.quantity} contract{option.quantity === 1 ? "" : "s"}
                </td>
                <td>{money(Number(option.opening_premium))}</td>
                <td>
                  {optionMarks[option.contract_symbol] === null
                    ? "--"
                    : money(optionMarks[option.contract_symbol]!)}
                </td>
                <td
                  className={
                    optionMarks[option.contract_symbol] === null
                      ? "negative"
                      : (option.side === "long"
                            ? optionMarks[option.contract_symbol]! -
                              Number(option.opening_premium)
                            : Number(option.opening_premium) -
                              optionMarks[option.contract_symbol]!) >= 0
                        ? "positive"
                        : "negative"
                  }
                >
                  {optionMarks[option.contract_symbol] === null
                    ? "--"
                    : money(
                        (option.side === "long"
                          ? optionMarks[option.contract_symbol]! -
                            Number(option.opening_premium)
                          : Number(option.opening_premium) -
                            optionMarks[option.contract_symbol]!) *
                          100 *
                          option.quantity,
                      )}
                </td>
                <td>{formatExpirationDate(option.expiration)}</td>
                <td>{option.status}</td>
              </tr>
            ))}
            {!positions && (
              <tr>
                <td colSpan={8}>
                  No persisted positions yet. Start with a stock or option
                  trade.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {selected && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="position-title"
          >
            <span className="eyebrow">OPEN POSITION</span>
            <h2 id="position-title">
              {selected.type === "stock"
                ? selected.position.symbol
                : `${selected.position.underlying} ${selected.position.kind}`}
            </h2>
            {selected.type === "stock" ? (
              <div className="confirm-summary">
                <span>Shares</span>
                <strong>{selected.position.quantity}</strong>
                <span>Average basis</span>
                <strong>{money(Number(selected.position.cost_basis))}</strong>
                <span>Position value</span>
                <strong>Live quote used when selling</strong>
              </div>
            ) : (
              <div className="confirm-summary">
                <span>Contract</span>
                <strong>{selected.position.contract_symbol}</strong>
                <span>Side / status</span>
                <strong>
                  {selected.position.side} / {selected.position.status}
                </strong>
                <span>Strike / premium</span>
                <strong>
                  {money(Number(selected.position.strike))} /{" "}
                  {money(Number(selected.position.opening_premium))}
                </strong>
                <span>Current price</span>
                <strong>
                  {selectedOptionMark === null ? "Unavailable" : money(selectedOptionMark)}
                </strong>
                <span>Unrealized P/L</span>
                <strong className={selectedOptionPnl !== null && selectedOptionPnl >= 0 ? "positive" : "negative"}>
                  {selectedOptionPnl === null ? "Unavailable" : money(selectedOptionPnl)}
                </strong>
                <span>Market value</span>
                <strong>
                  {selectedOptionMark === null
                    ? "Unavailable"
                    : money(
                        selectedOptionMark *
                          100 *
                          selected.position.quantity *
                          (selected.position.side === "long" ? 1 : -1),
                      )}
                </strong>
                <span>Expiration</span>
                <strong>
                  {formatExpirationDate(selected.position.expiration)}
                </strong>
              </div>
            )}
            <label>
              Quantity
              <input
                type="number"
                min="1"
                max={selected.position.quantity}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </label>
            {selected.type === "option" &&
              selected.position.side === "short" && (
                <p className="disclaimer">
                  Closing a short option uses buy to close. Exercise is only
                  available for long options.
                </p>
              )}
            {message && <p className="error-message">{message}</p>}
            <div className="modal-actions">
              <button className="button outline" onClick={close}>
                Cancel
              </button>
              {selected.type === "option" &&
                selected.position.side === "long" && (
                  <button
                    className="button secondary"
                    disabled={working}
                    onClick={() => void runAction("exercise")}
                  >
                    Exercise
                  </button>
                )}
              <button
                className="button primary"
                disabled={working}
                onClick={() => void runAction("sell")}
              >
                {working
                  ? "Processing..."
                  : selected.type === "stock"
                    ? "Sell stock"
                    : selected.position.side === "long"
                      ? "Sell to close"
                      : "Buy to close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
