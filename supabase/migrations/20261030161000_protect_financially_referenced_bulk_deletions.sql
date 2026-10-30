-- Preserve financial history: orders referenced by an admin finance ledger
-- entry cannot be permanently removed from the Orders bulk manager.

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
  IF EXISTS(SELECT 1 FROM public.admin_finance_entries WHERE related_order_id=ANY(v_ids)) THEN
    RAISE EXCEPTION 'An order has a financial ledger entry and is protected from deletion.' USING ERRCODE='23503';
  END IF;
  DELETE FROM public.orders WHERE id=ANY(v_ids);
  GET DIAGNOSTICS v_deleted=ROW_COUNT;
  RETURN jsonb_build_object('success',true,'deleted_count',v_deleted);
END
$bulk_delete$;

REVOKE ALL ON FUNCTION public.admin_bulk_delete_orders(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_bulk_delete_orders(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_bulk_delete_orders(uuid[]) TO authenticated;
