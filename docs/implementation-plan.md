# Implementation Plan: Options Onboarding Simulator

## 1. Goal

Build a single-user, local-first learning application for paper trading U.S. stocks and standard equity options with an initial $10,000 cash balance. The application will use real market data, persist the simulated account in PostgreSQL on the user's Raspberry Pi, explain each trade's mechanics and risks, and track positions, cash, realized and unrealized profit/loss, account equity, and buying power.

The first release supports:

- Buying and selling stocks.
- Buying calls and puts.
- Selling covered calls and cash-secured puts.
- Closing long and short option positions.
- Exercising long options and settling expiration/assignment.
- Depositing and withdrawing simulated cash.
- Educational payoff, portfolio, and account-performance charts.
- A learning center and contextual explanations linked to mainstream sources.

This is a simulator only. It must never connect to a brokerage or place a real order.

## 2. Confirmed Decisions

| Area | Decision |
| --- | --- |
| Users | Google-authenticated users with one paper account per user |
| Database | Existing PostgreSQL server at `10.0.0.100:5432` |
| Starting balance | $20,000, credited once when a user first signs in |
| Option positions | Buy call, sell call, buy put, sell put |
| Short-option safety | Covered calls and cash-secured puts only |
| Account type | Cash account; no margin or borrowing |
| Fills | Immediate simulated fills from the displayed quote |
| Market data | `yahoo-finance2` as the primary provider |
| Deployment | Local Next.js process connecting over the LAN to the Raspberry Pi |

## 3. MVP Boundaries

### In Scope

- U.S. common stocks, ETFs, and standard physically settled equity/ETF options.
- Standard 100-share option contracts only.
- Long stock positions only; no short stock.
- Single-leg options only.
- Buy to open, sell to close, sell to open, and buy to close.
- Covered short calls backed by reserved shares.
- Cash-secured short puts backed by reserved cash.
- FIFO cost basis for stocks and option lots.
- Manual cash adjustments with a complete audit trail.
- Quote timestamps, stale-data indicators, and graceful provider failures.
- Responsive desktop and mobile views.

### Out of Scope

- Real brokerage connectivity or real-money trading.
- Margin, naked options, short stock, or borrowing.
- Multi-leg spreads and strategy-order grouping.
- Index options, cash-settled contracts, futures options, mini options, and adjusted/non-standard contracts.
- Limit, stop, partial, queued, or after-hours order simulation.
- Commissions, regulatory fees, taxes, dividends, and corporate actions in the MVP.
- Early assignment simulation. Short options are assigned only during expiration settlement in the MVP.
- Production hosting or access outside the trusted local network.
- Black-Scholes pricing as a source of executable prices. Market quotes, not theoretical prices, drive fills and mark-to-market values.

## 4. Source-Driven Stack

Versions below are the verified current stable baselines as of August 8, 2026. Implementation should pin exact dependency versions in the lockfile and re-check current stable releases before scaffolding.

| Layer | Selection | Rationale |
| --- | --- | --- |
| Runtime | Node.js 24 LTS | Current LTS; supported by `yahoo-finance2` v4 and Next.js |
| Application | Next.js 16.3 App Router | Current stable full-stack React framework with TypeScript, Server Components, and server-side mutations |
| UI | React 19.2, TypeScript, Tailwind CSS | Current Next.js defaults and a suitable typed, responsive UI stack |
| Validation | Zod 4 | Runtime validation for forms, environment variables, and provider boundaries |
| Database | Existing PostgreSQL, preferably a supported version | Preserve the user's Raspberry Pi installation; confirm its actual version before migrations |
| ORM | Prisma ORM 7 GA with `@prisma/adapter-pg` | Type-safe PostgreSQL access and migrations; avoid the early-access Prisma Next product |
| Market data | `yahoo-finance2` 4.x | Server-side TypeScript client with quotes, chart history, and options chains; no API key required |
| Charts | Recharts 3.x | Active MIT React/SVG library suitable for payoff, equity, allocation, and P/L charts |
| Unit/integration tests | Vitest and React Testing Library | Next.js-documented unit test path |
| End-to-end tests | Playwright | Next.js-documented browser testing path |

Do not add a separate Python service or QuantLib for the MVP. QuantLib is a mature open-source quantitative-finance framework, but its C++/binding footprint is unnecessary when executable prices and IV come from the provider and payoff calculations are simple, deterministic domain functions. Revisit a pricing engine only when adding scenario Greeks or theoretical valuation that the data source cannot provide.

