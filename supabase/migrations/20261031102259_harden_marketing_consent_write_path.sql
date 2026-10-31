-- Harden marketing permissions: direct browser writes cannot manufacture consent.
-- Consent changes must pass through an MFA-verified private RPC that appends immutable evidence.

ALTER FUNCTION public.admin_set_customer_marketing_consent(uuid,text,boolean,text,text)
  SET SCHEMA private;
ALTER FUNCTION private.admin_set_customer_marketing_consent(uuid,text,boolean,text,text)
  SECURITY DEFINER;
ALTER FUNCTION private.admin_set_customer_marketing_consent(uuid,text,boolean,text,text)
  SET search_path = '';

REVOKE ALL ON FUNCTION private.admin_set_customer_marketing_consent(uuid,text,boolean,text,text)
  FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.admin_set_customer_marketing_consent(uuid,text,boolean,text,text)
  TO authenticated;

DROP POLICY IF EXISTS "Marketing preferences admin MFA" ON public.customer_marketing_preferences;
CREATE POLICY "Marketing preferences admin read"
  ON public.customer_marketing_preferences FOR SELECT TO authenticated
  USING (lower(coalesce((SELECT auth.jwt())->>'email','')) = 'halalfoodbd.official@gmail.com'
    AND coalesce((SELECT auth.jwt())->>'aal','aal1') = 'aal2');

DROP POLICY IF EXISTS "Marketing consent events admin insert" ON public.customer_marketing_consent_events;
DROP POLICY IF EXISTS "Marketing consent events admin read" ON public.customer_marketing_consent_events;
CREATE POLICY "Marketing consent events admin read"
  ON public.customer_marketing_consent_events FOR SELECT TO authenticated
  USING (lower(coalesce((SELECT auth.jwt())->>'email','')) = 'halalfoodbd.official@gmail.com'
    AND coalesce((SELECT auth.jwt())->>'aal','aal1') = 'aal2');

REVOKE INSERT, UPDATE, DELETE ON public.customer_marketing_preferences FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.customer_marketing_consent_events FROM authenticated;
GRANT SELECT ON public.customer_marketing_preferences TO authenticated;
GRANT SELECT ON public.customer_marketing_consent_events TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_customer_marketing_consent(
  p_customer_id uuid,
  p_channel text,
  p_allowed boolean,
  p_source text,
  p_evidence_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $wrapper$
  SELECT private.admin_set_customer_marketing_consent(
    p_customer_id, p_channel, p_allowed, p_source, p_evidence_note
  );
$wrapper$;

REVOKE ALL ON FUNCTION public.admin_set_customer_marketing_consent(uuid,text,boolean,text,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_customer_marketing_consent(uuid,text,boolean,text,text)
  TO authenticated;
