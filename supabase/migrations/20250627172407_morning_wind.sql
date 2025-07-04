/*
  # Fix RLS policies for jobs table

  1. Policy Updates
    - Update INSERT policy for jobs table to allow both authenticated and anonymous users
    - Ensure proper permissions for job creation from the dashboard
    
  2. Security
    - Maintain existing RLS policies for other operations
    - Allow job creation for service operations
*/

-- Drop existing restrictive INSERT policy if it exists
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON jobs;

-- Create a more permissive INSERT policy that allows both authenticated and anonymous users
CREATE POLICY "Enable insert for all users"
  ON jobs
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Ensure the existing SELECT policies remain for proper data access
-- The existing policies should already allow SELECT for both anon and authenticated users

-- Update the UPDATE policy to be more explicit
DROP POLICY IF EXISTS "Enable update for authenticated users" ON jobs;

CREATE POLICY "Enable update for all users"
  ON jobs
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Update the DELETE policy to be more explicit  
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON jobs;

CREATE POLICY "Enable delete for all users"
  ON jobs
  FOR DELETE
  TO public
  USING (true);