## 5. Market Data Decision

### Selected Provider

Use `yahoo-finance2` v4 through server-only code:

- `search()` for symbol lookup.
- `quote()` for stock quotes.
- `chart()` for historical stock prices used by charts.
- `options()` for expiration dates and chains containing strike, bid, ask, last price, IV, volume, open interest, and contract metadata.
- Instantiate `YahooFinance` on the server; never import it into a Client Component or expose upstream responses directly to the browser.
- Keep runtime validation enabled and map Yahoo responses into application-owned types.
- Wrap every request in error handling and apply a timeout, conservative concurrency, and short-lived cache.

No Yahoo account or API key is needed. There are therefore no account-creation steps for the selected MVP provider.

### Accepted Risk

`yahoo-finance2` is MIT-licensed, but that license covers the client library, not Yahoo's underlying data. The project explicitly identifies itself as an unofficial, unendorsed API and says availability and response consistency are not guaranteed. Yahoo's current Terms of Service section 2.4.9 prohibits automated data collection without prior permission.

The user has explicitly selected Yahoo as the primary source after this conflict was surfaced. Keep the application private, single-user, and local; show attribution and quote timestamps; do not redistribute or commercialize the data; and retain a narrow `MarketDataProvider` interface so an authorized provider can replace Yahoo without changing trading logic. This plan does not claim that private use resolves the Terms conflict.

### Provider Boundary

Define application-owned results instead of allowing provider types into the domain:

- `StockQuote`: symbol, bid, ask, last, previous close, currency, market time, fetched time.
- `PriceBar`: timestamp, open, high, low, close, volume.
- `OptionContractQuote`: OCC symbol, underlying, call/put, expiration, strike, multiplier, bid, ask, last, IV, volume, open interest, market time, fetched time.
- `MarketDataStatus`: fresh, stale, unavailable, partial.

Cache responses by request key with a visible `fetchedAt` value. Do not silently use stale data for a trade. The trade preview must name the exact price and timestamp that will be persisted with the fill.

## 6. Architecture

Use one Next.js application rather than separate frontend and API services:

```text
Browser
  -> Next.js App Router pages and Client Components
  -> Server Actions / Route Handlers
       -> Zod input validation
       -> market-data adapter (network read before transaction)
       -> trading domain service
       -> short, serializable Prisma transaction
            -> PostgreSQL at 10.0.0.100:5432
```

Key boundaries:

- `app/`: pages, layouts, loading/error states, and thin mutation entry points.
- `components/`: reusable UI and chart components.
- `lib/market-data/`: provider interface, Yahoo adapter, mapping, cache, and errors.
- `lib/trading/`: fill selection, collateral checks, FIFO lots, exercise, expiry, and P/L calculations.
- `lib/db/`: singleton Prisma client and focused repositories/queries.
- `prisma/`: schema, migrations, and idempotent seed.
- `tests/`: domain, database integration, and Playwright flows.

Business rules must live in server-side domain functions, not React components or database callbacks. Fetch market data before opening a database transaction; never hold a transaction open during a network call.

## 7. Data Model

Use PostgreSQL `numeric`/Prisma `Decimal` for money and prices. Never use JavaScript floating-point arithmetic for persisted cash, cost basis, collateral, or P/L. Store timestamps in UTC and render market times explicitly in U.S. Eastern time where relevant.

### Core Records

| Record | Purpose |
| --- | --- |
| `Account` | Singleton account, current cash, reserved cash, base currency, and settings |
| `CashLedgerEntry` | Immutable deposit, withdrawal, premium, stock trade, exercise, assignment, and adjustment audit trail |
| `Order` | User intent, instrument, action, quantity, idempotency key, status, and rejection reason |
| `Execution` | Immutable fill price, multiplier, quote source, quote timestamp, and execution timestamp |
| `StockLot` | Remaining FIFO stock quantity and per-share basis |
| `OptionContract` | OCC symbol, underlying, type, strike, expiry, multiplier, and settlement style |
| `OptionLot` | Signed remaining contracts, opening premium, side, and lifecycle status |
| `LotDisposition` | Links closed/exercised/assigned quantities to source lots for realized P/L |
| `CollateralReservation` | Shares reserved for covered calls or cash reserved for short puts |
| `MarketSnapshot` | Normalized quote used for an execution or end-of-day valuation |
| `PortfolioSnapshot` | Cash, holdings value, option value, equity, cumulative deposits, and P/L over time |

