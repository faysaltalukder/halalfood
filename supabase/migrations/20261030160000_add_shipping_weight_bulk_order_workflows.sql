-- Product and order-line shipping weight, immutable order weight snapshots,
-- order-team assignment, and MFA-protected bulk order deletion.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS shipping_weight_kg numeric(10,3);

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS shipping_weight_kg numeric(10,3);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS assigned_to_team_member_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS assigned_by text NOT NULL DEFAULT '';

DO $constraints$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.products'::regclass
      AND conname='products_shipping_weight_kg_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_shipping_weight_kg_check
      CHECK (shipping_weight_kg IS NULL OR (shipping_weight_kg > 0 AND shipping_weight_kg <= 100));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.order_items'::regclass
      AND conname='order_items_shipping_weight_kg_check'
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_shipping_weight_kg_check
      CHECK (shipping_weight_kg IS NULL OR (shipping_weight_kg > 0 AND shipping_weight_kg <= 100));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.orders'::regclass
      AND conname='orders_assigned_to_team_member_id_fkey'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_assigned_to_team_member_id_fkey
      FOREIGN KEY (assigned_to_team_member_id)
      REFERENCES public.admin_team_members(id)
      ON DELETE SET NULL;
  END IF;
END
$constraints$;

CREATE INDEX IF NOT EXISTS orders_assigned_to_team_member_idx
  ON public.orders(assigned_to_team_member_id, ordered_at DESC)
  WHERE assigned_to_team_member_id IS NOT NULL;

-- Only explicit numeric weight labels are converted. "kg" means one kg per sale unit.
-- 500g -> 0.500 kg, 1kg -> 1.000 kg. Volumes and bottles are not guessed.
UPDATE public.products p
SET shipping_weight_kg = CASE
  WHEN lower(trim(p.unit_type))='kg' THEN 1.000
  WHEN lower(m.parts[3]) IN ('g','gram','grams') THEN round(m.parts[1]::numeric/1000,3)
  ELSE round(m.parts[1]::numeric,3)
END
FROM (
  SELECT id,regexp_match(
    lower(trim(unit_type)),
    '^([0-9]+([.][0-9]+)?)[[:space:]]*(kg|g|gram|grams)$'
  ) AS parts
  FROM public.products
) m
WHERE p.id=m.id
  AND p.shipping_weight_kg IS NULL
  AND (lower(trim(p.unit_type))='kg' OR m.parts IS NOT NULL);

-- Preserve historical item weights wherever the saved order unit is explicit.
UPDATE public.order_items oi
SET shipping_weight_kg = CASE
  WHEN lower(trim(oi.unit))='kg' THEN 1.000
  WHEN lower(m.parts[3]) IN ('g','gram','grams') THEN round(m.parts[1]::numeric/1000,3)
  ELSE round(m.parts[1]::numeric,3)
END
FROM (
  SELECT id,regexp_match(
    lower(trim(unit)),
    '^([0-9]+([.][0-9]+)?)[[:space:]]*(kg|g|gram|grams)$'
  ) AS parts
  FROM public.order_items
) m
WHERE oi.id=m.id
  AND oi.shipping_weight_kg IS NULL
  AND (lower(trim(oi.unit))='kg' OR m.parts IS NOT NULL);

UPDATE public.order_items oi
SET shipping_weight_kg=p.shipping_weight_kg
FROM public.products p
WHERE oi.product_id=p.id
  AND oi.shipping_weight_kg IS NULL
  AND p.shipping_weight_kg IS NOT NULL;

-- Patch, rather than rewrite, the existing security-definer checkout function so
-- its stock validation, pricing, COD and duplicate-order safeguards remain intact.
DO $function_patch$
DECLARE
  v_definition text;
  v_patched text;
