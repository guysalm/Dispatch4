/*
  # Fix RPC function parameter ambiguity

  1. Functions Updated
    - `create_admin_invitation` - Fixed parameter naming conflicts
    - `validate_invitation_token` - Fixed parameter naming conflicts  
    - `revoke_invitation` - Fixed parameter naming conflicts
    - `get_pending_invitations` - Updated to use proper joins

  2. Security
    - All functions maintain existing RLS policies
    - Proper parameter prefixing to avoid column conflicts
*/

-- Drop existing functions to recreate with fixed parameter names
DROP FUNCTION IF EXISTS create_admin_invitation(text);
DROP FUNCTION IF EXISTS validate_invitation_token(text);
DROP FUNCTION IF EXISTS revoke_invitation(uuid);
DROP FUNCTION IF EXISTS get_pending_invitations();

-- Create admin invitation function with fixed parameter naming
CREATE OR REPLACE FUNCTION create_admin_invitation(p_invitation_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user_id uuid;
  v_current_user_role text;
  v_invitation_id uuid;
  v_token text;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;
  
  -- Check if current user is admin
  SELECT role INTO v_current_user_role
  FROM profiles 
  WHERE id = v_current_user_id;
  
  IF v_current_user_role != 'admin' THEN
    RETURN json_build_object('success', false, 'message', 'Only admins can create invitations');
  END IF;
  
  -- Check if invitation already exists for this email
  IF EXISTS (
    SELECT 1 FROM admin_invitations 
    WHERE email = p_invitation_email 
    AND used_at IS NULL 
    AND expires_at > now()
  ) THEN
    RETURN json_build_object('success', false, 'message', 'Active invitation already exists for this email');
  END IF;
  
  -- Generate new invitation
  v_invitation_id := gen_random_uuid();
  v_token := gen_random_uuid()::text;
  
  INSERT INTO admin_invitations (
    id,
    email,
    invited_by,
    invitation_token,
    expires_at,
    created_at
  ) VALUES (
    v_invitation_id,
    p_invitation_email,
    v_current_user_id,
    v_token,
    now() + interval '7 days',
    now()
  );
  
  RETURN json_build_object(
    'success', true, 
    'invitation_id', v_invitation_id,
    'token', v_token,
    'expires_at', (now() + interval '7 days')::text
  );
END;
$$;

-- Validate invitation token function with fixed parameter naming
CREATE OR REPLACE FUNCTION validate_invitation_token(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation admin_invitations%ROWTYPE;
BEGIN
  -- Find the invitation
  SELECT * INTO v_invitation
  FROM admin_invitations
  WHERE invitation_token = p_token
  AND used_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'valid', false,
      'message', 'Invalid or expired invitation token'
    );
  END IF;
  
  -- Check if expired
  IF v_invitation.expires_at < now() THEN
    RETURN json_build_object(
      'valid', false,
      'message', 'Invitation has expired'
    );
  END IF;
  
  -- Return valid invitation
  RETURN json_build_object(
    'valid', true,
    'email', v_invitation.email,
    'expires_at', v_invitation.expires_at::text
  );
END;
$$;

-- Revoke invitation function with fixed parameter naming
CREATE OR REPLACE FUNCTION revoke_invitation(p_invitation_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user_id uuid;
  v_current_user_role text;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;
  
  -- Check if current user is admin
  SELECT role INTO v_current_user_role
  FROM profiles 
  WHERE id = v_current_user_id;
  
  IF v_current_user_role != 'admin' THEN
    RETURN json_build_object('success', false, 'message', 'Only admins can revoke invitations');
  END IF;
  
  -- Mark invitation as used (effectively revoking it)
  UPDATE admin_invitations 
  SET used_at = now()
  WHERE id = p_invitation_id
  AND used_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Invitation not found or already used');
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'Invitation revoked successfully');
END;
$$;

-- Get pending invitations function with proper joins
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
SET search_path = public
AS $$
DECLARE
  v_current_user_id uuid;
  v_current_user_role text;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if current user is admin
  SELECT role INTO v_current_user_role
  FROM profiles 
  WHERE profiles.id = v_current_user_id;
  
  IF v_current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can view pending invitations';
  END IF;
  
  -- Return pending invitations with inviter email
  RETURN QUERY
  SELECT 
    ai.id,
    ai.email,
    COALESCE(p.email, 'Unknown') as invited_by_email,
    ai.expires_at,
    ai.created_at
  FROM admin_invitations ai
  LEFT JOIN profiles p ON ai.invited_by = p.id
  WHERE ai.used_at IS NULL 
  AND ai.expires_at > now()
  ORDER BY ai.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_admin_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_invitation_token(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION revoke_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_invitations() TO authenticated;