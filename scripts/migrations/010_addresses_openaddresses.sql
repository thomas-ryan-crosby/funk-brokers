CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS address_points (
  id          BIGSERIAL PRIMARY KEY,
  number      TEXT,
  street      TEXT NOT NULL,
  unit        TEXT,
  city        TEXT,
  region      TEXT,          -- state abbreviation (TX, CA, etc.)
  postcode    TEXT,
  geom        GEOMETRY(Point, 4326) NOT NULL,
  source_hash TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_address_points_geom ON address_points USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_address_points_postcode ON address_points (postcode);

CREATE TABLE IF NOT EXISTS address_import_log (
  id           SERIAL PRIMARY KEY,
  source_file  TEXT NOT NULL,
  record_count INTEGER,
  imported_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
