/*
  # Enable Public Job Access

  1. Security Changes
    - Allow anonymous users to read individual jobs by job_id
    - Allow anonymous users to update jobs (for subcontractor updates)
    - Maintain existing policies for authenticated users
    - Keep service role access intact

  2. Changes Made
    - Add policy for anonymous job reading
    - Add policy for anonymous job updates (needed for subcontractor workflow)
    - Ensure job_updates table allows anonymous inserts for tracking changes
*/

-- Allow anonymous users to read jobs (needed for public job links)
CREATE POLICY "Enable select for anonymous users on jobs"
  ON jobs
  FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to update jobs (needed for subcontractor updates)
CREATE POLICY "Enable update for anonymous users on jobs"
  ON jobs
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Ensure job_updates table allows anonymous inserts for tracking changes
DROP POLICY IF EXISTS "Allow authenticated users to insert job updates" ON job_updates;

CREATE POLICY "Enable insert for all users on job_updates"
  ON job_updates
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow anonymous users to read job updates
CREATE POLICY "Enable select for anonymous users on job_updates"
  ON job_updates
  FOR SELECT
  TO anon
  USING (true);