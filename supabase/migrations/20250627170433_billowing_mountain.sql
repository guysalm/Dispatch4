/*
  # Fix Subcontractor RLS Policies

  1. Security Updates
    - Drop existing conflicting policies on subcontractors table
    - Create new comprehensive policies for subcontractors table
    - Ensure authenticated users can perform all CRUD operations
    - Allow anonymous users to insert (for registration scenarios)

  2. Changes
    - Remove existing policies that may be causing conflicts
    - Add clear, non-conflicting policies for INSERT, SELECT, UPDATE operations
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow anonymous users to insert subcontractors" ON subcontractors;
DROP POLICY IF EXISTS "Allow authenticated users to insert subcontractors" ON subcontractors;
DROP POLICY IF EXISTS "Allow authenticated users to read subcontractors" ON subcontractors;
DROP POLICY IF EXISTS "Allow authenticated users to update subcontractors" ON subcontractors;

-- Create comprehensive policies for subcontractors
CREATE POLICY "Enable insert for authenticated users"
  ON subcontractors
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable insert for anonymous users"
  ON subcontractors
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Enable read for authenticated users"
  ON subcontractors
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable update for authenticated users"
  ON subcontractors
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
  ON subcontractors
  FOR DELETE
  TO authenticated
  USING (true);