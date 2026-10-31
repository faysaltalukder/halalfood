-- Track administrator-confirmed manual WhatsApp sends separately from CSV export.
ALTER TABLE public.marketing_campaign_events
  DROP CONSTRAINT IF EXISTS marketing_campaign_events_event_type_check;

ALTER TABLE public.marketing_campaign_events
  ADD CONSTRAINT marketing_campaign_events_event_type_check
  CHECK (event_type = ANY (ARRAY[
    'created','audience_exported','email_approved','email_batch_started',
    'email_batch_finished','email_failed','whatsapp_manual_send_recorded','cancelled'
  ]));
