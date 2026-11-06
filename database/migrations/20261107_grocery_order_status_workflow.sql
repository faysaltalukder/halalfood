-- Owner-scoped order fulfilment transitions.
-- Cancelling an eligible order restores reserved inventory exactly once.
CREATE OR REPLACE FUNCTION builder.update_storefront_order_status(
 p_website_id uuid,
 p_order_id uuid,
 p_status text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,builder
AS $$
DECLARE
 v_website builder.websites%ROWTYPE;
 v_order builder.orders%ROWTYPE;
 v_item record;
BEGIN
 IF p_status NOT IN ('processing','shipped','delivered','cancelled') THEN
  RAISE EXCEPTION 'Unsupported order status' USING ERRCODE='22023';
 END IF;
 SELECT * INTO v_website FROM builder.websites WHERE id=p_website_id AND owner_id=auth.uid() FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Website ownership check failed' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_order FROM builder.orders WHERE id=p_order_id AND website_id=v_website.id AND owner_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found' USING ERRCODE='P0002'; END IF;
 IF v_order.status IN ('delivered','cancelled') THEN RAISE EXCEPTION 'This order is already in a final state' USING ERRCODE='22023'; END IF;
 IF v_order.status='pending' AND p_status NOT IN ('processing','cancelled') THEN RAISE EXCEPTION 'A pending order can only be processed or cancelled' USING ERRCODE='22023'; END IF;
 IF v_order.status='processing' AND p_status NOT IN ('shipped','cancelled') THEN RAISE EXCEPTION 'A processing order can only be shipped or cancelled' USING ERRCODE='22023'; END IF;
 IF v_order.status='shipped' AND p_status<>'delivered' THEN RAISE EXCEPTION 'A shipped order can only be marked delivered' USING ERRCODE='22023'; END IF;
 IF p_status='cancelled' THEN
  FOR v_item IN SELECT product_id,quantity FROM builder.order_items WHERE order_id=v_order.id AND product_id IS NOT NULL LOOP
   UPDATE builder.products SET stock=stock+v_item.quantity,updated_at=now() WHERE id=v_item.product_id AND website_id=v_website.id;
  END LOOP;
 END IF;
 UPDATE builder.orders SET status=p_status WHERE id=v_order.id AND website_id=v_website.id;
 RETURN jsonb_build_object('id',v_order.id,'order_number',v_order.order_number,'status',p_status,'payment_status',v_order.payment_status);
END;
$$;
REVOKE ALL ON FUNCTION builder.update_storefront_order_status(uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION builder.update_storefront_order_status(uuid,uuid,text) TO authenticated;
NOTIFY pgrst,'reload schema';
