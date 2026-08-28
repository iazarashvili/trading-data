-- Trading Journal — საწყისი სქემა (SPEC.md სექცია 1)

CREATE TABLE IF NOT EXISTS trades (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    trade_datetime  TEXT NOT NULL,
    asset           TEXT NOT NULL,
    direction       TEXT NOT NULL CHECK (direction IN ('Long', 'Short')),
    entry_price     REAL NOT NULL,
    stop_loss       REAL,
    take_profit     REAL,
    risk_percent    REAL,
    risk_reward     TEXT,
    setup           TEXT,
    chart_link      TEXT,
    emotion_open    TEXT,
    result          REAL,
    conclusion      TEXT,
    emotion_close   TEXT,
    screenshot      TEXT,
    screenshot2     TEXT,
    external_id     TEXT,
    source          TEXT,
    created_at      TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trades_external_id
    ON trades(external_id)
    WHERE external_id IS NOT NULL AND external_id != '';

CREATE INDEX IF NOT EXISTS idx_trades_month
    ON trades(substr(trade_datetime, 1, 7));

CREATE TABLE IF NOT EXISTS monthly_configs (
    month_id         TEXT PRIMARY KEY,
    starting_balance REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS mt5_status (
    id         INTEGER PRIMARY KEY CHECK (id = 1),
    payload    TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
