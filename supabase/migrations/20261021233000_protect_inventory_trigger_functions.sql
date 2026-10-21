-- Keep trigger-only functions non-callable from client roles and prevent cancellation reversal.
CREATE OR REPLACE FUNCTION public.release_cancelled_order_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r record; v_before numeric; v_after numeric;
BEGIN
 IF OLD.status='cancelled' AND NEW.status IS DISTINCT FROM 'cancelled' THEN
  RAISE EXCEPTION 'Cancelled orders cannot be reopened; create a new order if needed.' USING ERRCODE='22023';
 END IF;
 IF NEW.status='cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
  PERFORM set_config('app.inventory_system_update','on',true);
  FOR r IN SELECT product_id,sum(-quantity_delta) AS qty FROM public.inventory_movements
   WHERE order_id=NEW.id AND movement_type='order_reserve' AND quantity_delta<0 GROUP BY product_id LOOP
   SELECT stock_quantity INTO v_before FROM public.products WHERE id=r.product_id FOR UPDATE;
   IF v_before IS NOT NULL AND r.qty>0 THEN
    v_after:=v_before+r.qty;
    UPDATE public.products SET stock_quantity=v_after,updated_at=now() WHERE id=r.product_id;
    INSERT INTO public.inventory_movements(product_id,movement_type,quantity_delta,stock_before,stock_after,order_id,reason,created_by)
    VALUES(r.product_id,'order_cancel_release',r.qty,v_before,v_after,NEW.id,'Stock released after order cancellation','order-status-trigger');
   END IF;
  END LOOP;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.log_manual_product_stock_change() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.release_cancelled_order_stock() FROM PUBLIC,anon,authenticated;
