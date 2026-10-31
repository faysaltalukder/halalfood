-- Ensure coupon RLS claims are initialized once per statement, not once per row.
DO $coupon_policy_initplan$
DECLARE
  v_table text;
  v_policy text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'coupons','coupon_categories','coupon_products','coupon_customer_allowlist','coupon_redemptions'
  ] LOOP
    v_policy := v_table || '_admin_mfa_only';
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',v_policy,v_table);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (lower(coalesce(((select auth.jwt()) ->> ''email''),'''')) = ''halalfoodbd.official@gmail.com'' AND coalesce(((select auth.jwt()) ->> ''aal''),''aal1'') = ''aal2'') WITH CHECK (lower(coalesce(((select auth.jwt()) ->> ''email''),'''')) = ''halalfoodbd.official@gmail.com'' AND coalesce(((select auth.jwt()) ->> ''aal''),''aal1'') = ''aal2'')',
      v_policy,v_table
    );
  END LOOP;
END
$coupon_policy_initplan$;