Enforce unique idempotency keys on mutation requests. Use database constraints for non-negative quantities and valid contract multipliers where Prisma supports them; otherwise include migration-level SQL checks.

### Accounting Invariants

- Available cash = cash balance minus active cash reservations.
- Available shares = owned shares minus active share reservations.
- Cash cannot become negative.
- Reserved cash and shares cannot become negative or exceed holdings.
- Every completed order has one execution and balanced ledger/lot effects.
- Option quantities are whole contracts; stock quantities are whole shares in the MVP.
- An account withdrawal cannot consume cash reserved by a short put.
- Selling stock cannot consume shares reserved by a covered call.
- Closing a short option releases proportional collateral atomically.
- Replaying the same idempotency key cannot create a second fill.

## 8. Trading and Valuation Rules

### Fill Policy

For a basic immediate-fill simulation:

- A buy uses the current ask.
- A sell uses the current bid.
- If the required side is unavailable or non-positive, disable trading for that quote rather than silently substituting a stale or favorable price.
- Persist the displayed bid, ask, selected fill, market timestamp, fetch timestamp, and provider name.
- Do not claim that the simulated fill was achievable in the real market.

### Stock Orders

- Buy only when available cash covers `shares * ask`.
- Sell only owned, unreserved shares.
- Create/consume FIFO lots and update cash, order, execution, and ledger atomically.

### Option Orders

- Long call/put, buy to open: debit `ask * multiplier * contracts`.
- Long call/put, sell to close: consume matching long FIFO lots and credit `bid * multiplier * contracts`.
- Short call, sell to open: require and reserve `multiplier * contracts` shares, then credit premium.
- Short call, buy to close: consume matching short FIFO lots, debit premium, and release reserved shares.
- Short put, sell to open: reserve `strike * multiplier * contracts` cash, then credit premium.
- Short put, buy to close: consume matching short FIFO lots, debit premium, and release reserved cash.
- Reject naked calls, unsecured puts, non-standard multipliers, expired contracts, malformed OCC symbols, and orders larger than the matching position when closing.

The UI must ask for an explicit position effect (`open` or `close`) so “sell call” cannot ambiguously mean sell-to-close or sell-to-open.

### Exercise, Assignment, and Expiration

- Only a long option is exercised; a short option is assigned.
- Long call exercise requires cash for `strike * multiplier * contracts`, creates stock lots at the strike plus allocated option basis, and closes the option lots.
- Long put exercise requires unreserved shares, sells those shares at the strike, and closes the option lots.
- Out-of-the-money options expire worthless.
- In-the-money short calls are assigned at expiration, delivering reserved shares at the strike.
- In-the-money short puts are assigned at expiration, purchasing shares at the strike using reserved cash.
- In-the-money long options are auto-exercised at expiration only when the account has the required cash or shares. Otherwise mark them expired with an explicit `insufficient_exercise_resources` outcome and educational warning.
- Do not simulate random early assignment in the MVP. Clearly label this simplification because real American-style equity options may be assigned before expiration.
- Run expiration settlement idempotently on application startup/page load and expose a manual “process expirations” action. Do not require a separate scheduler for the local MVP.

### P/L Definitions

- Stock mark: latest quote midpoint when both sides exist, otherwise last price.
- Option mark: midpoint when both bid and ask are valid, otherwise last price, visibly marked as a fallback.
- Long market value is positive; short option market value is a liability.
- Realized P/L uses FIFO dispositions and includes received/paid premiums.
- Unrealized P/L compares current marked value with remaining lot basis.
- Total account equity = cash + stock market value + signed option market value.
- Investment P/L = current equity minus net external cash contributions.
- Persist daily/on-demand portfolio snapshots so cash deposits are not mistaken for trading profit.

## 9. Product and UX Plan

### Dashboard (`/`)

Prioritize decisions rather than giving every metric equal weight:

- Account equity, available cash, reserved cash, total P/L, day change, and data freshness.
- Equity-versus-net-contributions chart.
- Open positions table with quantity, basis, mark, market value, realized/unrealized P/L, and option DTE.
- Expiration/collateral alerts before secondary analytics.
- Recent activity and clear empty, stale, partial, offline, loading, and error states.

