-- Enhanced Billing System Schema Updates
-- Add support for "Bill on last day of month" checkbox

-- Update SalesOrder table to include new billing options
ALTER TABLE "SalesOrder" 
ADD COLUMN "billOnLastDay" BOOLEAN DEFAULT false;

-- Add comment to explain the new field
COMMENT ON COLUMN "SalesOrder"."billOnLastDay" IS 'If true, billing cycles end on the last day of each month regardless of billingDay. If false, uses billingDay with fallback to month end.';

-- Update existing records to have default value
UPDATE "SalesOrder" SET "billOnLastDay" = false WHERE "billOnLastDay" IS NULL;

-- Make the field NOT NULL after setting defaults
ALTER TABLE "SalesOrder" ALTER COLUMN "billOnLastDay" SET NOT NULL;

-- Add index for better query performance
CREATE INDEX "idx_salesorder_billing_options" ON "SalesOrder" ("billingCycle", "billingDay", "billOnLastDay");

-- Example of how the enhanced billing works:
-- 
-- Case 1: billingDay=15, billOnLastDay=false
--   - Cycles end on 15th of each month
--   - Denominator = 15 for proration
--
-- Case 2: billingDay=15, billOnLastDay=true  
--   - Cycles end on last day of each month (28, 29, 30, or 31)
--   - Denominator = actual days in month for proration
--
-- Case 3: billingDay=31, billOnLastDay=false
--   - Cycles end on 31st when possible, otherwise last day of month
--   - Denominator = 31 when possible, otherwise actual days in month
--
-- Case 4: billingDay=31, billOnLastDay=true
--   - Cycles end on last day of each month
--   - Denominator = actual days in month for proration

