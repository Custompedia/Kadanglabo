-- Locations (two levels: an area such as "D.I. Yogyakarta" holds cities / regencies such as "Sleman"), and the
-- settings of Our Work and the category pages. A project stores its city by name; renaming a city rewrites it there.
CREATE TABLE areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,          -- the ?location= value on the site
  label TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE cities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  area_id INTEGER NOT NULL REFERENCES areas(id)
);
CREATE INDEX cities_area ON cities(area_id);

INSERT INTO areas (key, label, position) VALUES
  ('diy', 'D.I. Yogyakarta', 0), ('klaten', 'Klaten', 1), ('jepara', 'Jepara', 2),
  ('surabaya', 'Surabaya', 3), ('bali', 'Bali', 4), ('palembang', 'Palembang', 5);
INSERT INTO cities (name, area_id) VALUES
  ('Yogyakarta', 1), ('Sleman', 1), ('Bantul', 1), ('Kulon Progo', 1),
  ('Klaten', 2), ('Jepara', 3), ('Surabaya', 4), ('Bali', 5), ('Palembang', 6);

-- one JSON document per key; 'pages' holds PageSettings (shared/content.ts)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
