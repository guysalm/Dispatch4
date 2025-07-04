/*
  # Fix Public Job Access

  1. Security Changes
    - Ensure anonymous users can read jobs table without authentication
    - Ensure anonymous users can read subcontractors table (for job details)
    - Ensure anonymous users can update jobs (for subcontractor updates)
    - Ensure anonymous users can insert job updates (for tracking changes)

  2. Policy Updates
    - Drop conflicting policies and recreate with proper permissions
    - Ensure public access works for job viewing and updating
*/

-- Drop all existing policies on jobs table to start fresh
DROP POLICY IF EXISTS "Enable insert for all users" ON jobs;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON jobs;
DROP POLICY IF EXISTS "Enable select for anonymous users" ON jobs;
DROP POLICY IF EXISTS "Enable select for anonymous users on jobs" ON jobs;
DROP POLICY IF EXISTS "Enable update for all users" ON jobs;
DROP POLICY IF EXISTS "Enable update for anonymous users on jobs" ON jobs;
DROP POLICY IF EXISTS "Enable delete for all users" ON jobs;
DROP POLICY IF EXISTS "Enable all operations for service role" ON jobs;

-- Create comprehensive policies for jobs table
CREATE POLICY "Enable select for anonymous users"
  ON jobs
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Enable select for authenticated users"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for all users"
  ON jobs
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Enable update for all users"
  ON jobs
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for all users"
  ON jobs
  FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Enable all operations for service role"
  ON jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure subcontractors table allows anonymous read access
DROP POLICY IF EXISTS "Enable read for anonymous users" ON subcontractors;

CREATE POLICY "Enable read for anonymous users"
  ON subcontractors
  FOR SELECT
  TO anon
  USING (true);

-- Ensure job_updates table allows anonymous access
DROP POLICY IF EXISTS "Enable insert for all users on job_updates" ON job_updates;
DROP POLICY IF EXISTS "Enable select for anonymous users on job_updates" ON job_updates;

CREATE POLICY "Enable insert for all users on job_updates"
  ON job_updates
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Enable select for anonymous users on job_updates"
  ON job_updates
  FOR SELECT
  TO anon
  USING (true);

-- Ensure RLS is enabled on all tables
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_updates ENABLE ROW LEVEL SECURITY;