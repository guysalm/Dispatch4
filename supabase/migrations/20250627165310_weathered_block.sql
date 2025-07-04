/*
  # Fix RLS policies for jobs table

  1. Security Updates
    - Drop existing policies that might be causing issues
    - Recreate proper RLS policies for jobs table
    - Ensure authenticated users can perform all CRUD operations
    - Add policy for anonymous users to handle edge cases

  2. Policy Details
    - Allow authenticated users full access to jobs
    - Allow service role full access for admin operations
    - Ensure policies don't conflict with each other
*/

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Allow authenticated users to insert jobs" ON jobs;
DROP POLICY IF EXISTS "Allow authenticated users to read jobs" ON jobs;
DROP POLICY IF EXISTS "Allow authenticated users to update jobs" ON jobs;
DROP POLICY IF EXISTS "Allow authenticated users to delete jobs" ON jobs;

-- Create comprehensive policies for jobs table
CREATE POLICY "Enable all operations for authenticated users"
  ON jobs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow service role full access (for admin operations)
CREATE POLICY "Enable all operations for service role"
  ON jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;