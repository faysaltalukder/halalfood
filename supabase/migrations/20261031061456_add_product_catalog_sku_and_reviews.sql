-- Product SKU/barcode identity and customer product reviews.
-- Additive only: existing products, orders, order items and inventory movements remain untouched.

CREATE SEQUENCE IF NOT EXISTS public.product_sku_seq
  AS bigint START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sku text;

UPDATE public.products
SET sku = 'HF-' || lpad(nextval('public.product_sku_seq')::text, 6, '0')
WHERE sku IS NULL OR btrim(sku) = '';

ALTER TABLE public.products
  ALTER COLUMN sku SET DEFAULT ('HF-' || lpad(nextval('public.product_sku_seq')::text, 6, '0')),
  ALTER COLUMN sku SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique_idx
  ON public.products (sku);

CREATE OR REPLACE FUNCTION public.assign_product_sku()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.sku IS DISTINCT FROM OLD.sku THEN
    RAISE EXCEPTION 'Product SKU is permanent and cannot be changed.'
      USING ERRCODE = '22023';
  END IF;

  IF NEW.sku IS NULL OR btrim(NEW.sku) = '' THEN
    NEW.sku := 'HF-' || lpad(nextval('public.product_sku_seq')::text, 6, '0');
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS products_assign_sku_before_write ON public.products;
CREATE TRIGGER products_assign_sku_before_write
BEFORE INSERT OR UPDATE OF sku ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.assign_product_sku();

GRANT USAGE, SELECT ON SEQUENCE public.product_sku_seq TO authenticated;

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_name text NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text text NOT NULL,
  source text NOT NULL DEFAULT 'customer' CHECK (source IN ('customer', 'admin')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'hidden', 'rejected')),
  verified_purchase boolean NOT NULL DEFAULT false,
  published_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_reviews_reviewer_name_length CHECK (char_length(btrim(reviewer_name)) BETWEEN 2 AND 80),
  CONSTRAINT product_reviews_review_text_length CHECK (char_length(btrim(review_text)) BETWEEN 10 AND 1200),
  CONSTRAINT product_reviews_source_customer_guard CHECK (
    source <> 'customer' OR (status = 'pending' AND verified_purchase = false)
  )
);

CREATE INDEX IF NOT EXISTS product_reviews_published_product_idx
  ON public.product_reviews (product_id, created_at DESC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS product_reviews_admin_queue_idx
  ON public.product_reviews (status, created_at DESC);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.product_reviews FROM PUBLIC;
GRANT SELECT, INSERT ON TABLE public.product_reviews TO anon, authenticated;
GRANT UPDATE, DELETE ON TABLE public.product_reviews TO authenticated;

DROP POLICY IF EXISTS "Public can view published product reviews" ON public.product_reviews;
CREATE POLICY "Public can view published product reviews"
ON public.product_reviews
FOR SELECT
TO anon, authenticated
USING (status = 'published');

DROP POLICY IF EXISTS "Customers can submit pending product reviews" ON public.product_reviews;
CREATE POLICY "Customers can submit pending product reviews"
ON public.product_reviews
FOR INSERT
TO anon, authenticated
WITH CHECK (
  source = 'customer'
  AND status = 'pending'
  AND verified_purchase = false
  AND (
    ((SELECT auth.uid()) IS NULL AND customer_id IS NULL)
    OR ((SELECT auth.uid()) IS NOT NULL AND customer_id = (SELECT auth.uid()))
  )
  AND EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.id = product_id
      AND p.is_active = true
  )
);

DROP POLICY IF EXISTS "Admin MFA can manage product reviews" ON public.product_reviews;
CREATE POLICY "Admin MFA can manage product reviews"
ON public.product_reviews
FOR ALL
TO authenticated
USING (
  lower(coalesce((SELECT auth.jwt() ->> 'email'), '')) = 'halalfoodbd.official@gmail.com'
  AND coalesce((SELECT auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
)
WITH CHECK (
  lower(coalesce((SELECT auth.jwt() ->> 'email'), '')) = 'halalfoodbd.official@gmail.com'
  AND coalesce((SELECT auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
);
