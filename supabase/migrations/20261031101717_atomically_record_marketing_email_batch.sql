-- Record an accepted email batch atomically after the provider response.
-- Only the server-side service_role worker may call this function.

CREATE OR REPLACE FUNCTION public.admin_marketing_record_email_batch(
  p_campaign_id uuid,
  p_claim_token uuid,
  p_recipient_ids uuid[],
  p_provider_message_ids text[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_role text := coalesce((SELECT auth.jwt())->>'role','');
  v_count integer;
  v_size integer := coalesce(cardinality(p_recipient_ids),0);
BEGIN
  IF v_role <> 'service_role' THEN
    RAISE EXCEPTION 'Server worker access required.' USING ERRCODE = '42501';
  END IF;
  IF p_campaign_id IS NULL OR p_claim_token IS NULL OR v_size < 1 OR v_size > 100
     OR cardinality(p_provider_message_ids) <> v_size THEN
    RAISE EXCEPTION 'Invalid email batch receipt.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(p_provider_message_ids) AS x(value)
    WHERE nullif(btrim(value),'') IS NULL OR char_length(value) > 200
  ) THEN
    RAISE EXCEPTION 'A provider message reference is invalid.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.marketing_campaign_recipients AS r
     SET status = 'sent',
         provider_message_id = batch.provider_message_id,
         sent_at = now(),
         last_error = NULL
    FROM unnest(p_recipient_ids, p_provider_message_ids) AS batch(recipient_id, provider_message_id)
   WHERE r.id = batch.recipient_id
     AND r.campaign_id = p_campaign_id
     AND r.status = 'queued'
     AND r.claim_token = p_claim_token;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> v_size THEN
    RAISE EXCEPTION 'Email batch receipt did not match all reserved recipients.' USING ERRCODE = '40001';
  END IF;
  RETURN v_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_marketing_record_email_batch(uuid,uuid,uuid[],text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_marketing_record_email_batch(uuid,uuid,uuid[],text[]) TO service_role;
