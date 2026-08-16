"use client";

import { useState } from "react";

type PayoffChartProps = {
  kind: "Calls" | "Puts";
  position: "long" | "short";
  strike: number;
  premium: number;
  currentPrice: number;
  minPrice: number;
  maxPrice: number;
  money: (value: number) => string;
};

export function PayoffChart({
  kind,
  position,
  strike,
  premium,
  currentPrice,
  minPrice,
  maxPrice,
  money,
}: PayoffChartProps) {
  const [hover, setHover] = useState<{
    price: number;
    pnl: number;
    x: number;
    y: number;
  } | null>(null);
  const width = 800;
  const height = 330;
  const pad = { left: 74, right: 24, top: 30, bottom: 56 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const pnlAt = (price: number) => {
    const intrinsic =
      kind === "Calls"
        ? Math.max(0, price - strike)
        : Math.max(0, strike - price);
    return (
      (position === "long" ? intrinsic - premium : premium - intrinsic) * 100
    );
  };
  const breakEven = kind === "Calls" ? strike + premium : strike - premium;
  const points = Array.from({ length: 81 }, (_, index) => {
    const price = minPrice + ((maxPrice - minPrice) * index) / 80;
    return { price, pnl: pnlAt(price) };
  });
  const pnlValues = points.map((point) => point.pnl);
  const pnlMin = Math.min(...pnlValues, 0);
  const pnlMax = Math.max(...pnlValues, 0);
  const pnlRange = Math.max(1, pnlMax - pnlMin);
  const x = (price: number) =>
    pad.left + ((price - minPrice) / (maxPrice - minPrice)) * plotWidth;
  const y = (pnl: number) => pad.top + ((pnlMax - pnl) / pnlRange) * plotHeight;
  const linePath = points
    .map(
      (point, index) =>
        `${index ? "L" : "M"}${x(point.price).toFixed(1)},${y(point.pnl).toFixed(1)}`,
    )
    .join(" ");
  const areaPath = `${linePath} L${x(maxPrice).toFixed(1)},${y(0).toFixed(1)} L${x(minPrice).toFixed(1)},${y(0).toFixed(1)} Z`;
  const zeroY = y(0);
  const currentX = x(currentPrice);
  const strikeX = x(strike);
  const breakEvenX = x(Math.min(maxPrice, Math.max(minPrice, breakEven)));
  const redEnd = kind === "Calls" ? breakEvenX : x(minPrice);
  const greenStart = kind === "Calls" ? breakEvenX : x(breakEven);
  const band = Math.max(5, plotWidth / 90);
  const updateHover = (clientX: number, element: SVGSVGElement) => {
    const box = element.getBoundingClientRect();
    const plotLeft = box.left + (pad.left / width) * box.width;
    const plotWidthOnScreen = (plotWidth / width) * box.width;
    const ratio = Math.min(
      1,
      Math.max(0, (clientX - plotLeft) / plotWidthOnScreen),
    );
    const price = minPrice + ratio * (maxPrice - minPrice);
    const pnl = pnlAt(price);
    setHover({ price, pnl, x: pad.left + ratio * plotWidth, y: y(pnl) });
  };
  return (
    <div className="payoff-visual">
      <svg
        className="payoff-svg"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${kind} expiration payoff chart`}
        onPointerMove={(event) =>
          updateHover(event.clientX, event.currentTarget)
        }
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <clipPath id="payoff-red">
            <rect
              x={pad.left}
              y={pad.top}
              width={Math.max(0, redEnd - pad.left)}
              height={plotHeight}
            />
          </clipPath>
          <clipPath id="payoff-green">
            <rect
              x={greenStart}
              y={pad.top}
              width={Math.max(0, width - pad.right - greenStart)}
              height={plotHeight}
            />
          </clipPath>
        </defs>
        <rect
          x={pad.left}
          y={pad.top}
          width={plotWidth}
          height={plotHeight}
          className="payoff-break-fill"
        />
        <path
          d={areaPath}
          className="payoff-area payoff-loss-area"
          clipPath="url(#payoff-red)"
        />
        <path
          d={areaPath}
          className="payoff-area payoff-profit-area"
          clipPath="url(#payoff-green)"
        />
        <line
          x1={pad.left}
          x2={width - pad.right}
          y1={zeroY}
          y2={zeroY}
          className="payoff-zero"
        />
        <line
          x1={currentX}
          x2={currentX}
          y1={pad.top}
          y2={height - pad.bottom}
          className="payoff-current"
        />
        <line
          x1={strikeX}
          x2={strikeX}
          y1={pad.top}
          y2={height - pad.bottom}
          className="payoff-strike"
        />
        <path d={linePath} className="payoff-path" />
        <rect
          x={breakEvenX - band}
          y={pad.top}
          width={band * 2}
          height={plotHeight}
          className="payoff-break-band"
        />
        <text x={pad.left} y={pad.top - 10} className="payoff-axis-label">
          Profit ($)
        </text>
        <text
          x={currentX}
          y={pad.top - 10}
          textAnchor="middle"
          className="payoff-current-label"
        >
          Current {money(currentPrice)}
        </text>
        <text
          x={strikeX}
          y={pad.top + 27}
          textAnchor="middle"
          className="payoff-axis-label"
        >
          Strike {money(strike)}
        </text>
        <text
          x={breakEvenX}
          y={pad.top + 13}
          textAnchor="middle"
          className="payoff-break-label"
        >
          Break-even {money(breakEven)}
        </text>
        <text x={pad.left} y={height - 12} className="payoff-axis-label">
          Stock price
        </text>
        <text
          x={pad.left}
          y={height - pad.bottom + 20}
          textAnchor="middle"
          className="payoff-axis-value"
        >
          {money(minPrice)}
        </text>
        <text
          x={width / 2}
          y={height - pad.bottom + 20}
          textAnchor="middle"
          className="payoff-axis-value"
        >
          {money((minPrice + maxPrice) / 2)}
        </text>
        <text
          x={width - pad.right}
          y={height - pad.bottom + 20}
          textAnchor="end"
          className="payoff-axis-value"
        >
          {money(maxPrice)}
        </text>
        <text
          x={pad.left - 8}
          y={y(pnlMax) + 4}
          textAnchor="end"
          className="payoff-axis-value"
        >
          +{money(pnlMax)}
        </text>
        <text
          x={pad.left - 8}
          y={zeroY + 4}
          textAnchor="end"
          className="payoff-axis-value"
        >
          $0
        </text>
        <text
          x={pad.left - 8}
          y={y(pnlMin) + 4}
          textAnchor="end"
          className="payoff-axis-value"
        >
          −{money(Math.abs(pnlMin))}
        </text>
        {hover && (
          <g
            className={
              hover.pnl >= 0
                ? "payoff-tooltip profit-tooltip"
                : "payoff-tooltip loss-tooltip"
            }
          >
            <line
              x1={hover.x}
              x2={hover.x}
              y1={pad.top}
              y2={height - pad.bottom}
            />
            <circle cx={hover.x} cy={hover.y} r="5" />
            <rect
              x={Math.min(width - 150, Math.max(pad.left, hover.x + 10))}
              y={Math.max(8, hover.y - 42)}
              width="140"
              height="40"
              rx="4"
            />
            <text
              x={Math.min(width - 140, Math.max(pad.left + 10, hover.x + 20))}
              y={Math.max(25, hover.y - 23)}
            >
              Stock price {money(hover.price)}
            </text>
            <text
              x={Math.min(width - 140, Math.max(pad.left + 10, hover.x + 20))}
              y={Math.max(41, hover.y - 7)}
            >
              {hover.pnl >= 0 ? "Profit" : "Loss"} {hover.pnl >= 0 ? "+" : "−"}
              {money(Math.abs(hover.pnl))}
            </text>
          </g>
        )}
      </svg>
      <div className="payoff-legend">
        <span>
          <i className="legend-current" /> Current stock price
        </span>
        <span>
          <i className="legend-strike" /> Strike price
        </span>
        <span>
          <i className="legend-profit" /> Profit
        </span>
        <span>
          <i className="legend-loss" /> Loss
        </span>
        <span>
          <i className="legend-break" /> Break-even
        </span>
      </div>
    </div>
  );
}
