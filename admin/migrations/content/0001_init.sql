-- kadanglabo-content: projects (Our Work) and articles (News & Events).
-- `draft` is what the editor works on; `published` is the snapshot the public site shows. Editing a live project
-- changes nothing on the site until it is published again.
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'published', 'taken_down', 'trashed')),
  position INTEGER NOT NULL DEFAULT 0,      -- order on Our Work (lower first)
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  archive_only INTEGER NOT NULL DEFAULT 0,
  draft TEXT NOT NULL,                      -- ProjectContent JSON
  published TEXT,                           -- ProjectContent JSON, null until first publish
  dirty INTEGER NOT NULL DEFAULT 1,         -- draft differs from what is published
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  published_at TEXT,
  trashed_at TEXT
);
CREATE INDEX projects_state ON projects(state, position);

CREATE TABLE articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'published', 'taken_down', 'trashed')),
  title TEXT NOT NULL,                      -- English title, for lists and search
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  draft TEXT NOT NULL,                      -- ArticleContent JSON
  published TEXT,
  dirty INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  published_at TEXT,
  trashed_at TEXT
);
CREATE INDEX articles_state ON articles(state, date);

-- bumped on every publish / take down, so the public site's cache key changes
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT INTO meta (key, value) VALUES ('version', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

-- a draft shown on the public site through a link that expires (Preview button)
CREATE TABLE previews (
  token TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('project', 'article')),
  content TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
