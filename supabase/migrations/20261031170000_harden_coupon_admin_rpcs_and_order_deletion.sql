-- Harden admin coupon RPCs with caller privileges and release uses on order deletion.
CREATE OR REPLACE FUNCTION public.admin_save_coupon(p_coupon jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $save$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt()->>'email',''));
  v_aal text := coalesce(auth.jwt()->>'aal','aal1');
  v_id uuid;
  v_existing public.coupons%ROWTYPE;
  v_name text := left(trim(coalesce(p_coupon->>'name','')),100);
  v_code text := upper(regexp_replace(trim(coalesce(p_coupon->>'code','')),'[[:space:]]','','g'));
  v_description text := left(trim(coalesce(p_coupon->>'description','')),500);
  v_discount_type text := lower(trim(coalesce(p_coupon->>'discount_type','')));
  v_discount_value numeric;
  v_max_discount numeric;
  v_minimum numeric;
  v_applies_to text := lower(trim(coalesce(p_coupon->>'applies_to','all')));
  v_customer_eligibility text := lower(trim(coalesce(p_coupon->>'customer_eligibility','all')));
  v_usage_limit integer;
  v_per_customer_limit integer;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_status text := lower(trim(coalesce(p_coupon->>'status','draft')));
  v_used integer := 0;
  v_count integer := 0;
  v_valid_phones integer := 0;
