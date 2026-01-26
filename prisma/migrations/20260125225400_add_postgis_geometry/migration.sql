-- Add native PostGIS geometry column for spatial queries
ALTER TABLE nations ADD COLUMN IF NOT EXISTS boundary geometry(MultiPolygon, 4326);

-- Create spatial index for efficient queries
CREATE INDEX IF NOT EXISTS nations_boundary_idx ON nations USING GIST (boundary);
