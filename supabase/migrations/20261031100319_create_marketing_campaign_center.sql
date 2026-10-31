-- Halal Food Marketing Center: consent-aware campaigns.
-- Additive migration. Existing customer and order data is unchanged.

CREATE TABLE IF NOT EXISTS public.customer_marketing_preferences (
  customer_id uuid PRIMARY KEY REFERENCES public.customers(id) ON DELETE RESTRICT,
  whatsapp_opt_in boolean NOT NULL DEFAULT false,
  whatsapp_opt_in_at timestamptz,
  whatsapp_opt_in_source text,
  whatsapp_opt_out_at timestamptz,
  email_opt_in boolean NOT NULL DEFAULT false,
  email_opt_in_at timestamptz,
  email_opt_in_source text,
  email_opt_out_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text,
  CONSTRAINT customer_marketing_whatsapp_proof CHECK (
    NOT whatsapp_opt_in OR (whatsapp_opt_in_at IS NOT NULL AND nullif(btrim(whatsapp_opt_in_source),'') IS NOT NULL)
  ),
  CONSTRAINT customer_marketing_email_proof CHECK (
    NOT email_opt_in OR (email_opt_in_at IS NOT NULL AND nullif(btrim(email_opt_in_source),'') IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.customer_marketing_consent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  channel text NOT NULL CHECK (channel IN ('whatsapp','email')),
  decision text NOT NULL CHECK (decision IN ('opt_in','opt_out')),
  source text NOT NULL CHECK (char_length(btrim(source)) BETWEEN 2 AND 100),
  evidence_note text CHECK (evidence_note IS NULL OR char_length(evidence_note) <= 500),
  recorded_by text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_marketing_consent_customer_idx
  ON public.customer_marketing_consent_events(customer_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 120),
  channel text NOT NULL CHECK (channel IN ('whatsapp','email')),
  subject text,
  message_body text NOT NULL CHECK (char_length(btrim(message_body)) BETWEEN 2 AND 4000),
  audience_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','approved','sending','exported','partially_sent','sent','failed','cancelled')),
  audience_count integer NOT NULL DEFAULT 0 CHECK (audience_count >= 0),
  exported_count integer NOT NULL DEFAULT 0 CHECK (exported_count >= 0),
  sent_count integer NOT NULL DEFAULT 0 CHECK (sent_count >= 0),
  failed_count integer NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  created_by text NOT NULL,
  approved_by text,
  approved_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_email_subject_required CHECK (channel <> 'email' OR (subject IS NOT NULL AND char_length(btrim(subject)) BETWEEN 2 AND 180))
);
CREATE INDEX IF NOT EXISTS marketing_campaigns_created_idx
  ON public.marketing_campaigns(created_at DESC, id);

CREATE TABLE IF NOT EXISTS public.marketing_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'selected'
    CHECK (status IN ('selected','exported','queued','sent','delivered','failed','suppressed')),
  provider_message_id text,
  unsubscribe_token_hash text UNIQUE,
  last_error text CHECK (last_error IS NULL OR char_length(last_error) <= 1000),
  exported_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, customer_id)
);
CREATE INDEX IF NOT EXISTS marketing_recipients_campaign_status_idx
  ON public.marketing_campaign_recipients(campaign_id, status, created_at);
