-- Link AI customer-care threads to verified Supabase Auth customer accounts.
-- Name and avatar values are server-resolved from customer_profiles after token verification.

ALTER TABLE public.ai_customer_care_conversations
  ADD COLUMN IF NOT EXISTS customer_user_id uuid
    REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_avatar_url text,
  ADD COLUMN IF NOT EXISTS customer_profile_updated_at timestamptz;

ALTER TABLE public.ai_customer_care_conversations
  ADD CONSTRAINT ai_customer_care_conversations_avatar_https_check
  CHECK (
    customer_avatar_url IS NULL
    OR (
      length(customer_avatar_url) <= 2048
      AND customer_avatar_url ~ '^https://'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS ai_customer_care_conversations_store_customer_user_uidx
  ON public.ai_customer_care_conversations (store_id, customer_user_id)
  WHERE customer_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ai_customer_care_conversations_customer_recent_idx
  ON public.ai_customer_care_conversations (customer_user_id, last_message_at DESC)
  WHERE customer_user_id IS NOT NULL;
