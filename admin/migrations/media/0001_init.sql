-- kadanglabo-media: every image in R2. Files live in the `kadanglabo-media` bucket as media/{id}-{width}.webp
-- (the same naming as public/img) and the upload's original in `kadanglabo-originals` as {id}/{filename}.
CREATE TABLE media (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  w INTEGER NOT NULL,
  h INTEGER NOT NULL,
  color TEXT NOT NULL,
  sizes TEXT NOT NULL,              -- JSON array of generated widths
  bytes INTEGER NOT NULL DEFAULT 0, -- its published sizes together, for the storage panel
  original_bytes INTEGER NOT NULL DEFAULT 0,
  original_key TEXT,
  alt_en TEXT NOT NULL DEFAULT '',
  alt_id TEXT NOT NULL DEFAULT '',
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX media_created ON media(created_at);
