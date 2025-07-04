/*
  # Fix RPC Function Errors

  1. Database Functions
    - Fix `get_pending_invitations` function return type mismatch
    - Fix `create_admin_invitation` function ambiguous column reference

  2. Changes Made
    - Update return type for `invited_by_email` to match actual column type
    - Resolve ambiguous `invitation_token` reference by using qualified column names
*/

-- Drop existing functions to recreate them with fixes
DROP FUNCTION IF EXISTS get_pending_invitations();
DROP FUNCTION IF EXISTS create_admin_invitation(text, uuid);

-- Recreate get_pending_invitations function with correct return types
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
  -- Check if user is admin
  IF NOT user_is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    ai.id,
    ai.email,
    COALESCE(p.email, 'System')::text as invited_by_email,
    ai.expires_at,
    ai.created_at
  FROM admin_invitations ai
  LEFT JOIN profiles p ON ai.invited_by = p.id
  WHERE ai.used_at IS NULL 
    AND ai.expires_at > now()
  ORDER BY ai.created_at DESC;
END;
$$;

-- Recreate create_admin_invitation function with qualified column references
CREATE OR REPLACE FUNCTION create_admin_invitation(
  p_email text,
  p_invited_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation_id uuid;
  v_invitation_token text;
BEGIN
  -- Check if user is admin
  IF NOT user_is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Check if invitation already exists for this email
  IF EXISTS (
    SELECT 1 FROM admin_invitations 
    WHERE admin_invitations.email = p_email 
      AND admin_invitations.used_at IS NULL 
      AND admin_invitations.expires_at > now()
  ) THEN
    RAISE EXCEPTION 'An active invitation already exists for this email address.';
  END IF;

  -- Generate new invitation token
  v_invitation_token := gen_random_uuid()::text;

  -- Insert new invitation
  INSERT INTO admin_invitations (email, invited_by, invitation_token)
  VALUES (p_email, p_invited_by, v_invitation_token)
  RETURNING admin_invitations.id INTO v_invitation_id;

  RETURN v_invitation_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_pending_invitations() TO authenticated;
GRANT EXECUTE ON FUNCTION create_admin_invitation(text, uuid) TO authenticated;