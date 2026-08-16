# Stock Persistence Setup

The stock ticket uses PostgreSQL and stores one paper account per authenticated user, FIFO stock lots, stock trades, and a cash ledger. New users receive `$20,000` in starting cash once.

## Setup

1. Ensure the network PostgreSQL server at `10.0.0.100:5432` is reachable.

2. Set `DATABASE_URL` in `.env.local` or `.envrc`:

```env
DATABASE_URL=postgresql://db:pass@10.0.0.100:5432/db
```

3. Install the Python setup dependencies:

```bash
python -m pip install -r requirements.txt
```

4. Create the tables and seed the `$10,000` account once:

```bash
python scripts/setup_db.py
```

5. Restart Next.js, open `/stocks`, and buy shares. Sell them later to see FIFO realized P/L and the updated cash balance.

The setup script is idempotent. It creates missing tables and does not add a second starting balance when run again.
