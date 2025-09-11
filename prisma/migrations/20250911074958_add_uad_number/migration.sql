/*
  Warnings:

  - A unique constraint covering the columns `[uadNumber]` on the table `UAD` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `uadNumber` to the `UAD` table without a default value. This is not possible if the table is not empty.

*/

-- First, add the columns as nullable
ALTER TABLE "public"."UAD" ADD COLUMN "uadNumber" TEXT;
ALTER TABLE "public"."UAD" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Update existing UADs with sequential numbers using a CTE approach
WITH numbered_uads AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) as row_num
  FROM "public"."UAD"
  WHERE "uadNumber" IS NULL
)
UPDATE "public"."UAD" 
SET "uadNumber" = 'UAD-' || LPAD(numbered_uads.row_num::TEXT, 3, '0')
FROM numbered_uads
WHERE "public"."UAD".id = numbered_uads.id;

-- Now make the column NOT NULL
ALTER TABLE "public"."UAD" ALTER COLUMN "uadNumber" SET NOT NULL;

-- Create the unique index
CREATE UNIQUE INDEX "UAD_uadNumber_key" ON "public"."UAD"("uadNumber");