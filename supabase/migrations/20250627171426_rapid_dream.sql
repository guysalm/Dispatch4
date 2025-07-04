/*
  # Fix RLS policies for jobs table

  1. Security Updates
    - Drop existing overly restrictive policies on jobs table
    - Create new comprehensive policies for authenticated users
    - Ensure INSERT, SELECT, UPDATE, DELETE operations work properly
    - Maintain security while allowing proper functionality

  2. Policy Details
    - Allow authenticated users to perform all operations on jobs
    - Maintain data security by requiring authentication
    - Enable proper job creation and management functionality
*/

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON jobs;
DROP POLICY IF EXISTS "Enable all operations for service role" ON jobs;

-- Create comprehensive policies for authenticated users
CREATE POLICY "Allow authenticated users to insert jobs"
  ON jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to select jobs"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to update jobs"
  ON jobs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete jobs"
  ON jobs
  FOR DELETE
  TO authenticated
  USING (true);

-- Ensure service role has full access (for admin operations)
CREATE POLICY "Allow service role full access to jobs"
  ON jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);