### Stocks (`/stocks`)

- Symbol search and quote summary.
- Historical price chart with selectable range.
- Buy/sell ticket with estimated debit/credit, available resources, quote timestamp, and confirmation.
- Stock position and lot history for the selected symbol.

### Options (`/options`)

- Symbol, expiration, call/put, and strike filters preserved in the URL.
- Dense option-chain table with strike, bid, ask, last, IV, volume, open interest, moneyness, and freshness.
- Trade ticket with explicit open/close effect and collateral preview.
- Interactive expiration payoff chart showing max gain/loss, break-even, premium, and selected underlying-price scenarios.
- Position detail with close, exercise, and lifecycle actions appropriate to the position side.

### Learn (`/learn`)

- FAQ for calls, puts, premium, strike, expiration, intrinsic/time value, IV, the Greeks, opening/closing, exercise, assignment, covered calls, cash-secured puts, and P/L.
- Context cards next to trade controls that explain what changes in cash, collateral, maximum loss, and assignment obligations before confirmation.
- Links to FINRA, Investor.gov/SEC, OCC's Options Disclosure Document, and the Options Industry Council.
- Persistent “educational simulator, not investment advice” disclosure.

### Settings (`/settings`)

- Deposit and withdraw simulated cash with reason and confirmation.
- Show starting balance, net contributions, and immutable adjustment history.
- Prevent withdrawals below available unreserved cash.
- Provider diagnostics and database connectivity status without exposing secrets.

### Accessibility and Responsive Behavior

- Do not communicate gains/losses by color alone; include signs, labels, and icons/text.
- Give every chart a title, units, textual summary, accessible table or equivalent values, and keyboard-accessible tooltips where feasible.
- Keep all trade controls keyboard operable with visible focus and associated error text.
- On mobile, collapse secondary analytics and convert wide chains to a focused strike inspector instead of shrinking an unreadable table.

## 10. Raspberry Pi PostgreSQL Preparation

Before application migrations:

1. Confirm the installed PostgreSQL version is still supported; do not upgrade the Pi merely because PostgreSQL 18 is current.
2. Create a dedicated database and least-privilege application role. Do not use the PostgreSQL superuser from the app.
3. Bind PostgreSQL only to the trusted LAN interface and allow only the development machine's IP in `pg_hba.conf`; do not expose port 5432 to the internet.
4. Require password authentication, configure the Pi firewall, and verify connectivity with `psql` from the app host.
5. Back up the database before applying later migrations and document restore verification.
6. Put the full connection string in uncommitted `.env.local` as `DATABASE_URL`; commit only `.env.example` with placeholders.
7. Confirm the Pi has reliable storage, free space, correct UTC time, and a backup destination.

The host and port are known, but the database name, role, password, installed PostgreSQL version, and client IP are implementation-time inputs. Never write credentials into source control or this document.

## 11. Implementation Tasks

Each task is intended to leave the application in a runnable, testable state. Exact file names may adjust after `create-next-app` establishes the current conventions.

### Phase 1: Foundation

#### Task 1: Scaffold and quality gates

**Description:** Create the Next.js TypeScript App Router project on Node 24 LTS with Tailwind, ESLint, strict TypeScript, Vitest, and Playwright. Add validated server-only environment configuration and base responsive navigation.

**Acceptance criteria:**

- [ ] App starts locally and renders Dashboard, Stocks, Options, Learn, and Settings routes.
- [ ] Missing or malformed server environment variables fail with actionable messages.
- [ ] `DATABASE_URL` and provider internals are never included in client bundles.

**Verification:** `npm run lint`, `npm run typecheck`, `npm test -- --run`, `npm run build`.

**Dependencies:** None.

**Estimated scope:** Medium.

#### Task 2: Establish the PostgreSQL schema and seed

**Description:** Verify the Pi connection, add Prisma ORM 7 with the PostgreSQL driver adapter, implement the core records and constraints, create the initial migration, and seed the singleton account exactly once with $10,000.

**Acceptance criteria:**

- [ ] Migration applies to a dedicated empty database without destructive reset.
- [ ] Re-running the seed does not duplicate or reset an existing account.
- [ ] Decimal fields, relations, indexes, idempotency uniqueness, and core accounting constraints are verified.

**Verification:** Prisma validation/generation, migration against a disposable PostgreSQL database, seed twice, and focused database integration tests.

