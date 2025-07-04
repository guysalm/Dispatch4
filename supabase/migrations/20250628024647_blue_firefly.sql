/*
  # Disable Public Signup and Restrict Admin Creation

  1. Security Changes
    - Update RLS policies to be more restrictive
    - Remove public signup capabilities
    - Ensure only existing admins can create new admin accounts

  2. Admin Management
    - Create function to allow admins to invite new users
    - Update user creation flow to be invitation-based
    - Add email verification requirements

  3. Database Updates
    - Add invitation tracking
    - Update user role management
    - Secure admin functions
*/

-- Create invitations table to track admin invitations
CREATE TABLE IF NOT EXISTS admin_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  invitation_token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on invitations
ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;

-- Only admins can manage invitations
CREATE POLICY "Admins can manage invitations"
  ON admin_invitations
  FOR ALL
  TO authenticated
  USING (user_is_admin())
  WITH CHECK (user_is_admin());

-- Update the handle_new_user function to check for valid invitations
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record admin_invitations%ROWTYPE;
  user_count integer;
BEGIN
  -- Count existing users to determine if this is the first user
  SELECT COUNT(*) INTO user_count FROM auth.users WHERE id != NEW.id;
  
  -- If this is the first user, make them admin automatically
  IF user_count = 0 THEN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      'admin'
    );
    RETURN NEW;
  END IF;
  
  -- For subsequent users, check if they have a valid invitation
  SELECT * INTO invitation_record
  FROM admin_invitations
  WHERE email = NEW.email
    AND used_at IS NULL
    AND expires_at > now();
  
  -- If no valid invitation found, prevent account creation
  IF invitation_record.id IS NULL THEN
    RAISE EXCEPTION 'Account creation requires a valid admin invitation';
  END IF;
  
  -- Mark invitation as used
  UPDATE admin_invitations
  SET used_at = now()
  WHERE id = invitation_record.id;
  
  -- Create profile with admin role (since only admins can invite)
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'admin'
  );
  
  RETURN NEW;
END;
$$;

-- Function to create admin invitations
CREATE OR REPLACE FUNCTION create_admin_invitation(invitation_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_token text;
BEGIN
  -- Only allow if current user is admin
  IF NOT user_is_admin() THEN
    RAISE EXCEPTION 'Only administrators can create invitations';
  END IF;
  
  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = invitation_email) THEN
    RAISE EXCEPTION 'User with this email already exists';
  END IF;
  
  -- Check if invitation already exists and is still valid
  IF EXISTS (
    SELECT 1 FROM admin_invitations 
    WHERE email = invitation_email 
      AND used_at IS NULL 
      AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Valid invitation already exists for this email';
  END IF;
  
  -- Create new invitation
  INSERT INTO admin_invitations (email, invited_by, invitation_token)
  VALUES (invitation_email, auth.uid(), gen_random_uuid()::text)
  RETURNING invitation_token INTO invitation_token;
  
  RETURN invitation_token;
END;
$$;

-- Function to validate invitation tokens
CREATE OR REPLACE FUNCTION validate_invitation_token(token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record admin_invitations%ROWTYPE;
BEGIN
  SELECT * INTO invitation_record
  FROM admin_invitations
  WHERE invitation_token = token
    AND used_at IS NULL
    AND expires_at > now();
  
  IF invitation_record.id IS NULL THEN
    RETURN json_build_object('valid', false, 'message', 'Invalid or expired invitation');
  END IF;
  
  RETURN json_build_object(
    'valid', true,
    'email', invitation_record.email,
    'expires_at', invitation_record.expires_at
  );
END;
$$;

-- Function to get pending invitations (admin only)
CREATE OR REPLACE FUNCTION get_pending_invitations()
RETURNS TABLE (
  id uuid,
  email text,
  invited_by_email text,
  expires_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow if current user is admin
  IF NOT user_is_admin() THEN
    RAISE EXCEPTION 'Only administrators can view invitations';
  END IF;
  
  RETURN QUERY
  SELECT 
    ai.id,
    ai.email,
    au.email as invited_by_email,
    ai.expires_at,
    ai.created_at
  FROM admin_invitations ai
  LEFT JOIN auth.users au ON ai.invited_by = au.id
  WHERE ai.used_at IS NULL
    AND ai.expires_at > now()
  ORDER BY ai.created_at DESC;
END;
$$;

-- Function to revoke invitation (admin only)
CREATE OR REPLACE FUNCTION revoke_invitation(invitation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow if current user is admin
  IF NOT user_is_admin() THEN
    RAISE EXCEPTION 'Only administrators can revoke invitations';
  END IF;
  
  -- Mark invitation as expired
  UPDATE admin_invitations
  SET expires_at = now() - interval '1 day'
  WHERE id = invitation_id
    AND used_at IS NULL;
  
  RETURN FOUND;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_invitations_email ON admin_invitations(email);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_token ON admin_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_expires ON admin_invitations(expires_at);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.admin_invitations TO authenticated;