CREATE INDEX IF NOT EXISTS marketing_recipients_customer_idx
  ON public.marketing_campaign_recipients(customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.marketing_campaign_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('created','audience_exported','email_approved','email_batch_started','email_batch_finished','email_failed','cancelled')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS marketing_campaign_events_campaign_idx
  ON public.marketing_campaign_events(campaign_id, created_at DESC);

ALTER TABLE public.customer_marketing_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_marketing_consent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaign_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Marketing preferences admin MFA"
  ON public.customer_marketing_preferences FOR ALL TO authenticated
  USING (lower(coalesce((SELECT auth.jwt())->>'email','')) = 'halalfoodbd.official@gmail.com'
    AND coalesce((SELECT auth.jwt())->>'aal','aal1') = 'aal2')
  WITH CHECK (lower(coalesce((SELECT auth.jwt())->>'email','')) = 'halalfoodbd.official@gmail.com'
    AND coalesce((SELECT auth.jwt())->>'aal','aal1') = 'aal2');

CREATE POLICY "Marketing consent events admin read"
  ON public.customer_marketing_consent_events FOR SELECT TO authenticated
  USING (lower(coalesce((SELECT auth.jwt())->>'email','')) = 'halalfoodbd.official@gmail.com'
    AND coalesce((SELECT auth.jwt())->>'aal','aal1') = 'aal2');
CREATE POLICY "Marketing consent events admin insert"
  ON public.customer_marketing_consent_events FOR INSERT TO authenticated
  WITH CHECK (lower(coalesce((SELECT auth.jwt())->>'email','')) = 'halalfoodbd.official@gmail.com'
    AND coalesce((SELECT auth.jwt())->>'aal','aal1') = 'aal2');

CREATE POLICY "Marketing campaigns admin MFA"
  ON public.marketing_campaigns FOR ALL TO authenticated
  USING (lower(coalesce((SELECT auth.jwt())->>'email','')) = 'halalfoodbd.official@gmail.com'
    AND coalesce((SELECT auth.jwt())->>'aal','aal1') = 'aal2')
  WITH CHECK (lower(coalesce((SELECT auth.jwt())->>'email','')) = 'halalfoodbd.official@gmail.com'
    AND coalesce((SELECT auth.jwt())->>'aal','aal1') = 'aal2');

CREATE POLICY "Marketing recipients admin MFA"
  ON public.marketing_campaign_recipients FOR ALL TO authenticated
  USING (lower(coalesce((SELECT auth.jwt())->>'email','')) = 'halalfoodbd.official@gmail.com'
    AND coalesce((SELECT auth.jwt())->>'aal','aal1') = 'aal2')
  WITH CHECK (lower(coalesce((SELECT auth.jwt())->>'email','')) = 'halalfoodbd.official@gmail.com'
    AND coalesce((SELECT auth.jwt())->>'aal','aal1') = 'aal2');

CREATE POLICY "Marketing campaign events admin read"
  ON public.marketing_campaign_events FOR SELECT TO authenticated
  USING (lower(coalesce((SELECT auth.jwt())->>'email','')) = 'halalfoodbd.official@gmail.com'
    AND coalesce((SELECT auth.jwt())->>'aal','aal1') = 'aal2');
CREATE POLICY "Marketing campaign events admin insert"
  ON public.marketing_campaign_events FOR INSERT TO authenticated
  WITH CHECK (lower(coalesce((SELECT auth.jwt())->>'email','')) = 'halalfoodbd.official@gmail.com'
    AND coalesce((SELECT auth.jwt())->>'aal','aal1') = 'aal2');

REVOKE ALL ON public.customer_marketing_preferences FROM PUBLIC, anon;
REVOKE ALL ON public.customer_marketing_consent_events FROM PUBLIC, anon;
REVOKE ALL ON public.marketing_campaigns FROM PUBLIC, anon;
REVOKE ALL ON public.marketing_campaign_recipients FROM PUBLIC, anon;
REVOKE ALL ON public.marketing_campaign_events FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE ON public.customer_marketing_preferences TO authenticated;
GRANT SELECT, INSERT ON public.customer_marketing_consent_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.marketing_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.marketing_campaign_recipients TO authenticated;
GRANT SELECT, INSERT ON public.marketing_campaign_events TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_customer_marketing_consent(
  p_customer_id uuid,
  p_channel text,
  p_allowed boolean,
  p_source text,
  p_evidence_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_email text := lower(coalesce((SELECT auth.jwt())->>'email',''));
  v_aal text := coalesce((SELECT auth.jwt())->>'aal','aal1');
  v_source text := btrim(coalesce(p_source,''));
  v_evidence text := nullif(btrim(coalesce(p_evidence_note,'')),'');
BEGIN
  IF v_email <> 'halalfoodbd.official@gmail.com' OR v_aal <> 'aal2' THEN
    RAISE EXCEPTION 'Authorized admin MFA session required.' USING ERRCODE = '42501';
  END IF;
  IF p_channel NOT IN ('whatsapp','email') THEN
    RAISE EXCEPTION 'Unsupported marketing channel.' USING ERRCODE = '22023';
  END IF;
  IF char_length(v_source) < 2 OR char_length(v_source) > 100 THEN
    RAISE EXCEPTION 'Select a valid consent source.' USING ERRCODE = '22023';
  END IF;
  IF p_allowed AND (v_evidence IS NULL OR char_length(v_evidence) < 8 OR char_length(v_evidence) > 500) THEN
    RAISE EXCEPTION 'An evidence note of at least 8 characters is required to record opt-in.' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = p_customer_id AND c.archived_at IS NULL AND c.anonymized_at IS NULL AND c.is_blocked = false
  ) THEN
    RAISE EXCEPTION 'Customer is unavailable for marketing consent.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.customer_marketing_consent_events
    (customer_id, channel, decision, source, evidence_note, recorded_by)
  VALUES
    (p_customer_id, p_channel, CASE WHEN p_allowed THEN 'opt_in' ELSE 'opt_out' END, v_source, v_evidence, v_email);

  INSERT INTO public.customer_marketing_preferences (customer_id, updated_at, updated_by)
  VALUES (p_customer_id, now(), v_email)
  ON CONFLICT (customer_id) DO UPDATE SET updated_at = now(), updated_by = v_email;

  IF p_channel = 'whatsapp' THEN
    UPDATE public.customer_marketing_preferences
       SET whatsapp_opt_in = p_allowed,
           whatsapp_opt_in_at = CASE WHEN p_allowed THEN now() ELSE whatsapp_opt_in_at END,
           whatsapp_opt_in_source = CASE WHEN p_allowed THEN v_source ELSE whatsapp_opt_in_source END,
           whatsapp_opt_out_at = CASE WHEN p_allowed THEN NULL ELSE now() END,
           updated_at = now(), updated_by = v_email
     WHERE customer_id = p_customer_id;
  ELSE
    UPDATE public.customer_marketing_preferences
       SET email_opt_in = p_allowed,
           email_opt_in_at = CASE WHEN p_allowed THEN now() ELSE email_opt_in_at END,
           email_opt_in_source = CASE WHEN p_allowed THEN v_source ELSE email_opt_in_source END,
           email_opt_out_at = CASE WHEN p_allowed THEN NULL ELSE now() END,
           updated_at = now(), updated_by = v_email
     WHERE customer_id = p_customer_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'customer_id', p_customer_id, 'channel', p_channel, 'allowed', p_allowed);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_set_customer_marketing_consent(uuid,text,boolean,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_customer_marketing_consent(uuid,text,boolean,text,text) TO authenticated;
