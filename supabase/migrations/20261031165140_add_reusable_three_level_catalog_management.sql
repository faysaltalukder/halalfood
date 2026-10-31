-- Reusable three-level catalog hierarchy and atomic catalog ordering.
-- Additive only: existing category slugs, product IDs, SKUs, and order references remain unchanged.

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_id uuid;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS home_sort_order integer NOT NULL DEFAULT 1000000;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'categories_parent_id_fkey'
      AND conrelid = 'public.categories'::regclass
  ) THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_parent_id_fkey
      FOREIGN KEY (parent_id) REFERENCES public.categories(id)
      ON DELETE RESTRICT;
  END IF;
END
$$;

-- Preserve the existing storefront order as the initial homepage order.
UPDATE public.products
SET home_sort_order = COALESCE(sort_order, 0)
WHERE home_sort_order = 1000000;

CREATE INDEX IF NOT EXISTS idx_categories_parent_sort
  ON public.categories (parent_id, sort_order, name);

CREATE INDEX IF NOT EXISTS idx_products_category_sort
  ON public.products (category_slug, sort_order, name);

CREATE INDEX IF NOT EXISTS idx_products_home_sort
  ON public.products (home_sort_order, sort_order, name);

CREATE OR REPLACE FUNCTION public.validate_category_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_parent_depth integer := 0;
  v_descendant_depth integer := 0;
  v_cycle boolean := false;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.parent_id IS NOT DISTINCT FROM OLD.parent_id THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_id IS NOT NULL THEN
    IF NEW.parent_id = NEW.id THEN
      RAISE EXCEPTION 'A category cannot be its own parent.';
    END IF;

    WITH RECURSIVE ancestors AS (
      SELECT c.id, c.parent_id, 1 AS depth, ARRAY[c.id]::uuid[] AS path
      FROM public.categories c
      WHERE c.id = NEW.parent_id
      UNION ALL
      SELECT c.id, c.parent_id, a.depth + 1, a.path || c.id
      FROM public.categories c
      JOIN ancestors a ON c.id = a.parent_id
      WHERE NOT c.id = ANY(a.path) AND a.depth < 4
    )
    SELECT COALESCE(MAX(depth), 0), COALESCE(BOOL_OR(id = NEW.id), false)
      INTO v_parent_depth, v_cycle
    FROM ancestors;

    IF v_parent_depth = 0 THEN
      RAISE EXCEPTION 'The selected parent category does not exist or is not accessible.';
    END IF;
    IF v_cycle THEN
      RAISE EXCEPTION 'Circular category relationships are not allowed.';
    END IF;
  END IF;

  WITH RECURSIVE descendants AS (
    SELECT c.id, 1 AS depth, ARRAY[c.id]::uuid[] AS path
    FROM public.categories c
    WHERE c.parent_id = NEW.id
    UNION ALL
    SELECT c.id, d.depth + 1, d.path || c.id
    FROM public.categories c
    JOIN descendants d ON c.parent_id = d.id
    WHERE NOT c.id = ANY(d.path) AND d.depth < 3
  )
  SELECT COALESCE(MAX(depth), 0)
    INTO v_descendant_depth
  FROM descendants;

  IF (v_parent_depth + 1 + v_descendant_depth) > 3 THEN
    RAISE EXCEPTION 'The catalog supports a maximum of three category levels.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_category_hierarchy ON public.categories;
CREATE TRIGGER trg_validate_category_hierarchy
BEFORE INSERT OR UPDATE OF parent_id ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.validate_category_hierarchy();