**Dependencies:** Task 1 and Raspberry Pi preparation.

**Estimated scope:** Medium.

#### Task 3: Add the normalized Yahoo market-data adapter

**Description:** Install `yahoo-finance2` v4, implement server-only search, quote, chart, and options-chain calls, normalize them to internal types, and add timeout, caching, validation, stale-state, and error behavior.

**Acceptance criteria:**

- [ ] Adapter returns normalized stock, history, and standard option-chain data for representative symbols.
- [ ] Missing bid/ask, malformed results, unknown symbols, provider failures, mini/non-standard contracts, and stale timestamps are explicit states.
- [ ] UI code depends on the provider interface, not Yahoo response types.

**Verification:** Unit tests with stored normalized fixtures plus one opt-in live smoke test that is excluded from deterministic CI.

**Dependencies:** Task 1.

**Estimated scope:** Medium.

### Checkpoint: Foundation

- [ ] All quality gates pass.
- [ ] A disposable database can migrate and seed from zero.
- [ ] Pi connectivity works without exposing credentials.
- [ ] Real quotes and option chains render with source/freshness labels.
- [ ] Review the Yahoo Terms risk before proceeding if app scope is no longer private and local.

### Phase 2: Vertical Trading Slices

#### Task 4: Implement cash adjustments and accounting read model

**Description:** Add deposit/withdraw transactions, immutable ledger history, account totals, and settings UI before securities trading introduces more ledger event types.

**Acceptance criteria:**

- [ ] Deposits and valid withdrawals update cash and ledger atomically.
- [ ] Withdrawals cannot consume reserved or unavailable cash.
- [ ] Starting balance, net contributions, available cash, and adjustment history reconcile exactly.

**Verification:** Domain and database transaction tests; Playwright deposit/withdraw flow.

**Dependencies:** Task 2.

**Estimated scope:** Medium.

#### Task 5: Deliver stock buy/sell end to end

**Description:** Build the stock quote/history view and immediate order flow with preview, confirmation, ask/bid fill policy, FIFO stock lots, ledger entries, and idempotent transactions.

**Acceptance criteria:**

- [ ] Valid buys and sells produce one order, execution, ledger effect, and correct lot state.
- [ ] Insufficient cash, insufficient/unavailable shares, duplicate submission, stale/invalid quote, and invalid quantity are rejected without partial writes.
- [ ] Selected stock shows quote freshness, chart history, holdings, cost basis, and realized/unrealized P/L.

**Verification:** Fill/FIFO/invariant unit tests, PostgreSQL transaction tests, and Playwright buy/sell flow with mocked provider data.

**Dependencies:** Tasks 3 and 4.

**Estimated scope:** Medium.

#### Task 6: Deliver long call/put trading end to end

**Description:** Add URL-driven option-chain exploration, long buy-to-open/sell-to-close flows, option FIFO lots, and payoff education.

**Acceptance criteria:**

- [ ] User can filter chains, open a long call or put, and partially or fully close it.
- [ ] Premium uses the contract multiplier and all writes are atomic/idempotent.
- [ ] Trade preview and payoff chart correctly show debit, break-even, maximum loss, and expiration outcomes for calls and puts.

**Verification:** Payoff and lot tests, transaction tests, accessibility checks for chain/trade controls, and Playwright call/put flows.

**Dependencies:** Task 5.

**Estimated scope:** Medium.

#### Task 7: Deliver covered calls and cash-secured puts

**Description:** Add sell-to-open/buy-to-close flows with collateral reservations and educational obligation warnings.

**Acceptance criteria:**

- [ ] Covered calls reserve exactly 100 available shares per standard contract.
- [ ] Cash-secured puts reserve exactly `strike * 100` per contract.
- [ ] Naked/unsecured orders are rejected, collateral is visible, and partial/full closing releases the correct reservation atomically.

**Verification:** Collateral boundary and concurrency tests, transaction rollback tests, and Playwright short call/put flows.

**Dependencies:** Task 6.

**Estimated scope:** Medium.

### Checkpoint: Trading

- [ ] Cash, ledger, lots, orders, executions, and reservations reconcile after all four option position types.
- [ ] Duplicate clicks and concurrent requests cannot double-fill or overspend.
- [ ] No path creates negative cash, naked calls, or unsecured puts.
- [ ] Desktop and mobile trading flows are usable with keyboard-only navigation.

