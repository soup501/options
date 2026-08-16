"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import { signOut, useSession } from "next-auth/react";

const nav = [
  ["/", "Overview"],
  ["/stocks", "Stocks"],
  ["/options", "Options"],
  ["/positions", "Positions"],
  ["/learn", "Learn"],
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-frame">
      <aside className={menuOpen ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <span className="brand-mark">O</span>
          <span>
            option<span className="brand-accent">lab</span>
          </span>
        </div>
        <div className="workspace-label">
          PAPER ACCOUNT <span className="live-dot" /> LIVE DATA
        </div>
        <nav className="nav-list" aria-label="Primary navigation">
          {nav.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={pathname === href ? "nav-item active" : "nav-item"}
            >
              <span className="nav-icon">
                {label === "Overview"
                  ? "⌂"
                  : label === "Stocks"
                    ? "◒"
                    : label === "Options"
                      ? "◇"
                      : "?"}
              </span>
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link
            href="/settings"
            className={
              pathname === "/settings" ? "nav-item active" : "nav-item"
            }
          >
            <span className="nav-icon">⚙</span>Settings
          </Link>
          <div className="disclosure">
            <strong>Learning account</strong>
            <br />
            This is a paper-trading simulator. No real orders are placed.
          </div>
          <button
            className="profile"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <span className="avatar">
              {session?.user?.name?.slice(0, 2).toUpperCase() ?? "U"}
            </span>
            <span>
              <strong>{session?.user?.name ?? "Account"}</strong>
              <small>{session?.user?.email ?? "Google account"}</small>
            </span>
            <span className="more">↪</span>
          </button>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <button
            className="menu-button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation"
          >
            ☰
          </button>
          <div className="breadcrumbs">
            Workspace <span>/</span>{" "}
            {pathname === "/" ? "Overview" : pathname.slice(1)}
          </div>
          <div className="top-actions">
            <span className="status-pill">
              <i /> Market open
            </span>
            <button className="icon-button" aria-label="Notifications">
              ♧
            </button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

export function Metric({
  label,
  value,
  change,
  positive = true,
}: {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
}) {
  return (
    <div className="metric">
      <span className="eyebrow">{label}</span>
      <strong>{value}</strong>
      {change && (
        <span className={positive ? "change positive" : "change negative"}>
          {positive ? "↗" : "↘"} {change}
        </span>
      )}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-header">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      {action}
    </div>
  );
}

export function Sparkline({
  color = "#d5a84b",
  values,
}: {
  color?: string;
  values?: number[];
}) {
  const [hover, setHover] = useState<{
    x: number;
    label: string;
    value: string;
  } | null>(null);
  const updateHover = (clientX: number, element: SVGSVGElement) => {
    const box = element.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
    const series = values?.length ? values : [10000, 10400, 10779.48];
    const value =
      series[
        Math.min(series.length - 1, Math.round(ratio * (series.length - 1)))
      ];
    setHover({
      x: ratio * 100,
      label:
        ratio < 0.5
          ? "Jul 11, 2026"
          : ratio < 0.8
            ? "Jul 25, 2026"
            : "Aug 8, 2026",
      value: `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    });
  };
  const series = values?.length ? values : null;
  const chartPath = series
    ? (() => {
        const min = Math.min(...series);
        const max = Math.max(...series);
        const range = max - min || 1;
        return series
          .map((value, index) => {
            const x = (index / Math.max(1, series.length - 1)) * 280;
            const y = 68 - ((value - min) / range) * 56;
            return `${index === 0 ? "M" : "L"}${x} ${y}`;
          })
          .join(" ");
      })()
    : "M0 64 C20 60 28 63 42 55 S65 60 78 47 S100 52 115 43 S135 50 148 32 S167 40 179 34 S198 41 208 26 S231 33 245 19 S265 26 280 8";
  const areaPath = `${chartPath} L280 80 L0 80Z`;
  return (
    <div className="sparkline-wrap">
      <svg
        className="sparkline"
        viewBox="0 0 280 80"
        role="img"
        aria-label="Interactive portfolio performance chart"
        onPointerMove={(event) =>
          updateHover(event.clientX, event.currentTarget)
        }
        onPointerLeave={() => setHover(null)}
      >
        <path d={chartPath} fill="none" stroke={color} strokeWidth="3" />
        <path d={areaPath} fill={color} opacity=".1" />
      </svg>
      {hover && (
        <div className="sparkline-hover" style={{ left: `${hover.x}%` }}>
          <strong>{hover.value}</strong>
          <span>{hover.label}</span>
        </div>
      )}
    </div>
  );
}

export function EducationNote({ children }: { children: ReactNode }) {
  return (
    <div className="education-note">
      <span className="note-icon">i</span>
      <p>{children}</p>
    </div>
  );
}