CREATE OR REPLACE FUNCTION public.admin_reorder_categories(
  p_parent_id uuid,
  p_category_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expected integer;
  v_affected integer;
  v_unique integer;
BEGIN
  IF p_category_ids IS NULL THEN
    RAISE EXCEPTION 'A category order is required.';
  END IF;

  IF COALESCE(cardinality(p_category_ids), 0) = 0 THEN
    RETURN 0;
  END IF;

  SELECT COUNT(DISTINCT x) INTO v_unique FROM unnest(p_category_ids) AS x;
  IF v_unique <> cardinality(p_category_ids) THEN
    RAISE EXCEPTION 'Duplicate categories are not allowed in an order.';
  END IF;

  SELECT COUNT(*) INTO v_expected
  FROM public.categories
  WHERE parent_id IS NOT DISTINCT FROM p_parent_id;

  IF v_expected <> cardinality(p_category_ids) THEN
    RAISE EXCEPTION 'The category list changed. Refresh before saving the new order.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_category_ids) AS requested(id)
    LEFT JOIN public.categories c ON c.id = requested.id
    WHERE c.id IS NULL OR c.parent_id IS DISTINCT FROM p_parent_id
  ) THEN
    RAISE EXCEPTION 'Only sibling categories can be reordered together.';
  END IF;

  UPDATE public.categories c
  SET sort_order = ((requested.ordinality - 1) * 10)::integer,
      updated_at = now()
  FROM unnest(p_category_ids) WITH ORDINALITY AS requested(id, ordinality)
  WHERE c.id = requested.id
    AND c.parent_id IS NOT DISTINCT FROM p_parent_id;

  GET DIAGNOSTICS v_affected = ROW_COUNT;
  IF v_affected <> v_expected THEN
    RAISE EXCEPTION 'Category order was not fully saved. Check administrator access and try again.';
  END IF;

  RETURN v_affected;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reorder_products(
  p_category_slug text,
  p_product_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expected integer;
  v_affected integer;
  v_unique integer;
BEGIN
  IF p_category_slug IS NULL OR btrim(p_category_slug) = '' THEN
    RAISE EXCEPTION 'Choose a category before sorting products.';
  END IF;
  IF p_product_ids IS NULL THEN
    RAISE EXCEPTION 'A product order is required.';
  END IF;
  IF COALESCE(cardinality(p_product_ids), 0) = 0 THEN
    RETURN 0;
  END IF;

  SELECT COUNT(DISTINCT x) INTO v_unique FROM unnest(p_product_ids) AS x;
  IF v_unique <> cardinality(p_product_ids) THEN
    RAISE EXCEPTION 'Duplicate products are not allowed in an order.';
  END IF;

  SELECT COUNT(*) INTO v_expected
  FROM public.products
  WHERE category_slug = p_category_slug;

  IF v_expected <> cardinality(p_product_ids) THEN
    RAISE EXCEPTION 'The product list changed. Refresh before saving the new order.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_product_ids) AS requested(id)
    LEFT JOIN public.products p ON p.id = requested.id
    WHERE p.id IS NULL OR p.category_slug IS DISTINCT FROM p_category_slug
  ) THEN
    RAISE EXCEPTION 'Only products in the selected category can be reordered together.';
  END IF;

  UPDATE public.products p
  SET sort_order = ((requested.ordinality - 1) * 10)::integer,
      updated_at = now()
  FROM unnest(p_product_ids) WITH ORDINALITY AS requested(id, ordinality)
  WHERE p.id = requested.id
    AND p.category_slug = p_category_slug;

  GET DIAGNOSTICS v_affected = ROW_COUNT;
  IF v_affected <> v_expected THEN
    RAISE EXCEPTION 'Product order was not fully saved. Check administrator access and try again.';
  END IF;

  RETURN v_affected;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reorder_home_products(
  p_product_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expected integer;
  v_affected integer;
  v_unique integer;
BEGIN
  IF p_product_ids IS NULL THEN
    RAISE EXCEPTION 'A homepage product order is required.';
  END IF;
  IF COALESCE(cardinality(p_product_ids), 0) = 0 THEN
    RETURN 0;
  END IF;

  SELECT COUNT(DISTINCT x) INTO v_unique FROM unnest(p_product_ids) AS x;
  IF v_unique <> cardinality(p_product_ids) THEN
    RAISE EXCEPTION 'Duplicate products are not allowed in an order.';
  END IF;

  SELECT COUNT(*) INTO v_expected
  FROM public.products
  WHERE is_active = true;

  IF v_expected <> cardinality(p_product_ids) THEN
    RAISE EXCEPTION 'The active product list changed. Refresh before saving the homepage order.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_product_ids) AS requested(id)
    LEFT JOIN public.products p ON p.id = requested.id
    WHERE p.id IS NULL OR p.is_active IS DISTINCT FROM true
  ) THEN
    RAISE EXCEPTION 'Homepage ordering accepts active products only.';
  END IF;

  UPDATE public.products p
  SET home_sort_order = ((requested.ordinality - 1) * 10)::integer,
      updated_at = now()
  FROM unnest(p_product_ids) WITH ORDINALITY AS requested(id, ordinality)
  WHERE p.id = requested.id
    AND p.is_active = true;

  GET DIAGNOSTICS v_affected = ROW_COUNT;
  IF v_affected <> v_expected THEN
    RAISE EXCEPTION 'Homepage order was not fully saved. Check administrator access and try again.';
  END IF;

  RETURN v_affected;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_category_hierarchy() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_reorder_categories(uuid, uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_reorder_products(text, uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_reorder_home_products(uuid[]) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_reorder_categories(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reorder_products(text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reorder_home_products(uuid[]) TO authenticated;
