-- Keep the POS transaction RPC on caller privileges and let table RLS authorize each write.
ALTER FUNCTION public.create_offline_pos_sale(jsonb) SECURITY INVOKER;

DROP POLICY IF EXISTS "Admins can record POS stock movements" ON public.inventory_movements;
CREATE POLICY "Admins can record POS stock movements"
ON public.inventory_movements
FOR INSERT
TO authenticated
WITH CHECK (
  lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'halalfoodbd.official@gmail.com'
  AND coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
);

GRANT INSERT ON public.inventory_movements TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.inventory_movements_id_seq TO authenticated;

REVOKE ALL ON FUNCTION public.create_offline_pos_sale(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_offline_pos_sale(jsonb) TO authenticated;
