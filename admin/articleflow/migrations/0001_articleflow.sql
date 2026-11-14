-- ArticleFlow (admin/articleflow): its own tables in the content database. Nothing here touches a core table, so the
-- whole feature can be removed with 9999_remove_articleflow.sql. Safe to run more than once.

-- One row per article sent by Custompedia Tech (a "group": the same article in Indonesian and English).
CREATE TABLE IF NOT EXISTS articleflow_items (
  group_id TEXT PRIMARY KEY,
  -- { techArticleId: techVersionId } of the draft kept in `draft`
  versions TEXT NOT NULL DEFAULT '{}',
  -- the converted article (ArticleContent JSON), ready for the normal publish path
  draft TEXT,
  -- { techAssetId: mediaId } images already uploaded to Media
  assets TEXT NOT NULL DEFAULT '{}',
  -- 'id' or 'en' when Tech sent one language only (its text fills both)
  single_lang TEXT,
  -- the row in `articles` once the article was created here
  article_id INTEGER,
  state TEXT NOT NULL DEFAULT 'imported' CHECK (state IN ('imported', 'publishing', 'finishing', 'published', 'taken_down')),
  -- the idempotency key of the publish in flight (kept until Tech's answer is known, so a retry never publishes twice)
  idem_key TEXT,
  -- a publish in flight holds the row until this moment
  lock_until TEXT,
  -- { techArticleId: techVersionId } that is live on the website
  published_versions TEXT,
  decided_by TEXT,
  decided_at TEXT,
  reason TEXT,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS articleflow_items_article ON articleflow_items (article_id);

-- Follow-ups that must reach their end even if a request was cut short: finishing a publish, telling Tech the live
-- address, telling Tech an article was taken down.
CREATE TABLE IF NOT EXISTS articleflow_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('finish', 'live', 'taken_down')),
  payload TEXT NOT NULL DEFAULT '{}',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  done_at TEXT
);
CREATE INDEX IF NOT EXISTS articleflow_outbox_due ON articleflow_outbox (done_at, next_at);

-- The last good answers from Tech (status, analytics, list), shown with a notice while Tech cannot be reached.
CREATE TABLE IF NOT EXISTS articleflow_cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);
