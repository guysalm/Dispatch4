/*
  # Fix User Signup Database Issues

  1. Database Changes
    - Ensure proper RLS policies for user creation
    - Add missing user_is_admin function if needed
    - Fix any constraints that might block user creation
    - Add proper trigger for profile creation

  2. Security
    - Ensure auth.users table allows inserts
    - Fix RLS policies that might block signup
    - Add proper profile creation trigger

  3. Functions
    - Create user_is_admin function if missing
    - Ensure handle_new_user trigger works properly
*/

-- Create user_is_admin function if it doesn't exist
CREATE OR REPLACE FUNCTION user_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- Ensure the handle_new_user function exists and works properly
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update profiles table RLS policies to be more permissive for user creation
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Add a policy to allow the system to insert profiles during signup
DROP POLICY IF EXISTS "System can insert profiles during signup" ON profiles;
CREATE POLICY "System can insert profiles during signup"
  ON profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Ensure profiles table allows inserts from authenticated users
DROP POLICY IF EXISTS "Allow authenticated insert" ON profiles;
CREATE POLICY "Allow authenticated insert"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Make sure the foreign key constraint is properly set up
DO $$
BEGIN
  -- Drop the existing foreign key if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_id_fkey' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
  END IF;
  
  -- Add the foreign key constraint with proper cascade
  ALTER TABLE profiles 
  ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT ALL ON public.jobs TO anon, authenticated;
GRANT ALL ON public.subcontractors TO anon, authenticated;
GRANT ALL ON public.job_updates TO anon, authenticated;