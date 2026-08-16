from datetime import datetime, timezone
from decimal import Decimal
import os

import psycopg
from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, create_engine, select
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, Session


class Base(DeclarativeBase):
    pass


class Account(Base):
    __tablename__ = "accounts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True)
    cash: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    initial_cash: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class StockLot(Base):
    __tablename__ = "stock_lots"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    symbol: Mapped[str] = mapped_column(String(10), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    remaining_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    cost_basis: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    acquired_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class StockTrade(Base):
    __tablename__ = "stock_trades"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    symbol: Mapped[str] = mapped_column(String(10), nullable=False)
    side: Mapped[str] = mapped_column(String(4), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    realized_pnl: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class OptionLot(Base):
    __tablename__ = "option_lots"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    contract_symbol: Mapped[str] = mapped_column(String(32), nullable=False)
    underlying: Mapped[str] = mapped_column(String(10), nullable=False)
    kind: Mapped[str] = mapped_column(String(4), nullable=False)
    strike: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    expiration: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    side: Mapped[str] = mapped_column(String(5), nullable=False)
    remaining_contracts: Mapped[int] = mapped_column(Integer, nullable=False)
    opening_premium: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="open")
    settlement_outcome: Mapped[str | None] = mapped_column(String(40), nullable=True)
    settled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class OptionTrade(Base):
    __tablename__ = "option_trades"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    contract_symbol: Mapped[str] = mapped_column(String(32), nullable=False)
    underlying: Mapped[str] = mapped_column(String(10), nullable=False)
    kind: Mapped[str] = mapped_column(String(4), nullable=False)
    strike: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    expiration: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    effect: Mapped[str] = mapped_column(String(20), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    premium: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    realized_pnl: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class CashLedgerEntry(Base):
    __tablename__ = "cash_ledger"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    trade_id: Mapped[int | None] = mapped_column(ForeignKey("stock_trades.id"), nullable=True)
    entry_type: Mapped[str] = mapped_column(String(30), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


def main() -> None:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise SystemExit("DATABASE_URL is required")
    database_url = make_url(url)
    database_name = database_url.database
    if not database_name or not database_name.isidentifier():
        raise SystemExit("DATABASE_URL must include a simple database name")
    admin_url = database_url.set(database="template1", drivername="postgresql+psycopg")
    admin_connection_url = admin_url.render_as_string(hide_password=False).replace("postgresql+psycopg://", "postgresql://")
    with psycopg.connect(admin_connection_url, autocommit=True) as connection:
        exists = connection.execute("SELECT 1 FROM pg_database WHERE datname = %s", (database_name,)).fetchone()
        if exists is None:
            connection.execute(f'CREATE DATABASE "{database_name}"')
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    engine = create_engine(url, pool_pre_ping=True)
    Base.metadata.create_all(engine)
    with engine.begin() as connection:
        connection.exec_driver_sql("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS user_id VARCHAR(255)")
        connection.exec_driver_sql("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS email VARCHAR(320)")
        connection.exec_driver_sql("UPDATE accounts SET user_id = 'legacy-' || id WHERE user_id IS NULL")
        connection.exec_driver_sql("UPDATE accounts SET email = 'legacy-' || id || '@local' WHERE email IS NULL")
        connection.exec_driver_sql("ALTER TABLE accounts ALTER COLUMN user_id SET NOT NULL")
        connection.exec_driver_sql("ALTER TABLE accounts ALTER COLUMN email SET NOT NULL")
        connection.exec_driver_sql("CREATE UNIQUE INDEX IF NOT EXISTS accounts_user_id_key ON accounts (user_id)")
        connection.exec_driver_sql("CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_key ON accounts (email)")
        connection.exec_driver_sql("ALTER TABLE option_lots ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'open'")
        connection.exec_driver_sql("ALTER TABLE option_lots ALTER COLUMN status TYPE VARCHAR(40)")
        connection.exec_driver_sql("ALTER TABLE option_lots ALTER COLUMN status SET DEFAULT 'open'")
        connection.exec_driver_sql("ALTER TABLE option_lots ADD COLUMN IF NOT EXISTS settlement_outcome VARCHAR(40)")
        connection.exec_driver_sql("ALTER TABLE option_lots ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ")
        connection.exec_driver_sql("UPDATE option_lots SET status = 'closed', settlement_outcome = COALESCE(settlement_outcome, 'closed'), settled_at = COALESCE(settled_at, NOW()) WHERE status = 'open' AND remaining_contracts = 0")
    now = datetime.now(timezone.utc)
    with Session(engine) as session:
        if session.scalar(select(Account).where(Account.id == 1)) is None:
            account = Account(id=1, user_id="legacy-1", email="legacy-1@local", cash=Decimal("10000.00"), initial_cash=Decimal("10000.00"), created_at=now, updated_at=now)
            session.add(account)
            session.flush()
        session.commit()
    with engine.begin() as connection:
        connection.exec_driver_sql("SELECT setval(pg_get_serial_sequence('accounts', 'id'), COALESCE((SELECT MAX(id) FROM accounts), 1), true)")
    print("OptionLab database is ready; account 1 is seeded idempotently.")


if __name__ == "__main__":
    main()
