-- Remove the legacy boundary_geojson column
-- Boundary data is now stored in the PostGIS geometry column (boundary)
ALTER TABLE nations DROP COLUMN IF EXISTS boundary_geojson;