### Phase 3: Lifecycle, Portfolio, and Learning

#### Task 8: Implement option exercise and expiration settlement

**Description:** Add manual long-option exercise and idempotent expiration processing for long expiration and short assignment, with immutable lifecycle records and educational explanations.

**Acceptance criteria:**

- [ ] Long call and put exercise enforce required cash/shares and create correct stock/ledger/lot effects.
- [ ] OTM expiration, ITM short assignment, and ITM long auto-exercise follow the documented rules exactly.
- [ ] Reprocessing an expiration cannot settle a position twice, and insufficient exercise resources produce an explicit outcome.

**Verification:** Table-driven tests for call/put, long/short, ITM/ATM/OTM, partial lots, insufficient resources, and repeated processing; focused Playwright lifecycle flow.

**Dependencies:** Task 7.

**Estimated scope:** Medium.

#### Task 9: Build portfolio valuation and dashboard

**Description:** Create the portfolio read model, snapshots, headline metrics, P/L and equity charts, alerts, positions table, and activity feed with provider degradation states.

**Acceptance criteria:**

- [ ] Cash, reserved resources, market values, realized/unrealized P/L, equity, and investment P/L reconcile with lots and ledger.
- [ ] Deposits/withdrawals are separated from investment returns in the equity chart.
- [ ] Missing/stale quotes do not silently become zero; freshness and partial valuation are visible.

**Verification:** Valuation fixture tests, snapshot integration tests, chart/table accessibility checks, and responsive Playwright checks.

**Dependencies:** Tasks 5 through 8.

**Estimated scope:** Medium.

#### Task 10: Complete contextual education and FAQ

**Description:** Add concise explanations around every trading/lifecycle action and a learning center sourced from FINRA, SEC/Investor.gov, OCC, and OIC.

**Acceptance criteria:**

- [ ] Each order preview explains rights/obligations, cash/collateral change, max loss, break-even, exercise/assignment, and data freshness in plain language.
- [ ] FAQ covers all concepts listed in the UX plan and links to primary learning sources.
- [ ] Simulator and data-source limitations are clearly disclosed without presenting content as investment advice.

**Verification:** Content/link review, keyboard navigation, automated accessibility scan, and mobile layout review.

**Dependencies:** Tasks 6 through 9.

**Estimated scope:** Medium.

#### Task 11: Harden and document local operation

**Description:** Add end-to-end regression coverage, backup/restore and migration instructions, provider diagnostics, structured server logs, and a local runbook.

**Acceptance criteria:**

- [ ] Fresh setup can install, configure, migrate, seed, test, build, start, and connect to the Pi using documented commands.
- [ ] Logs identify provider/database failures without leaking connection strings, credentials, or raw sensitive configuration.
- [ ] Backup restore is tested, core E2E flows pass against deterministic provider fixtures, and a live-data smoke test is documented separately.

**Verification:** Execute the runbook from a clean checkout and disposable database; run full lint, typecheck, unit, integration, E2E, accessibility, and production-build checks.

**Dependencies:** Tasks 1 through 10.

**Estimated scope:** Medium.

### Final Checkpoint

- [ ] All spec requirements and confirmed decisions are traceable to completed acceptance criteria.
- [ ] All four option position types work end to end.
- [ ] Exercise, expiration, assignment, collateral, FIFO P/L, and cash adjustments reconcile.
- [ ] Provider, empty, stale, partial, loading, and error states are usable.
- [ ] App works on desktop and mobile and passes accessibility review.
- [ ] No secrets are committed and PostgreSQL remains LAN-only.
- [ ] Documentation explicitly records simulation limitations and Yahoo authorization/reliability risk.

## 12. Test Strategy

### Unit Tests

- Fill-side selection and quote validity.
- Stock and option FIFO matching.
- All payoff and break-even formulas.
- Collateral requirements and release.
- Exercise, assignment, and expiration matrices.
- Realized/unrealized P/L and equity calculations.
- Provider normalization and error mapping.

### PostgreSQL Integration Tests

- Migrations and idempotent seed against disposable PostgreSQL, never the Pi's main app database.
- Atomic order/ledger/lot/reservation changes.
- Rollback on every rejection path.
- Serializable transaction conflict/retry behavior.
- Mutation idempotency and expiration idempotency.
- Database constraints and decimal precision.

