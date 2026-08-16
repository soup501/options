"use client";

import { useEffect, useState } from "react";

type Point = { date: string; close: number };
const money = (value: number) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function HistoryChart({
  symbol,
  currentPrice,
}: {
  symbol: string;
  currentPrice: number | null;
}) {
  const [range, setRange] = useState<"1d" | "1w" | "1m" | "3m">("1m");
  const [points, setPoints] = useState<Point[]>([]);
  const [hover, setHover] = useState<{
    point: Point;
    x: number;
    y: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const loadingTimer = window.setTimeout(() => setLoading(true), 0);
    fetch(`/api/history?symbol=${symbol}&range=${range}`)
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setPoints(data.points ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(loadingTimer);
    };
  }, [symbol, range]);
  const width = 800;
  const height = 245;
  const pad = { left: 60, right: 20, top: 20, bottom: 40 };
  const values = points.map((point) => point.close);
  const min = Math.min(...values, currentPrice ?? Infinity);
  const max = Math.max(...values, currentPrice ?? -Infinity);
  const spread = Math.max(1, max - min);
  const low = min - spread * 0.08;
  const high = max + spread * 0.08;
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const pointX = (index: number) =>
    pad.left + (index / Math.max(1, points.length - 1)) * plotWidth;
  const pointY = (value: number) =>
    pad.top + ((high - value) / (high - low)) * plotHeight;
  const path = points
    .map(
      (point, index) =>
        `${index ? "L" : "M"}${pointX(index).toFixed(1)},${pointY(point.close).toFixed(1)}`,
    )
    .join(" ");
  const area = points.length
    ? `${path} L${pointX(points.length - 1)},${height - pad.bottom} L${pointX(0)},${height - pad.bottom} Z`
    : "";
  const tickIndexes = [0, 0.25, 0.5, 0.75, 1].map((ratio) =>
    Math.min(
      points.length - 1,
      Math.round(ratio * Math.max(0, points.length - 1)),
    ),
  );
  const firstClose = values[0] ?? 0;
  const lastClose = values.at(-1) ?? 0;
  const netChange = lastClose - firstClose;
  const netChangePercent = firstClose ? (netChange / firstClose) * 100 : 0;
  const updateHover = (clientX: number, element: SVGSVGElement) => {
    if (!points.length) return;
    const box = element.getBoundingClientRect();
    const ratio = Math.min(
      1,
      Math.max(
        0,
        (clientX - box.left - (pad.left / width) * box.width) /
          ((plotWidth / width) * box.width),
      ),
    );
    const index = Math.round(ratio * (points.length - 1));
    setHover({
      point: points[index],
      x: pointX(index),
      y: pointY(points[index].close),
    });
  };
  return (
    <section className="card history-card">
      <div className="history-header">
        <div>
          <span className="eyebrow">PRICE HISTORY</span>
          <h2>{symbol} trend</h2>
          <p>Historical closing prices from Yahoo Finance</p>
        </div>
        <div className="history-summary">
          <span>
            High <strong>{money(max)}</strong>
          </span>
          <span>
            Low <strong>{money(min)}</strong>
          </span>
          <span className={netChange >= 0 ? "positive" : "negative"}>
            {netChange >= 0 ? "Gain" : "Loss"}{" "}
            <strong>
              {netChange >= 0 ? "+" : "−"}
              {money(Math.abs(netChange))} ({netChange >= 0 ? "+" : "−"}
              {Math.abs(netChangePercent).toFixed(2)}%)
            </strong>
          </span>
        </div>
        <div className="history-ranges">
          {(["1d", "1w", "1m", "3m"] as const).map((item) => (
            <button
              key={item}
              className={range === item ? "active" : ""}
              onClick={() => setRange(item)}
            >
              {item === "1d"
                ? "1 day"
                : item === "1w"
                  ? "1 week"
                  : item === "1m"
                    ? "1 month"
                    : "3 months"}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="history-empty">Loading historical prices...</div>
      ) : points.length ? (
        <div className="history-visual">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={`${symbol} historical price chart`}
            onPointerMove={(event) =>
              updateHover(event.clientX, event.currentTarget)
            }
            onPointerLeave={() => setHover(null)}
          >
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={pointY((high + low) / 2)}
              y2={pointY((high + low) / 2)}
              className="history-gridline"
            />
            <path
              d={area}
              className={
                netChange >= 0
                  ? "history-area history-profit"
                  : "history-area history-loss"
              }
            />
            <path
              d={path}
              className={
                netChange >= 0
                  ? "history-line history-profit"
                  : "history-line history-loss"
              }
            />
            <text
              x={pad.left - 8}
              y={pointY(high) + 4}
              textAnchor="end"
              className="history-axis"
            >
              {money(high)}
            </text>
            <text
              x={pad.left - 8}
              y={pointY((high + low) / 2) + 4}
              textAnchor="end"
              className="history-axis"
            >
              {money((high + low) / 2)}
            </text>
            <text
              x={pad.left - 8}
              y={pointY(low) + 4}
              textAnchor="end"
              className="history-axis"
            >
              {money(low)}
            </text>
            {tickIndexes.map((index, tick) => (
              <text
                key={`${points[index]?.date}-${tick}`}
                x={pointX(index)}
                y={height - 12}
                textAnchor={
                  tick === 0
                    ? "start"
                    : tick === tickIndexes.length - 1
                      ? "end"
                      : "middle"
                }
                className="history-axis"
              >
                {new Date(points[index].date).toLocaleDateString([], {
                  month: range === "1d" ? undefined : "short",
                  day: "numeric",
                })}
              </text>
            ))}
            {hover && (
              <g className="history-tooltip">
                <line
                  x1={hover.x}
                  x2={hover.x}
                  y1={pad.top}
                  y2={height - pad.bottom}
                />
                <circle cx={hover.x} cy={hover.y} r="5" />
                <rect
                  x={Math.min(width - 145, Math.max(pad.left, hover.x + 10))}
                  y={Math.max(8, hover.y - 39)}
                  width="135"
                  height="36"
                  rx="4"
                />
                <text
                  x={Math.min(
                    width - 135,
                    Math.max(pad.left + 10, hover.x + 20),
                  )}
                  y={Math.max(23, hover.y - 20)}
                >
                  Stock price {money(hover.point.close)}
                </text>
                <text
                  x={Math.min(
                    width - 135,
                    Math.max(pad.left + 10, hover.x + 20),
                  )}
                  y={Math.max(38, hover.y - 5)}
                >
                  {new Date(hover.point.date).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </text>
              </g>
            )}
          </svg>
        </div>
      ) : (
        <div className="history-empty">
          Historical prices are unavailable for this symbol.
        </div>
      )}
    </section>
  );
}
