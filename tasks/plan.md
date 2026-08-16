# Stock Trading Persistence Plan

## Overview
Add the first persisted trading slice: a singleton paper account, stock lots, immutable trade activity, and buy/sell API flows backed by PostgreSQL.

## Architecture Decisions
- Use PostgreSQL for durable state, matching the existing implementation plan.
- Use SQLAlchemy in `scripts/setup_db.py` to create and seed the schema.
- Use the Node `pg` client in Next.js route handlers so the app does not require a separate Python service.
- Use FIFO stock lots and PostgreSQL transactions for cash and position changes.

## Tasks
- [ ] Create the PostgreSQL setup script and schema.
- [ ] Add the Node database repository and stock trade endpoints.
- [ ] Replace the mock stock ticket with live quote-backed buy/sell actions.
- [ ] Add portfolio/activity persistence feedback and verify the build.

## Acceptance Criteria
- Buying stock debits cash and creates a lot.
- Selling stock checks available shares, credits cash, and records realized FIFO gain.
- Repeated requests with the same idempotency key do not duplicate a trade.
- The stock page displays persisted cash, holdings, and trade results.
