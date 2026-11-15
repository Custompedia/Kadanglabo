-- ArticleFlow, step two (run after 0001_articleflow.sql): Tech's deletes and withdrawals reach this website.
-- Safe to run more than once, and only ArticleFlow's own tables are touched.

-- 1. A fourth follow-up kind, `remove`: Tech deleted an article (every language), so it leaves this website for good.
--    SQLite cannot change a CHECK in place: the table is built again under another name, filled, and swapped in.
--    The columns stay the same, so a second run copies the same rows again and nothing is lost.
DROP TABLE IF EXISTS articleflow_outbox_next;
CREATE TABLE articleflow_outbox_next (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('finish', 'live', 'taken_down', 'remove')),
  payload TEXT NOT NULL DEFAULT '{}',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  done_at TEXT
);
INSERT INTO articleflow_outbox_next (id, group_id, kind, payload, attempts, last_error, next_at, created_at, done_at)
  SELECT id, group_id, kind, payload, attempts, last_error, next_at, created_at, done_at FROM articleflow_outbox;
DROP TABLE articleflow_outbox;
ALTER TABLE articleflow_outbox_next RENAME TO articleflow_outbox;
CREATE INDEX IF NOT EXISTS articleflow_outbox_due ON articleflow_outbox (done_at, next_at);

-- 2. Articles Tech took off the website after they were published (Tech status WITHDRAWN). The article is taken down
--    here too and stays in the Artikel menu; this row remembers that it was Tech, not someone in the dashboard.
--    A table of its own rather than a column: ADD COLUMN cannot be repeated, and this file must be.
CREATE TABLE IF NOT EXISTS articleflow_withdrawn (
  group_id TEXT PRIMARY KEY,
  withdrawn_at TEXT NOT NULL
);
