/*
  # Allow anonymous users to insert subcontractors

  1. Security Changes
    - Add policy to allow anonymous users to insert subcontractors
    - This enables the frontend to create subcontractors without authentication
    
  Note: This is a temporary solution for development. In production, 
  consider implementing proper authentication and restricting this to authenticated users.
*/

-- Allow anonymous users to insert subcontractors
CREATE POLICY "Allow anonymous users to insert subcontractors"
  ON subcontractors
  FOR INSERT
  TO anon
  WITH CHECK (true);