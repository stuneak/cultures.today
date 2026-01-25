/*
  Warnings:

  - You are about to drop the column `boundary` on the `Nation` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Nation_boundary_idx";

-- AlterTable
ALTER TABLE "Nation" DROP COLUMN "boundary";
