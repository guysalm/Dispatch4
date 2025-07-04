/*
  # Add pricing fields to jobs table

  1. New Fields
    - `parts_cost` (numeric) - Cost of parts and materials
    - `job_profit` (numeric) - Calculated profit (sale price - parts cost)

  2. Changes
    - Add new columns to jobs table with proper defaults
    - Update existing data to maintain consistency
*/

-- Add new pricing fields to jobs table
DO $$
BEGIN
  -- Add parts_cost column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'parts_cost'
  ) THEN
    ALTER TABLE jobs ADD COLUMN parts_cost numeric DEFAULT 0;
  END IF;

  -- Add job_profit column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'job_profit'
  ) THEN
    ALTER TABLE jobs ADD COLUMN job_profit numeric DEFAULT 0;
  END IF;
END $$;

-- Update existing records to calculate job_profit where price exists
UPDATE jobs 
SET job_profit = COALESCE(price, 0) - COALESCE(parts_cost, 0)
WHERE job_profit IS NULL OR job_profit = 0;

-- Add comment to document the new fields
COMMENT ON COLUMN jobs.parts_cost IS 'Cost of parts and materials used for the job';
COMMENT ON COLUMN jobs.job_profit IS 'Calculated profit: sale price minus parts cost';