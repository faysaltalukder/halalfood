-- Customer submissions remain pending by RLS; admins with AAL2 MFA may publish them.
ALTER TABLE public.product_reviews
  DROP CONSTRAINT IF EXISTS product_reviews_source_customer_guard;
