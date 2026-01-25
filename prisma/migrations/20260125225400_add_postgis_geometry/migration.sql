-- Add native PostGIS geometry column for spatial queries
ALTER TABLE "Nation" ADD COLUMN IF NOT EXISTS "boundary" geometry(MultiPolygon, 4326);

-- Create spatial index for efficient queries
CREATE INDEX IF NOT EXISTS "Nation_boundary_idx" ON "Nation" USING GIST ("boundary");
