/*
  # Fix RLS policies for job creation

  1. Security Updates
    - Update RLS policies for jobs table to ensure proper authentication handling
    - Add more specific policies for different operations
    - Ensure service role has full access for system operations

  2. Policy Changes
    - Recreate INSERT policy with proper authentication check
    - Ensure policies work with both authenticated users and service role
    - Add debugging-friendly policy names
*/

-- Drop existing policies to recreate them with better definitions
DROP POLICY IF EXISTS "Allow authenticated users to insert jobs" ON jobs;
DROP POLICY IF EXISTS "Allow authenticated users to select jobs" ON jobs;
DROP POLICY IF EXISTS "Allow authenticated users to update jobs" ON jobs;
DROP POLICY IF EXISTS "Allow authenticated users to delete jobs" ON jobs;
DROP POLICY IF EXISTS "Allow service role full access to jobs" ON jobs;

-- Create new, more specific policies for the jobs table
CREATE POLICY "Enable insert for authenticated users" ON jobs
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Enable select for authenticated users" ON jobs
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Enable update for authenticated users" ON jobs
  FOR UPDATE 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON jobs
  FOR DELETE 
  TO authenticated 
  USING (true);

-- Ensure service role has full access (for system operations)
CREATE POLICY "Enable all operations for service role" ON jobs
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Also ensure anon users can read jobs (for public job viewing)
CREATE POLICY "Enable select for anonymous users" ON jobs
  FOR SELECT 
  TO anon 
  USING (true);