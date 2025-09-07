-- RPC to submit agent application as the authenticated user
-- Safe with RLS and uses auth.uid() to resolve the internal user id

CREATE OR REPLACE FUNCTION public.apply_for_agent(p_reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_existing_status text;
BEGIN
  -- Resolve internal user id from auth uid
  SELECT id INTO v_user_id
  FROM public.users
  WHERE auth_user_id = auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No local user found for current auth user';
  END IF;

  -- Check if already pending/approved
  SELECT status INTO v_existing_status
  FROM agent_applications
  WHERE user_id = v_user_id
  ORDER BY applied_at DESC
  LIMIT 1;

  IF v_existing_status IN ('pending', 'approved') THEN
    RETURN TRUE; -- treat as successful no-op
  END IF;

  -- Insert the application
  INSERT INTO agent_applications (user_id, reason, status, applied_at)
  VALUES (v_user_id, p_reason, 'pending', NOW());

  RETURN TRUE;
END;
$$;

-- Allow authenticated users to call the function
GRANT EXECUTE ON FUNCTION public.apply_for_agent(text) TO authenticated;
