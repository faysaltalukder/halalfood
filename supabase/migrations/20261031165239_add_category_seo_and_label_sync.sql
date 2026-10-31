-- Category-specific search metadata and atomic product label synchronization.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text;

CREATE OR REPLACE FUNCTION public.sync_category_product_labels()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE public.products
    SET category = NEW.name,
        updated_at = now()
    WHERE category_slug = NEW.slug;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_category_product_labels ON public.categories;
CREATE TRIGGER trg_sync_category_product_labels
AFTER UPDATE OF name ON public.categories
FOR EACH ROW
WHEN (OLD.name IS DISTINCT FROM NEW.name)
EXECUTE FUNCTION public.sync_category_product_labels();

REVOKE ALL ON FUNCTION public.sync_category_product_labels() FROM PUBLIC, anon, authenticated;