BEGIN
  IF v_user_id IS NULL OR v_email <> 'halalfoodbd.official@gmail.com' OR v_aal <> 'aal2' THEN
    RAISE EXCEPTION 'Admin access with completed MFA is required.' USING ERRCODE='42501';
  END IF;
  IF jsonb_typeof(p_coupon) <> 'object' THEN
    RAISE EXCEPTION 'Coupon details are missing.' USING ERRCODE='22023';
  END IF;
  IF length(v_name)<2 THEN RAISE EXCEPTION 'Enter a coupon name of at least 2 characters.' USING ERRCODE='22023'; END IF;
  IF v_code !~ '^[A-Z0-9][A-Z0-9_-]{2,39}$' THEN
    RAISE EXCEPTION 'Use 3–40 letters, numbers, hyphens or underscores for the coupon code.' USING ERRCODE='22023';
  END IF;
  IF v_discount_type NOT IN ('percentage','fixed') THEN RAISE EXCEPTION 'Choose a valid discount type.' USING ERRCODE='22023'; END IF;
  BEGIN
    v_discount_value := (p_coupon->>'discount_value')::numeric;
    v_minimum := coalesce(nullif(p_coupon->>'minimum_order_amount','')::numeric,0);
    v_max_discount := nullif(p_coupon->>'max_discount_amount','')::numeric;
    v_usage_limit := nullif(p_coupon->>'usage_limit','')::integer;
    v_per_customer_limit := coalesce(nullif(p_coupon->>'per_customer_limit','')::integer,1);
    v_starts_at := coalesce(nullif(p_coupon->>'starts_at','')::timestamptz,now());
    v_ends_at := nullif(p_coupon->>'ends_at','')::timestamptz;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'One or more coupon amounts, limits or dates are invalid.' USING ERRCODE='22023';
  END;
  IF v_discount_value IS NULL OR v_discount_value<=0 OR (v_discount_type='percentage' AND v_discount_value>100) THEN
    RAISE EXCEPTION 'Enter a valid discount (percentage must be from 0.01 to 100).' USING ERRCODE='22023';
  END IF;
  IF v_minimum<0 OR (v_max_discount IS NOT NULL AND v_max_discount<=0) THEN
    RAISE EXCEPTION 'Minimum order and maximum discount amounts must be zero or greater.' USING ERRCODE='22023';
  END IF;
  IF v_per_customer_limit<1 OR (v_usage_limit IS NOT NULL AND v_usage_limit<1) THEN
    RAISE EXCEPTION 'Usage limits must be at least 1.' USING ERRCODE='22023';
  END IF;
  IF v_ends_at IS NOT NULL AND v_ends_at<=v_starts_at THEN
    RAISE EXCEPTION 'The expiry date must be after the start date.' USING ERRCODE='22023';
  END IF;
  IF v_applies_to NOT IN ('all','categories','products') THEN RAISE EXCEPTION 'Choose where this coupon applies.' USING ERRCODE='22023'; END IF;
  IF v_customer_eligibility NOT IN ('all','first_order','selected') THEN RAISE EXCEPTION 'Choose who can use this coupon.' USING ERRCODE='22023'; END IF;
  IF v_status NOT IN ('draft','active','paused','archived') THEN RAISE EXCEPTION 'Choose a valid coupon status.' USING ERRCODE='22023'; END IF;

  IF v_applies_to='categories' THEN
    IF jsonb_typeof(coalesce(p_coupon->'category_ids','[]'::jsonb))<>'array' THEN
      RAISE EXCEPTION 'Select at least one category for this coupon.' USING ERRCODE='22023';
    END IF;
    IF jsonb_array_length(coalesce(p_coupon->'category_ids','[]'::jsonb))=0 THEN
      RAISE EXCEPTION 'Select at least one category for this coupon.' USING ERRCODE='22023';
    END IF;
    IF EXISTS(
      SELECT 1 FROM jsonb_array_elements_text(coalesce(p_coupon->'category_ids','[]'::jsonb)) x(value)
      WHERE NOT EXISTS(SELECT 1 FROM public.categories c WHERE c.id=x.value::uuid AND c.is_active=true)
    ) THEN RAISE EXCEPTION 'A selected category is unavailable. Refresh categories and try again.' USING ERRCODE='22023'; END IF;
  END IF;
  IF v_applies_to='products' THEN
    IF jsonb_typeof(coalesce(p_coupon->'product_ids','[]'::jsonb))<>'array' THEN
      RAISE EXCEPTION 'Select at least one product for this coupon.' USING ERRCODE='22023';
    END IF;
    IF jsonb_array_length(coalesce(p_coupon->'product_ids','[]'::jsonb))=0 THEN
      RAISE EXCEPTION 'Select at least one product for this coupon.' USING ERRCODE='22023';
    END IF;
    IF EXISTS(
      SELECT 1 FROM jsonb_array_elements_text(coalesce(p_coupon->'product_ids','[]'::jsonb)) x(value)
      WHERE NOT EXISTS(SELECT 1 FROM public.products p WHERE p.id=x.value::uuid AND p.is_active=true)
    ) THEN RAISE EXCEPTION 'A selected product is unavailable. Refresh products and try again.' USING ERRCODE='22023'; END IF;
  END IF;
  IF v_customer_eligibility='selected' THEN
    IF jsonb_typeof(coalesce(p_coupon->'customer_phones','[]'::jsonb))<>'array' THEN
      RAISE EXCEPTION 'Add at least one customer mobile number for this coupon.' USING ERRCODE='22023';
    END IF;
    IF jsonb_array_length(coalesce(p_coupon->'customer_phones','[]'::jsonb))=0 THEN
      RAISE EXCEPTION 'Add at least one customer mobile number for this coupon.' USING ERRCODE='22023';
    END IF;
    SELECT count(*)::integer INTO v_valid_phones
    FROM (
      SELECT DISTINCT private.normalize_coupon_phone(value) AS phone
      FROM jsonb_array_elements_text(coalesce(p_coupon->'customer_phones','[]'::jsonb)) x(value)
    ) phones
    WHERE phone ~ '^01[0-9]{9}$';
    IF v_valid_phones=0 THEN RAISE EXCEPTION 'Enter at least one valid 11-digit customer mobile number.' USING ERRCODE='22023'; END IF;
  END IF;

  IF nullif(p_coupon->>'id','') IS NOT NULL THEN
    BEGIN v_id := (p_coupon->>'id')::uuid;
    EXCEPTION WHEN others THEN RAISE EXCEPTION 'Invalid coupon reference. Refresh and try again.' USING ERRCODE='22023'; END;
    SELECT * INTO v_existing FROM public.coupons c WHERE c.id=v_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'This coupon no longer exists. Refresh the list.' USING ERRCODE='P0002'; END IF;
    IF v_existing.status='archived' AND v_status<>'archived' THEN
      RAISE EXCEPTION 'Archived coupons cannot be reactivated. Duplicate the coupon to run it again.' USING ERRCODE='22023';
    END IF;
    IF v_existing.code<>v_code AND EXISTS(SELECT 1 FROM public.coupon_redemptions r WHERE r.coupon_id=v_id) THEN
      RAISE EXCEPTION 'A coupon code cannot be changed after it has been used. Duplicate it to create a new code.' USING ERRCODE='22023';
    END IF;
    SELECT count(*)::integer INTO v_used FROM public.coupon_redemptions r
    WHERE r.coupon_id=v_id AND r.status IN ('reserved','redeemed');
    IF v_usage_limit IS NOT NULL AND v_usage_limit<v_used THEN
      RAISE EXCEPTION 'The usage limit cannot be lower than the % uses already reserved or redeemed.',v_used USING ERRCODE='22023';
    END IF;
    UPDATE public.coupons SET
      name=v_name, code=v_code, description=v_description,
      discount_type=v_discount_type, discount_value=v_discount_value,
      max_discount_amount=v_max_discount, minimum_order_amount=v_minimum,
      applies_to=v_applies_to, customer_eligibility=v_customer_eligibility,
      usage_limit=v_usage_limit, per_customer_limit=v_per_customer_limit,
      starts_at=v_starts_at, ends_at=v_ends_at, status=v_status, updated_at=now()
    WHERE id=v_id;
  ELSE
    INSERT INTO public.coupons(
      name,code,description,discount_type,discount_value,max_discount_amount,
      minimum_order_amount,applies_to,customer_eligibility,usage_limit,
      per_customer_limit,starts_at,ends_at,status,created_by
    ) VALUES(
      v_name,v_code,v_description,v_discount_type,v_discount_value,v_max_discount,
      v_minimum,v_applies_to,v_customer_eligibility,v_usage_limit,
      v_per_customer_limit,v_starts_at,v_ends_at,v_status,v_email
    ) RETURNING id INTO v_id;
  END IF;

  DELETE FROM public.coupon_categories WHERE coupon_id=v_id;
  DELETE FROM public.coupon_products WHERE coupon_id=v_id;
  DELETE FROM public.coupon_customer_allowlist WHERE coupon_id=v_id;

  IF v_applies_to='categories' THEN
    INSERT INTO public.coupon_categories(coupon_id,category_id)
    SELECT v_id,x.value::uuid
    FROM jsonb_array_elements_text(coalesce(p_coupon->'category_ids','[]'::jsonb)) x(value)
    ON CONFLICT DO NOTHING;
  ELSIF v_applies_to='products' THEN
    INSERT INTO public.coupon_products(coupon_id,product_id)
    SELECT v_id,x.value::uuid
    FROM jsonb_array_elements_text(coalesce(p_coupon->'product_ids','[]'::jsonb)) x(value)
    ON CONFLICT DO NOTHING;
  END IF;
  IF v_customer_eligibility='selected' THEN
    INSERT INTO public.coupon_customer_allowlist(coupon_id,customer_phone)
    SELECT v_id,private.normalize_coupon_phone(x.value)
    FROM jsonb_array_elements_text(coalesce(p_coupon->'customer_phones','[]'::jsonb)) x(value)
    WHERE private.normalize_coupon_phone(x.value) ~ '^01[0-9]{9}$'
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success',true,'couponId',v_id,'code',v_code,'status',v_status);
END
$save$;
REVOKE ALL ON FUNCTION public.admin_save_coupon(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_coupon(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_coupon_status(p_coupon_id uuid,p_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $status$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt()->>'email',''));
  v_aal text := coalesce(auth.jwt()->>'aal','aal1');
  v_coupon public.coupons%ROWTYPE;
  v_next text := lower(trim(coalesce(p_status,'')));
BEGIN
  IF v_user_id IS NULL OR v_email<>'halalfoodbd.official@gmail.com' OR v_aal<>'aal2' THEN
    RAISE EXCEPTION 'Admin access with completed MFA is required.' USING ERRCODE='42501';
  END IF;
  IF v_next NOT IN ('draft','active','paused','archived') THEN
    RAISE EXCEPTION 'Unsupported coupon status.' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_coupon FROM public.coupons c WHERE c.id=p_coupon_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Coupon not found. Refresh the list.' USING ERRCODE='P0002'; END IF;
  IF v_coupon.status='archived' AND v_next<>'archived' THEN
    RAISE EXCEPTION 'Archived coupons cannot be reactivated. Duplicate it to run a new campaign.' USING ERRCODE='22023';
  END IF;
  IF v_next='active' AND v_coupon.ends_at IS NOT NULL AND v_coupon.ends_at<=now() THEN
    RAISE EXCEPTION 'This coupon has expired. Duplicate it to create a new campaign.' USING ERRCODE='22023';
  END IF;
  UPDATE public.coupons SET status=v_next,updated_at=now() WHERE id=p_coupon_id;
  RETURN jsonb_build_object('success',true,'couponId',p_coupon_id,'status',v_next);
END
$status$;
REVOKE ALL ON FUNCTION public.admin_set_coupon_status(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_coupon_status(uuid,text) TO authenticated;


-- Coupon administration runs as the caller; table RLS remains the enforcement boundary.
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.normalize_coupon_phone(text) TO authenticated;

DO $coupon_mfa_uid_policies$
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
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING ((select auth.uid()) IS NOT NULL AND lower(coalesce(((select auth.jwt())->>''email''),''''))=''halalfoodbd.official@gmail.com'' AND coalesce(((select auth.jwt())->>''aal''),''aal1'')=''aal2'') WITH CHECK ((select auth.uid()) IS NOT NULL AND lower(coalesce(((select auth.jwt())->>''email''),''''))=''halalfoodbd.official@gmail.com'' AND coalesce(((select auth.jwt())->>''aal''),''aal1'')=''aal2'')',
      v_policy,v_table
    );
  END LOOP;
END
$coupon_mfa_uid_policies$;

-- If an order is deleted by the authorized order-management workflow, release
-- its reserved coupon use before the FK clears the order link.
CREATE OR REPLACE FUNCTION private.release_coupon_redemption_before_order_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $release$
BEGIN
  UPDATE public.coupon_redemptions
  SET status='released',updated_at=now()
  WHERE order_id=OLD.id AND status='reserved';
  RETURN OLD;
END
$release$;
REVOKE ALL ON FUNCTION private.release_coupon_redemption_before_order_delete() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS release_coupon_redemption_before_order_delete ON public.orders;
CREATE TRIGGER release_coupon_redemption_before_order_delete
BEFORE DELETE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION private.release_coupon_redemption_before_order_delete();
