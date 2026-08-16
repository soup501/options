"use client";

import { useState } from "react";

type PortfolioValueChartProps = {
  cash: number;
  stocks: { symbol: string; value: number }[];
  options: { label: string; value: number; quantity: number; side: string }[];
};

const money = (value: number) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export function PortfolioValueChart({
  cash,
  stocks,
  options,
}: PortfolioValueChartProps) {
  const [hovered, setHovered] = useState<"combined" | "options" | null>(null);
  const stockTotal = stocks.reduce((sum, item) => sum + item.value, 0);
  const optionTotal = options.reduce((sum, item) => sum + item.value, 0);
  const values = [
    { label: "Stocks + cash", value: Math.max(0, cash + stockTotal), className: "portfolio-stocks" },
    { label: "Options", value: Math.max(0, optionTotal), className: "portfolio-options" },
  ];
  const total = values.reduce((sum, item) => sum + item.value, 0);
  const hoveredValue = hovered === "combined" ? values[0] : values[1];
  const hoveredPercent = total ? (hoveredValue.value / total) * 100 : 0;

  return (
    <section className="card portfolio-value-card">
      <div className="history-header">
        <div>
          <span className="eyebrow">PORTFOLIO VALUE</span>
          <h2>Where your account value sits</h2>
          <p>Current cash and marked position values, separated by asset type.</p>
        </div>
        <strong className="portfolio-total">{money(total)}</strong>
      </div>
      <div className="portfolio-value-bar" role="img" aria-label="Portfolio value by asset type">
        {values.map((item, index) => (
          <span
            key={item.label}
            className={item.className}
            style={{ width: total ? `${(item.value / total) * 100}%` : "0%" }}
            onMouseEnter={() => setHovered(index === 0 ? "combined" : "options")}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(index === 0 ? "combined" : "options")}
            onBlur={() => setHovered(null)}
            tabIndex={0}
            role="button"
            aria-label={`${item.label}: ${money(item.value)}, ${((item.value / Math.max(1, total)) * 100).toFixed(1)}% of portfolio`}
          />
        ))}
      </div>
      {hovered && (
        <div className="portfolio-value-tooltip" role="status">
          <strong>{hoveredValue.label} · {money(hoveredValue.value)} ({hoveredPercent.toFixed(1)}%)</strong>
          {hovered === "combined" ? (
            <p>Cash {money(cash)} · Stocks {money(stockTotal)}</p>
          ) : options.length ? (
            options.map((option) => (
              <p key={option.label}>{option.label} · {option.quantity} {option.side} · {money(option.value)}</p>
            ))
          ) : (
            <p>No open option positions.</p>
          )}
        </div>
      )}
      <div className="portfolio-value-legend">
        {values.map((item) => (
          <div key={item.label}>
            <span className={`portfolio-dot ${item.className}`} />
            <span>{item.label}</span>
            <strong>{money(item.value)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
