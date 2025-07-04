/*
  # Fix Subcontractor RLS Policies

  1. Security Updates
    - Add SELECT policy for anonymous users on subcontractors table
    - This allows the frontend to read subcontractors after creating them
    - Maintains security while enabling proper functionality

  2. Changes
    - Add policy "Enable read for anonymous users" on subcontractors table
    - This complements the existing INSERT policy for anon users
*/

-- Add SELECT policy for anonymous users on subcontractors table
CREATE POLICY "Enable read for anonymous users"
  ON subcontractors
  FOR SELECT
  TO anon
  USING (true);