### End-to-End Tests

- Deposit and withdrawal.
- Stock buy and sell.
- Long call and put open/close.
- Covered call and cash-secured put open/close.
- Exercise and expiration/assignment.
- Dashboard reconciliation.
- Provider unavailable/stale/partial states.
- Responsive and keyboard workflows.

Use deterministic market-data fixtures for CI. A live Yahoo smoke test is useful for detecting upstream drift but must not gate every build because the API is unofficial and externally controlled.

## 13. Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Yahoo automated access conflicts with current Terms | High | User explicitly accepted; private/local use only, no redistribution, isolated provider interface, migration path to authorized source |
| Unofficial endpoint or schema changes | High | Runtime validation, application-owned types, fixtures, timeouts, explicit failures, optional live drift test |
| Unknown quote freshness or missing bid/ask | High | Display source timestamps; refuse fills without the required side; never label data real-time without proof |
| Accounting drift | High | Immutable ledger/executions, Decimal values, serializable transactions, idempotency keys, reconciliation tests |
| Incorrect short-option collateral | High | Central domain invariant, explicit reservations, transaction-level tests, prohibit naked positions |
| Expiration process runs twice or late | High | Idempotent settlement records, startup/page processing, manual trigger, tests around retries |
| Pi outage, storage failure, or network partition | High | Health diagnostics, no partial writes, backups and restore tests, UPS/storage monitoring recommended |
| PostgreSQL exposed beyond LAN | High | Least-privilege role, restricted bind/`pg_hba.conf`, firewall, no router port forwarding |
| Educational UI implies certainty or advice | Medium | Disclosures, primary-source links, explain assumptions, show stale/partial data and simulation limitations |
| Corporate actions or adjusted contracts corrupt assumptions | Medium | Reject non-standard contracts; exclude dividends/splits/adjustments from MVP and disclose limitation |

## 14. Implementation-Time Inputs

These are not product ambiguities, but they must be collected before Task 2:

- PostgreSQL version installed on the Raspberry Pi.
- Dedicated database name and least-privilege role name.
- Secret password supplied outside source control.
- Development machine's stable LAN IP or allowed subnet.
- Raspberry Pi backup target and retention preference.

## 15. Primary Sources

### Framework and Runtime

- Next.js 16.3 documentation and App Router guidance: https://nextjs.org/docs
- Next.js installation, TypeScript, linting, and Node requirements: https://nextjs.org/docs/app/getting-started/installation
- Next.js environment-variable security: https://nextjs.org/docs/app/guides/environment-variables
- Next.js Vitest guide: https://nextjs.org/docs/app/guides/testing/vitest
- Next.js Playwright guide: https://nextjs.org/docs/app/guides/testing/playwright
- React current version: https://react.dev/versions
- Node.js release/LTS schedule: https://nodejs.org/en/about/previous-releases
- PostgreSQL current and supported documentation: https://www.postgresql.org/docs/current/index.html
- Prisma ORM 7 GA overview: https://www.prisma.io/docs/orm
- Prisma transactions and isolation: https://www.prisma.io/docs/orm/prisma-client/queries/transactions
- Zod 4 documentation: https://zod.dev/
- Recharts documentation: https://recharts.github.io/en-US/
- QuantLib project overview: https://www.quantlib.org/

### Market Data

- `yahoo-finance2` repository and unofficial-API warning: https://github.com/gadicc/yahoo-finance2
- `yahoo-finance2` v4 options API: https://jsr.io/@gadicc/yahoo-finance2/doc/modules/options
- `yahoo-finance2` package: https://www.npmjs.com/package/yahoo-finance2
- Yahoo Terms of Service, especially sections 2.4.9 and 2.5: https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html
- Authorized fallback candidate, Tradier market data: https://docs.tradier.com/docs/market-data
- Tradier options-chain endpoint: https://docs.tradier.com/reference/brokerage-api-markets-get-options-chains

### Options Education and Rules

- FINRA options overview: https://www.finra.org/investors/investing/investment-products/options
- FINRA assignment explanation: https://www.finra.org/investors/insights/trading-options-understanding-assignment
- SEC/Investor.gov introduction to options: https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-63
- OCC Options Disclosure Document: https://www.theocc.com/Company-Information/Documents-and-Archives/Options-Disclosure-Document
- Options Industry Council: https://www.optionseducation.org/
