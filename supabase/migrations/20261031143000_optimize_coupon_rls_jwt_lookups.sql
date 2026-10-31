-- Cache JWT claim lookups once per statement in coupon RLS policies.
DO $coupon_policy_optimization$
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
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING ((select lower(coalesce(auth.jwt()->>''email'',''''))) = ''halalfoodbd.official@gmail.com'' AND (select coalesce(auth.jwt()->>''aal'',''aal1'')) = ''aal2'') WITH CHECK ((select lower(coalesce(auth.jwt()->>''email'',''''))) = ''halalfoodbd.official@gmail.com'' AND (select coalesce(auth.jwt()->>''aal'',''aal1'')) = ''aal2'')',
      v_policy,v_table
    );
  END LOOP;
END
$coupon_policy_optimization$;
