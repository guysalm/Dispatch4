/*
  # Admin Authentication System Setup

  1. Security Changes
    - Create admin role checking functions
    - Update RLS policies for admin-only access
    - Maintain public access for subcontractor portal
    
  2. Tables Affected
    - jobs: Admin-only create/delete, public read/update for subcontractor portal
    - subcontractors: Admin-only management, public read for job assignment
    - job_updates: Keep existing public access for subcontractor updates
*/

-- Create a function to check if current user is admin
-- This uses auth.jwt() to check the user's metadata
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- Create a function to check if user has admin email domain (fallback)
CREATE OR REPLACE FUNCTION is_admin_email()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'email')::text LIKE '%@admin.%' OR
    (auth.jwt() -> 'email')::text IN (
      'admin@example.com',
      'administrator@example.com'
    ),
    false
  );
$$;

-- Combined admin check function
CREATE OR REPLACE FUNCTION user_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT (
    is_current_user_admin() OR 
    is_admin_email() OR
    auth.uid() IS NOT NULL -- Temporary: all authenticated users are admin during setup
  );
$$;

-- Update RLS policies for jobs table
-- First, drop existing policies
DROP POLICY IF EXISTS "Enable all operations for service role" ON jobs;
DROP POLICY IF EXISTS "Enable delete for all users" ON jobs;
DROP POLICY IF EXISTS "Enable insert for all users" ON jobs;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON jobs;
DROP POLICY IF EXISTS "Enable select for anonymous users" ON jobs;
DROP POLICY IF EXISTS "Enable update for all users" ON jobs;

-- Create new admin-only policies for jobs management
CREATE POLICY "Admin can create jobs"
  ON jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_is_admin());

CREATE POLICY "Admin can delete jobs"
  ON jobs
  FOR DELETE
  TO authenticated
  USING (user_is_admin());

-- Keep public read access for job viewing (subcontractor portal)
CREATE POLICY "Public can read jobs"
  ON jobs
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow public updates for subcontractor portal (status, materials, price, notes, receipt)
CREATE POLICY "Public can update job details"
  ON jobs
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Update RLS policies for subcontractors table
-- First, drop existing policies
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON subcontractors;
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON subcontractors;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON subcontractors;
DROP POLICY IF EXISTS "Enable read for anonymous users" ON subcontractors;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON subcontractors;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON subcontractors;

-- Create new admin-only policies for subcontractors
CREATE POLICY "Admin can manage subcontractors"
  ON subcontractors
  FOR ALL
  TO authenticated
  USING (user_is_admin())
  WITH CHECK (user_is_admin());

-- Allow public read access for subcontractor selection in job creation
CREATE POLICY "Public can read subcontractors"
  ON subcontractors
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Job updates table policies remain the same (public access for subcontractor portal)
-- These are already correctly configured for the subcontractor portal

-- Create a profiles table to store additional user information
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  role text DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Function to handle user profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_count integer;
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count FROM auth.users;
  
  -- Insert profile for new user
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE 
      WHEN user_count <= 1 THEN 'admin'  -- First user is admin
      ELSE 'user'
    END
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Update the admin check function to use profiles table
CREATE OR REPLACE FUNCTION user_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (
      SELECT role = 'admin' 
      FROM profiles 
      WHERE id = auth.uid()
    ),
    false
  );
$$;

-- Create an admin management function (for future use)
CREATE OR REPLACE FUNCTION promote_user_to_admin(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Only allow if current user is admin
  IF NOT user_is_admin() THEN
    RETURN false;
  END IF;
  
  -- Find user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Update user role
  UPDATE profiles
  SET role = 'admin', updated_at = now()
  WHERE id = target_user_id;
  
  RETURN true;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Add updated_at trigger for profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();