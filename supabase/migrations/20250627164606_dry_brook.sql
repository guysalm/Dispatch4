/*
  # Create job_updates table for tracking changes

  1. New Tables
    - `job_updates`
      - `id` (uuid, primary key)
      - `job_id` (uuid, foreign key to jobs.id)
      - `field_name` (text, not null)
      - `old_value` (text, nullable)
      - `new_value` (text, nullable)
      - `updated_by` (text, not null)
      - `created_at` (timestamp with time zone, default now())

  2. Security
    - Enable RLS on `job_updates` table
    - Add policies for authenticated users to manage job updates

  3. Foreign Keys
    - `job_id` references `jobs(id)` with cascade delete
*/

CREATE TABLE IF NOT EXISTS job_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  updated_by text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE job_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read job updates"
  ON job_updates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert job updates"
  ON job_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);