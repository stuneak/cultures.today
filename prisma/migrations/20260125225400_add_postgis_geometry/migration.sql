-- Add native PostGIS geometry column for spatial queries
ALTER TABLE "Nation" ADD COLUMN IF NOT EXISTS "boundary" geometry(MultiPolygon, 4326);

-- Create spatial index for efficient queries
CREATE INDEX IF NOT EXISTS "Nation_boundary_idx" ON "Nation" USING GIST ("boundary");

-- Function to update boundary geometry when boundaryGeoJson changes
CREATE OR REPLACE FUNCTION update_nation_boundary()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."boundaryGeoJson" IS NOT NULL THEN
    NEW."boundary" = ST_SetSRID(ST_GeomFromGeoJSON(
      (NEW."boundaryGeoJson"::json->'geometry')::text
    ), 4326);
  ELSE
    NEW."boundary" = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update geometry
DROP TRIGGER IF EXISTS nation_boundary_update ON "Nation";
CREATE TRIGGER nation_boundary_update
  BEFORE INSERT OR UPDATE OF "boundaryGeoJson"
  ON "Nation"
  FOR EACH ROW
  EXECUTE FUNCTION update_nation_boundary();
