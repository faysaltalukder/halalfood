-- Keep the MFA-guarded customer action implementation outside the exposed Data API schema.
-- The public RPC is only an invoker wrapper; the private implementation verifies the caller's JWT and AAL2.

ALTER FUNCTION public.admin_customer_action(uuid, text, text) SET SCHEMA private;

REVOKE ALL ON FUNCTION private.admin_customer_action(uuid, text, text) FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.admin_customer_action(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_customer_action(
  p_customer_id uuid,
  p_action text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $wrapper$
  SELECT private.admin_customer_action(p_customer_id, p_action, p_reason);
$wrapper$;

REVOKE ALL ON FUNCTION public.admin_customer_action(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_customer_action(uuid, text, text) TO authenticated;
