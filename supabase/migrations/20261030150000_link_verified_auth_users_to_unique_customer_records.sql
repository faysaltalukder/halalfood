-- Link Supabase Auth users to existing customer rows only through
-- verified, unique normalized email matches. Ambiguous records stay unlinked.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS auth_user_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customers_auth_user_id_fkey'
      AND conrelid = 'public.customers'::regclass
  ) THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_auth_user_id_fkey
      FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS customers_auth_user_id_unique_idx
  ON public.customers(auth_user_id) WHERE auth_user_id IS NOT NULL;

COMMENT ON COLUMN public.customers.auth_user_id IS
  'Optional verified Supabase Auth identity. Only unique verified email matches may be linked.';

WITH unique_customer_emails AS (
  SELECT lower(btrim(email)) AS normalized_email, min(id::text)::uuid AS customer_id
  FROM public.customers
  WHERE email IS NOT NULL AND btrim(email) <> ''
  GROUP BY lower(btrim(email))
  HAVING count(*) = 1
),
verified_users AS (
  SELECT id AS auth_user_id, lower(btrim(email)) AS normalized_email
  FROM auth.users
  WHERE email IS NOT NULL AND btrim(email) <> '' AND email_confirmed_at IS NOT NULL
)
UPDATE public.customers AS customer
SET auth_user_id = verified.auth_user_id
FROM unique_customer_emails AS unique_email
JOIN verified_users AS verified USING (normalized_email)
WHERE customer.id = unique_email.customer_id
  AND customer.auth_user_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.customers AS existing
    WHERE existing.auth_user_id = verified.auth_user_id
  );

INSERT INTO public.customer_profiles(user_id, full_name, phone, avatar_url)
SELECT
  u.id,
  COALESCE(NULLIF(btrim(u.raw_user_meta_data->>'full_name'), ''),
           NULLIF(btrim(u.raw_user_meta_data->>'name'), ''), c.name, ''),
  c.phone,
  CASE
    WHEN COALESCE(u.raw_user_meta_data->>'avatar_url',u.raw_user_meta_data->>'picture',
                  u.raw_user_meta_data->>'photo_url',u.raw_user_meta_data->>'profile_image')
         ~ '^https://[^[:space:]]+$'
     AND length(COALESCE(u.raw_user_meta_data->>'avatar_url',u.raw_user_meta_data->>'picture',
                         u.raw_user_meta_data->>'photo_url',u.raw_user_meta_data->>'profile_image')) <= 2048
    THEN COALESCE(u.raw_user_meta_data->>'avatar_url',u.raw_user_meta_data->>'picture',
                  u.raw_user_meta_data->>'photo_url',u.raw_user_meta_data->>'profile_image')
    ELSE NULL
  END
FROM public.customers c
JOIN auth.users u ON u.id=c.auth_user_id
WHERE c.auth_user_id IS NOT NULL
ON CONFLICT(user_id) DO UPDATE SET
  full_name=CASE WHEN btrim(COALESCE(public.customer_profiles.full_name,''))=''
                 THEN EXCLUDED.full_name ELSE public.customer_profiles.full_name END,
  phone=COALESCE(public.customer_profiles.phone,EXCLUDED.phone),
  avatar_url=COALESCE(NULLIF(public.customer_profiles.avatar_url,''),EXCLUDED.avatar_url);

CREATE OR REPLACE FUNCTION public.sync_my_customer_identity()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public,auth
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_confirmed_at timestamptz;
  v_match_count bigint;
  v_candidate_id uuid;
  v_existing_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RETURN NULL; END IF;

  SELECT email,email_confirmed_at INTO v_email,v_confirmed_at
  FROM auth.users WHERE id=v_user_id;

  IF v_email IS NULL OR btrim(v_email)='' OR v_confirmed_at IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_existing_id
  FROM public.customers WHERE auth_user_id=v_user_id LIMIT 1;
  IF v_existing_id IS NOT NULL THEN RETURN v_existing_id; END IF;

  SELECT count(*),min(id::text)::uuid
  INTO v_match_count,v_candidate_id
  FROM public.customers
  WHERE email IS NOT NULL AND btrim(email)<>''
    AND lower(btrim(email))=lower(btrim(v_email));

  IF v_match_count<>1 OR v_candidate_id IS NULL THEN RETURN NULL; END IF;

  UPDATE public.customers
  SET auth_user_id=v_user_id
  WHERE id=v_candidate_id AND (auth_user_id IS NULL OR auth_user_id=v_user_id)
  RETURNING id INTO v_existing_id;

  RETURN v_existing_id;
EXCEPTION WHEN unique_violation THEN
  SELECT id INTO v_existing_id
  FROM public.customers WHERE auth_user_id=v_user_id LIMIT 1;
  RETURN v_existing_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_my_customer_identity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_my_customer_identity() FROM anon;
GRANT EXECUTE ON FUNCTION public.sync_my_customer_identity() TO authenticated;

COMMENT ON FUNCTION public.sync_my_customer_identity() IS
  'Links the signed-in user to one customer only when its Auth email is verified and matches exactly one customer email.';
