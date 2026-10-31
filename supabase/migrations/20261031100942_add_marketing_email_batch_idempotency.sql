-- Email campaign batches are reserved in groups and use a stable idempotency token.
ALTER TABLE public.marketing_campaign_recipients
  ADD COLUMN IF NOT EXISTS claim_token uuid,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

CREATE INDEX IF NOT EXISTS marketing_recipients_claim_idx
  ON public.marketing_campaign_recipients(campaign_id, status, claim_token, created_at);
