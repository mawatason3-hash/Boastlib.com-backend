-- Enable typo-tolerant search via pg_trgm and index service text fields.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS services_name_trgm_idx ON services
USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS services_platform_category_trgm_idx ON services
USING gin ((platform || ' ' || category || ' ' || name) gin_trgm_ops);
