-- Store optional customer profile images so the admin order manager can
-- display a provider photo for signed-in customers and initials for guests.
-- The URL is display-only and is never used for authentication or authorization.

ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'customer_profiles_avatar_url_https_check'
      AND conrelid = 'public.customer_profiles'::regclass
  ) THEN
    ALTER TABLE public.customer_profiles
      ADD CONSTRAINT customer_profiles_avatar_url_https_check
      CHECK (
        avatar_url IS NULL
        OR (
          length(avatar_url) <= 2048
          AND avatar_url ~ '^https://[^[:space:]]+$'
        )
      );
  END IF;
END
$$;

COMMENT ON COLUMN public.customer_profiles.avatar_url IS
  'Optional HTTPS profile image URL supplied by the customer authentication provider. Display-only; never used for authorization.';
