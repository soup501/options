"use client";

import { useState } from "react";

const stockNow = 50;
const strike = 55;
const premium = 2;
const multiplier = 100;
const dollars = (value: number) =>
  `${value < 0 ? "-" : value > 0 ? "+" : ""}$${Math.abs(value).toLocaleString()}`;

export function CallLesson() {
  const [stockAtExpiry, setStockAtExpiry] = useState(60);
  const [view, setView] = useState<"buyer" | "seller">("buyer");
  const intrinsic = Math.max(0, stockAtExpiry - strike);
  const buyerPnl = (intrinsic - premium) * multiplier;
  const sellerPnl = -buyerPnl;
  const stockGain = (stockAtExpiry - stockNow) * multiplier;
  const coveredCallPnl = stockGain + sellerPnl;
  const pnl = view === "buyer" ? buyerPnl : sellerPnl;
  const inTheMoney = stockAtExpiry > strike;
  const code =
    view === "buyer"
      ? "// Buyer owns an optional operation\ncall.exercise() // may buy 100 XYZ @ $55\n// upfront fee: $2 x 100 = $200\n// expires: fixed TTL"
      : "// Seller implements the obligation\nonAssignment(() => sell(100, 'XYZ', 55))\n// upfront credit: $2 x 100 = $200\n// liability exists until close or expiry";

  return (
    <section className="call-lab" id="call-lab">
      <div className="call-lab-heading">
        <div>
          <span className="eyebrow">INTERACTIVE CONCEPT LAB</span>
          <h2>One call contract, two sides</h2>
          <p>
            The buyer purchases a right. The seller accepts the matching
            obligation. Drag the stock price to see the same contract from both
            sides.
          </p>
        </div>
        <div className="contract-token">
          <span>XYZ CALL</span>
          <strong>$55</strong>
          <small>Strike · $2 premium · 100 shares</small>
        </div>
      </div>
      <div
        className="call-side-switch"
        role="group"
        aria-label="Call position side"
      >
        <button
          className={view === "buyer" ? "active" : ""}
          onClick={() => setView("buyer")}
        >
          <span>BUY TO OPEN</span>
          <strong>Long call buyer</strong>
          <small>Pays $200 for the right to buy</small>
        </button>
        <button
          className={view === "seller" ? "active seller" : ""}
          onClick={() => setView("seller")}
        >
          <span>SELL TO OPEN</span>
          <strong>Short call seller</strong>
          <small>Receives $200; must sell if assigned</small>
        </button>
      </div>
      <div className="call-model">
        <div className="call-controls">
          <div className="price-readout">
            <span>XYZ price at expiration</span>
            <strong>${stockAtExpiry}</strong>
            <small>
              Today: ${stockNow} · Strike: ${strike}
            </small>
          </div>
          <input
            aria-label="Stock price at expiration"
            type="range"
            min="40"
            max="70"
            step="1"
            value={stockAtExpiry}
            onChange={(event) => setStockAtExpiry(Number(event.target.value))}
          />
          <div className="range-labels">
            <span>$40</span>
            <span>$55 strike</span>
            <span>$70</span>
          </div>
          <div className="call-status">
            <span className={inTheMoney ? "status-itm" : "status-otm"}>
              {inTheMoney
                ? `In the money by $${intrinsic}`
                : stockAtExpiry === strike
                  ? "At the money"
                  : "Out of the money"}
            </span>
            <p>
              {inTheMoney
                ? "The buyer may exercise the right to buy at $55."
                : "Buying at $55 would not beat the market price, so the call expires worthless."}
            </p>
          </div>
        </div>
        <div className="call-result">
          <span className="eyebrow">AT EXPIRATION</span>
          <strong className={pnl >= 0 ? "result-profit" : "result-loss"}>
            {pnl >= 0 ? "Profit" : "Loss"} {dollars(pnl)}
          </strong>
          <div className="result-equation">
            <span>
              {view === "buyer" ? "Intrinsic value" : "Premium received"}
            </span>
            <b>{view === "buyer" ? `$${intrinsic} x 100` : "$2 x 100"}</b>
            <i>
              {view === "buyer"
                ? "- $200 premium"
                : `- $${intrinsic * 100} intrinsic value`}
            </i>
          </div>
          {view === "seller" && (
            <div className="result-equation">
              <span>Stock gain + call P/L</span>
              <b>
                {dollars(stockGain)} + {dollars(sellerPnl)}
              </b>
              <i
                className={
                  coveredCallPnl >= 0 ? "result-profit" : "result-loss"
                }
              >
                Covered call total {dollars(coveredCallPnl)}
              </i>
            </div>
          )}
          <p>
            {view === "buyer"
              ? buyerPnl >= 0
                ? `The shares are worth $${stockAtExpiry}, but your contract lets you buy at $55. After the $200 premium, you keep ${dollars(buyerPnl)}.`
                : `The call does not recover its $200 upfront cost. Your loss is limited to ${dollars(buyerPnl)}.`
              : sellerPnl >= 0
                ? `You keep ${dollars(sellerPnl)} of the $200 premium because the buyer's claim costs less than the premium received.`
                : `You received $200, but must absorb $${intrinsic * 100} of intrinsic value. The short call loses ${dollars(sellerPnl)}.`}
          </p>
        </div>
      </div>
      <div className="call-timeline">
        <div>
          <span>01 · OPEN</span>
          <strong>{view === "buyer" ? "Pay $200" : "Receive $200"}</strong>
          <p>
            {view === "buyer"
              ? "Buy to open creates a long call."
              : "Sell to open creates a short call obligation."}
          </p>
        </div>
        <i>→</i>
        <div>
          <span>02 · WAIT</span>
          <strong>Price and time change</strong>
          <p>Premium changes with stock price, time, volatility, and rates.</p>
        </div>
        <i>→</i>
        <div>
          <span>03 · EXIT</span>
          <strong>{view === "buyer" ? "Sell to close" : "Buy to close"}</strong>
          <p>
            {view === "buyer"
              ? "Sell the contract you own at the current bid."
              : "Buy back the contract you owe at the current ask."}
          </p>
        </div>
      </div>
      <div className="developer-model">
        <div>
          <span className="eyebrow">BACKEND MENTAL MODEL</span>
          <h3>A call resembles a capability with a TTL</h3>
        </div>
        <pre>
          <code>{code}</code>
        </pre>
      </div>
      <div className="call-matrix">
        <article>
          <span>BUY TO OPEN</span>
          <strong>Start long</strong>
          <p>Pay ask. Gain a right. Maximum loss is premium.</p>
        </article>
        <article>
          <span>SELL TO CLOSE</span>
          <strong>Exit long</strong>
          <p>Receive bid. P/L = exit credit minus original cost.</p>
        </article>
        <article>
          <span>SELL TO OPEN</span>
          <strong>Start short</strong>
          <p>
            Receive bid. Accept an obligation. This app requires a covered call.
          </p>
        </article>
        <article>
          <span>BUY TO CLOSE</span>
          <strong>Exit short</strong>
          <p>Pay ask. P/L = original credit minus buyback cost.</p>
        </article>
      </div>
      <div className="lesson-caveat">
        <strong>Important:</strong> This expiration model ignores commissions,
        dividends, taxes, early assignment, and time value before expiration. If
        you sell the shares immediately at a higher price while the call is
        still open, the stock gain is real but the call becomes uncovered and
        its liability remains. OptionLab only permits covered calls backed by
        100 shares.
      </div>
    </section>
  );
}