BEGIN
  SELECT pg_get_functiondef('public.create_website_order(jsonb)'::regprocedure)
    INTO v_definition;

  IF position('shipping_weight_kg' IN v_definition)>0 THEN
    RETURN;
  END IF;

  v_patched := replace(
    v_definition,
    'product_image_url)',
    'product_image_url,shipping_weight_kg)'
  );
  v_patched := replace(
    v_patched,
    'ELSE v_product.image_url END);',
    'ELSE v_product.image_url END, v_product.shipping_weight_kg);'
  );

  IF v_patched=v_definition
     OR position('product_image_url,shipping_weight_kg)' IN v_patched)=0
     OR position('ELSE v_product.image_url END, v_product.shipping_weight_kg);' IN v_patched)=0 THEN
    RAISE EXCEPTION 'Could not safely add the product shipping weight snapshot to create_website_order().';
  END IF;

  EXECUTE v_patched;
END
$function_patch$;

CREATE OR REPLACE FUNCTION public.admin_bulk_delete_orders(p_order_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $bulk_delete$
DECLARE
  v_ids uuid[];
  v_requested integer;
  v_found integer;
  v_deleted integer;
  v_email text := lower(coalesce(auth.jwt()->>'email',''));
  v_aal text := coalesce(auth.jwt()->>'aal','aal1');
BEGIN
  IF v_email <> 'halalfoodbd.official@gmail.com' OR v_aal <> 'aal2' THEN
    RAISE EXCEPTION 'Admin access with completed MFA is required.' USING ERRCODE='42501';
  END IF;
  IF p_order_ids IS NULL OR cardinality(p_order_ids)=0 OR cardinality(p_order_ids)>50 THEN
    RAISE EXCEPTION 'Select between 1 and 50 orders for bulk deletion.' USING ERRCODE='22023';
  END IF;
  SELECT array_agg(DISTINCT selected.id) INTO v_ids
  FROM unnest(p_order_ids) AS selected(id);
  v_requested:=cardinality(p_order_ids);
  IF cardinality(v_ids)<>v_requested THEN
    RAISE EXCEPTION 'Duplicate order IDs were supplied. Refresh and select again.' USING ERRCODE='22023';
  END IF;
  SELECT count(*) INTO v_found FROM public.orders WHERE id=ANY(v_ids);
  IF v_found<>v_requested THEN
    RAISE EXCEPTION 'One or more selected orders no longer exist. Refresh the order list.' USING ERRCODE='P0002';
  END IF;
  IF EXISTS(SELECT 1 FROM public.orders WHERE id=ANY(v_ids) AND status NOT IN ('pending','cancelled')) THEN
    RAISE EXCEPTION 'Only pending or cancelled orders can be deleted. Processing, shipped and delivered orders are protected.' USING ERRCODE='22023';
  END IF;
  IF EXISTS(SELECT 1 FROM public.admin_shipments WHERE order_id=ANY(v_ids)) THEN
    RAISE EXCEPTION 'An order has a courier parcel record. Verify and retain it instead of deleting it.' USING ERRCODE='23503';
  END IF;
  IF EXISTS(SELECT 1 FROM public.inventory_movements WHERE order_id=ANY(v_ids)) THEN
    RAISE EXCEPTION 'An order has inventory history and is protected from deletion.' USING ERRCODE='23503';
  END IF;
  IF EXISTS(SELECT 1 FROM public.admin_return_requests WHERE order_id=ANY(v_ids)) THEN
    RAISE EXCEPTION 'An order has a return/refund record and is protected from deletion.' USING ERRCODE='23503';
  END IF;
  DELETE FROM public.orders WHERE id=ANY(v_ids);
  GET DIAGNOSTICS v_deleted=ROW_COUNT;
  RETURN jsonb_build_object('success',true,'deleted_count',v_deleted);
END
$bulk_delete$;

REVOKE ALL ON FUNCTION public.admin_bulk_delete_orders(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_bulk_delete_orders(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_bulk_delete_orders(uuid[]) TO authenticated;
