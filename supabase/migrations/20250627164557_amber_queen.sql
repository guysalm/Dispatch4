/*
  # Create jobs table with foreign key relationship

  1. New Tables
    - `jobs`
      - `id` (uuid, primary key)
      - `job_id` (text, unique, not null)
      - `customer_name` (text, not null)
      - `customer_phone` (text, not null)
      - `customer_address` (text, not null)
      - `customer_issue` (text, not null)
      - `subcontractor_id` (uuid, foreign key to subcontractors.id)
      - `status` (enum: pending, assigned, in_progress, completed, cancelled, default pending)
      - `materials` (text, nullable)
      - `price` (numeric, nullable)
      - `notes` (text, nullable)
      - `receipt_url` (text, nullable)
      - `region` (text, nullable)
      - `created_at` (timestamp with time zone, default now())
      - `updated_at` (timestamp with time zone, default now())

  2. Security
    - Enable RLS on `jobs` table
    - Add policies for authenticated users to manage jobs

  3. Foreign Keys
    - `subcontractor_id` references `subcontractors(id)`
*/

CREATE TYPE job_status AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'cancelled');

CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_address text NOT NULL,
  customer_issue text NOT NULL,
  subcontractor_id uuid REFERENCES subcontractors(id),
  status job_status DEFAULT 'pending',
  materials text,
  price numeric,
  notes text,
  receipt_url text,
  region text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read jobs"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert jobs"
  ON jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update jobs"
  ON jobs
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete jobs"
  ON jobs
  FOR DELETE
  TO authenticated
  USING (true);