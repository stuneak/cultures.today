/*
  Changes:
  - Simplify ContentType enum from IMAGE_UPLOAD/VIDEO_UPLOAD/VIDEO_YOUTUBE to UPLOAD/VIDEO_YOUTUBE
  - Remove category column from contents table
  - Drop ContentCategory enum
  - Remove description column from languages table
  - Remove boundary column from nations table (will be re-added via raw SQL)
*/

-- DropIndex
DROP INDEX IF EXISTS "nations_boundary_idx";

-- AlterTable
ALTER TABLE "contents" DROP COLUMN IF EXISTS "category";

-- AlterTable
ALTER TABLE "languages" DROP COLUMN IF EXISTS "description";

-- AlterTable
ALTER TABLE "nations" DROP COLUMN IF EXISTS "boundary";

-- DropEnum
DROP TYPE IF EXISTS "ContentCategory";

-- Migrate ContentType enum
-- First, update any existing values
UPDATE contents SET content_type = 'VIDEO_YOUTUBE' WHERE content_type = 'VIDEO_YOUTUBE';
UPDATE contents SET content_type = 'IMAGE_UPLOAD' WHERE content_type IN ('IMAGE_UPLOAD', 'VIDEO_UPLOAD');

-- Create new enum
CREATE TYPE "ContentType_new" AS ENUM ('UPLOAD', 'VIDEO_YOUTUBE');

-- Convert column to use new enum (mapping old values to new)
ALTER TABLE contents
  ALTER COLUMN content_type TYPE "ContentType_new"
  USING (
    CASE content_type::text
      WHEN 'IMAGE_UPLOAD' THEN 'UPLOAD'::"ContentType_new"
      WHEN 'VIDEO_UPLOAD' THEN 'UPLOAD'::"ContentType_new"
      WHEN 'VIDEO_YOUTUBE' THEN 'VIDEO_YOUTUBE'::"ContentType_new"
    END
  );

-- Drop old enum and rename new one
DROP TYPE "ContentType";
ALTER TYPE "ContentType_new" RENAME TO "ContentType";
