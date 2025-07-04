/*
  # Create subcontractors table

  1. New Tables
    - `subcontractors`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `phone` (text, not null)
      - `email` (text, not null)
      - `region` (text, not null)
      - `created_at` (timestamp with time zone, default now())

  2. Security
    - Enable RLS on `subcontractors` table
    - Add policy for authenticated users to read all subcontractors
    - Add policy for authenticated users to insert/update subcontractors
*/

CREATE TABLE IF NOT EXISTS subcontractors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  region text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subcontractors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read subcontractors"
  ON subcontractors
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert subcontractors"
  ON subcontractors
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update subcontractors"
  ON subcontractors
  FOR UPDATE
  TO authenticated
  USING (true);