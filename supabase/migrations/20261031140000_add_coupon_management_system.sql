-- Halal Food Coupon Management V1
-- Additive schema only: preserve existing products, categories, orders and order-item history.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 100),
  code text NOT NULL CHECK (code = upper(code) AND code ~ '^[A-Z0-9][A-Z0-9_-]{2,39}$'),
  description text NOT NULL DEFAULT '',
  discount_type text NOT NULL CHECK (discount_type IN ('percentage','fixed')),
  discount_value numeric(12,2) NOT NULL CHECK (discount_value > 0),
  max_discount_amount numeric(12,2),
  minimum_order_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (minimum_order_amount >= 0),
  applies_to text NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all','categories','products')),
  customer_eligibility text NOT NULL DEFAULT 'all' CHECK (customer_eligibility IN ('all','first_order','selected')),
  usage_limit integer,
  per_customer_limit integer NOT NULL DEFAULT 1 CHECK (per_customer_limit >= 1),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','archived')),
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coupons_percentage_limit CHECK (discount_type <> 'percentage' OR discount_value <= 100),
  CONSTRAINT coupons_max_discount_positive CHECK (max_discount_amount IS NULL OR max_discount_amount > 0),
  CONSTRAINT coupons_usage_limit_positive CHECK (usage_limit IS NULL OR usage_limit >= 1),
  CONSTRAINT coupons_validity_window CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_upper_uidx
  ON public.coupons (upper(code));
CREATE INDEX IF NOT EXISTS coupons_status_validity_idx
  ON public.coupons (status, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS public.coupon_categories (
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  PRIMARY KEY (coupon_id, category_id)
);
CREATE INDEX IF NOT EXISTS coupon_categories_category_idx
  ON public.coupon_categories(category_id, coupon_id);

CREATE TABLE IF NOT EXISTS public.coupon_products (
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  PRIMARY KEY (coupon_id, product_id)
);
CREATE INDEX IF NOT EXISTS coupon_products_product_idx
  ON public.coupon_products(product_id, coupon_id);

CREATE TABLE IF NOT EXISTS public.coupon_customer_allowlist (
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  customer_phone text NOT NULL CHECK (customer_phone ~ '^01[0-9]{9}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (coupon_id, customer_phone)
);
CREATE INDEX IF NOT EXISTS coupon_customer_allowlist_phone_idx
  ON public.coupon_customer_allowlist(customer_phone, coupon_id);

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_number text NOT NULL,
  customer_phone text NOT NULL,
  discount_amount numeric(12,2) NOT NULL CHECK (discount_amount >= 0),
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','redeemed','released')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS coupon_redemptions_order_uidx
  ON public.coupon_redemptions(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS coupon_redemptions_coupon_status_idx
  ON public.coupon_redemptions(coupon_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS coupon_redemptions_customer_idx
  ON public.coupon_redemptions(coupon_id, customer_phone, status);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_id uuid,
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS coupon_discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $coupon_fk$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.orders'::regclass
      AND conname='orders_coupon_id_fkey'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_coupon_id_fkey
      FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE SET NULL;
  END IF;
END
$coupon_fk$;

CREATE INDEX IF NOT EXISTS orders_coupon_id_idx
  ON public.orders(coupon_id) WHERE coupon_id IS NOT NULL;

-- This helper deliberately lives outside the exposed public API schema.
CREATE OR REPLACE FUNCTION private.normalize_coupon_phone(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $normalize$
  SELECT CASE
    WHEN regexp_replace(coalesce(p_phone,''), '[^0-9]', '', 'g') LIKE '00880%'
      THEN '0' || substr(regexp_replace(coalesce(p_phone,''), '[^0-9]', '', 'g'), 6)
    WHEN regexp_replace(coalesce(p_phone,''), '[^0-9]', '', 'g') LIKE '880%'
      THEN '0' || substr(regexp_replace(coalesce(p_phone,''), '[^0-9]', '', 'g'), 4)
    ELSE regexp_replace(coalesce(p_phone,''), '[^0-9]', '', 'g')
  END;
$normalize$;
REVOKE ALL ON FUNCTION private.normalize_coupon_phone(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.evaluate_coupon(
  p_code text,
  p_items jsonb,
  p_phone text,
  p_lock boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $evaluate$
DECLARE
  v_coupon public.coupons%ROWTYPE;
  v_item jsonb;
  v_product public.products%ROWTYPE;
  v_identifier text;
  v_qty numeric;
  v_phone text := private.normalize_coupon_phone(p_phone);
  v_subtotal numeric := 0;
  v_eligible_subtotal numeric := 0;
  v_discount numeric := 0;
  v_total_used integer := 0;
  v_customer_used integer := 0;
  v_eligible boolean;
  v_message text;
BEGIN
  IF nullif(upper(trim(coalesce(p_code,''))),'') IS NULL THEN
    RETURN jsonb_build_object('valid',false,'message','Enter a coupon code.');
  END IF;
  IF jsonb_typeof(coalesce(p_items,'null'::jsonb)) <> 'array'
     OR jsonb_array_length(coalesce(p_items,'[]'::jsonb)) < 1
     OR jsonb_array_length(coalesce(p_items,'[]'::jsonb)) > 30 THEN
    RETURN jsonb_build_object('valid',false,'message','Your cart could not be checked. Refresh and try again.');
  END IF;

  IF p_lock THEN
    SELECT c.* INTO v_coupon
    FROM public.coupons c
    WHERE upper(c.code)=upper(trim(p_code))
    FOR UPDATE;
  ELSE
    SELECT c.* INTO v_coupon
    FROM public.coupons c
    WHERE upper(c.code)=upper(trim(p_code));
  END IF;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid',false,'message','This coupon is invalid or unavailable.');
  END IF;
  IF v_coupon.status <> 'active' THEN
    RETURN jsonb_build_object('valid',false,'message','This coupon is not currently active.');
  END IF;
  IF v_coupon.starts_at > now() THEN
    RETURN jsonb_build_object('valid',false,'message','This coupon has not started yet.');
  END IF;
  IF v_coupon.ends_at IS NOT NULL AND v_coupon.ends_at <= now() THEN
    RETURN jsonb_build_object('valid',false,'message','This coupon has expired.');
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_identifier := lower(left(trim(coalesce(v_item->>'product',v_item->>'name',v_item->>'slug','')),120));
    IF v_identifier = '' THEN
      RETURN jsonb_build_object('valid',false,'message','A product in your cart could not be identified.');
    END IF;
    SELECT p.* INTO v_product
    FROM public.products p
    WHERE p.is_active=true
      AND (lower(p.name)=v_identifier OR lower(p.slug)=v_identifier)
    ORDER BY CASE WHEN lower(p.slug)=v_identifier THEN 0 ELSE 1 END
    LIMIT 1;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('valid',false,'message','A product in your cart is no longer available.');
    END IF;
    BEGIN
      v_qty := floor(coalesce(nullif(v_item->>'quantity','')::numeric,nullif(v_item->>'qty','')::numeric,1));
    EXCEPTION WHEN others THEN
      RETURN jsonb_build_object('valid',false,'message','A product quantity could not be checked.');
    END;
    IF v_qty < 1 OR v_qty > 1000 THEN
      RETURN jsonb_build_object('valid',false,'message','A product quantity is invalid.');
    END IF;

    v_subtotal := v_subtotal + (v_product.price * v_qty);
    v_eligible := v_coupon.applies_to='all';
    IF v_coupon.applies_to='categories' THEN
      SELECT EXISTS(
        SELECT 1
        FROM public.coupon_categories cc
        JOIN public.categories cat ON cat.id=cc.category_id
        WHERE cc.coupon_id=v_coupon.id
          AND cat.is_active=true
          AND cat.slug=v_product.category_slug
      ) INTO v_eligible;
    ELSIF v_coupon.applies_to='products' THEN
      SELECT EXISTS(
        SELECT 1 FROM public.coupon_products cp
        WHERE cp.coupon_id=v_coupon.id AND cp.product_id=v_product.id
      ) INTO v_eligible;
    END IF;
    IF v_eligible THEN
      v_eligible_subtotal := v_eligible_subtotal + (v_product.price * v_qty);
    END IF;
  END LOOP;

  IF v_subtotal < v_coupon.minimum_order_amount THEN
    RETURN jsonb_build_object(
      'valid',false,
      'message','Add more eligible items to reach the minimum order of ৳' || to_char(v_coupon.minimum_order_amount,'FM999999990.00') || '.',
      'minimumOrderAmount',v_coupon.minimum_order_amount,
      'subtotal',v_subtotal
    );
  END IF;
  IF v_eligible_subtotal <= 0 THEN
    RETURN jsonb_build_object('valid',false,'message','This coupon does not apply to the products in your cart.');
  END IF;

  IF v_coupon.customer_eligibility IN ('first_order','selected') AND v_phone !~ '^01[0-9]{9}$' THEN
    RETURN jsonb_build_object('valid',false,'message','Enter your valid mobile number before applying this coupon.');
  END IF;
  IF v_coupon.customer_eligibility='first_order' THEN
    IF EXISTS(
      SELECT 1 FROM public.orders o
      WHERE private.normalize_coupon_phone(o.customer_phone)=v_phone
        AND o.status <> 'cancelled'
    ) THEN
      RETURN jsonb_build_object('valid',false,'message','This coupon is only for first-time customers.');
    END IF;
  ELSIF v_coupon.customer_eligibility='selected' THEN
    IF NOT EXISTS(
      SELECT 1 FROM public.coupon_customer_allowlist a
      WHERE a.coupon_id=v_coupon.id AND a.customer_phone=v_phone
    ) THEN
      RETURN jsonb_build_object('valid',false,'message','This coupon is not assigned to this mobile number.');
    END IF;
  END IF;

  SELECT count(*)::integer INTO v_total_used
  FROM public.coupon_redemptions r
  WHERE r.coupon_id=v_coupon.id AND r.status IN ('reserved','redeemed');
  IF v_coupon.usage_limit IS NOT NULL AND v_total_used >= v_coupon.usage_limit THEN
    RETURN jsonb_build_object('valid',false,'message','This coupon has reached its usage limit.');
  END IF;

  SELECT count(*)::integer INTO v_customer_used
  FROM public.coupon_redemptions r
  WHERE r.coupon_id=v_coupon.id
    AND r.status IN ('reserved','redeemed')
    AND private.normalize_coupon_phone(r.customer_phone)=v_phone;
  IF v_phone <> '' AND v_customer_used >= v_coupon.per_customer_limit THEN
    RETURN jsonb_build_object('valid',false,'message','You have already used this coupon the maximum number of times.');
  END IF;

  IF v_coupon.discount_type='percentage' THEN
    v_discount := round(v_eligible_subtotal * v_coupon.discount_value / 100,2);
  ELSE
    v_discount := least(v_coupon.discount_value,v_eligible_subtotal);
  END IF;
  IF v_coupon.max_discount_amount IS NOT NULL THEN
    v_discount := least(v_discount,v_coupon.max_discount_amount);
  END IF;
  v_discount := least(v_discount,v_eligible_subtotal);

  RETURN jsonb_build_object(
    'valid',true,
    'couponId',v_coupon.id,
    'couponName',v_coupon.name,
    'couponCode',v_coupon.code,
    'discountType',v_coupon.discount_type,
    'discountValue',v_coupon.discount_value,
    'maximumDiscount',v_coupon.max_discount_amount,
    'minimumOrderAmount',v_coupon.minimum_order_amount,
    'subtotal',round(v_subtotal,2),
    'eligibleSubtotal',round(v_eligible_subtotal,2),
    'discountAmount',round(v_discount,2),
    'totalUsageLimit',v_coupon.usage_limit,
    'perCustomerLimit',v_coupon.per_customer_limit
  );
END
$evaluate$;
REVOKE ALL ON FUNCTION private.evaluate_coupon(text,jsonb,text,boolean) FROM PUBLIC, anon, authenticated;

-- Publicly callable only by the server-side Edge Function using service_role.
CREATE OR REPLACE FUNCTION public.preview_coupon_discount(
  p_code text,
  p_items jsonb,
  p_phone text
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $preview$
  SELECT private.evaluate_coupon(p_code,p_items,p_phone,false);
$preview$;
REVOKE ALL ON FUNCTION public.preview_coupon_discount(text,jsonb,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.preview_coupon_discount(text,jsonb,text) TO service_role;

-- All coupon writes are performed through this MFA-protected, all-or-nothing RPC.
CREATE OR REPLACE FUNCTION public.admin_save_coupon(p_coupon jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $save$
DECLARE
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
  IF v_email <> 'halalfoodbd.official@gmail.com' OR v_aal <> 'aal2' THEN
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
    IF jsonb_typeof(coalesce(p_coupon->'category_ids','[]'::jsonb))<>'array'
       OR jsonb_array_length(coalesce(p_coupon->'category_ids','[]'::jsonb))=0 THEN
      RAISE EXCEPTION 'Select at least one category for this coupon.' USING ERRCODE='22023';
    END IF;
    IF EXISTS(
      SELECT 1 FROM jsonb_array_elements_text(coalesce(p_coupon->'category_ids','[]'::jsonb)) x(value)
      WHERE NOT EXISTS(SELECT 1 FROM public.categories c WHERE c.id=x.value::uuid AND c.is_active=true)
    ) THEN RAISE EXCEPTION 'A selected category is unavailable. Refresh categories and try again.' USING ERRCODE='22023'; END IF;
  END IF;
  IF v_applies_to='products' THEN
    IF jsonb_typeof(coalesce(p_coupon->'product_ids','[]'::jsonb))<>'array'
       OR jsonb_array_length(coalesce(p_coupon->'product_ids','[]'::jsonb))=0 THEN
      RAISE EXCEPTION 'Select at least one product for this coupon.' USING ERRCODE='22023';
    END IF;
    IF EXISTS(
      SELECT 1 FROM jsonb_array_elements_text(coalesce(p_coupon->'product_ids','[]'::jsonb)) x(value)
      WHERE NOT EXISTS(SELECT 1 FROM public.products p WHERE p.id=x.value::uuid AND p.is_active=true)
    ) THEN RAISE EXCEPTION 'A selected product is unavailable. Refresh products and try again.' USING ERRCODE='22023'; END IF;
  END IF;
  IF v_customer_eligibility='selected' THEN
    IF jsonb_typeof(coalesce(p_coupon->'customer_phones','[]'::jsonb))<>'array'
       OR jsonb_array_length(coalesce(p_coupon->'customer_phones','[]'::jsonb))=0 THEN
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
SECURITY DEFINER
SET search_path = ''
AS $status$
DECLARE
  v_email text := lower(coalesce(auth.jwt()->>'email',''));
  v_aal text := coalesce(auth.jwt()->>'aal','aal1');
  v_coupon public.coupons%ROWTYPE;
  v_next text := lower(trim(coalesce(p_status,'')));
BEGIN
  IF v_email<>'halalfoodbd.official@gmail.com' OR v_aal<>'aal2' THEN
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

-- The public admin tables are protected by MFA RLS and deliberately not exposed to anon.
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_customer_allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

DO $coupon_policies$
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
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (lower(coalesce(auth.jwt()->>''email'','''')) = ''halalfoodbd.official@gmail.com'' AND coalesce(auth.jwt()->>''aal'',''aal1'') = ''aal2'') WITH CHECK (lower(coalesce(auth.jwt()->>''email'','''')) = ''halalfoodbd.official@gmail.com'' AND coalesce(auth.jwt()->>''aal'',''aal1'') = ''aal2'')',
      v_policy,v_table
    );
  END LOOP;
END
$coupon_policies$;

REVOKE ALL ON TABLE
  public.coupons, public.coupon_categories, public.coupon_products,
  public.coupon_customer_allowlist, public.coupon_redemptions
FROM PUBLIC, anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE
  public.coupons, public.coupon_categories, public.coupon_products,
  public.coupon_customer_allowlist, public.coupon_redemptions
TO authenticated, service_role;

-- Keep redemption capacity in sync with the authoritative order lifecycle.
CREATE OR REPLACE FUNCTION private.sync_coupon_redemption_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $sync$
BEGIN
  IF NEW.status='cancelled' AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.coupon_redemptions
    SET status='released',updated_at=now()
    WHERE order_id=NEW.id AND status='reserved';
  ELSIF NEW.status='delivered' AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.coupon_redemptions
    SET status='redeemed',updated_at=now()
    WHERE order_id=NEW.id AND status='reserved';
  END IF;
  RETURN NEW;
END
$sync$;
REVOKE ALL ON FUNCTION private.sync_coupon_redemption_order_status() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS sync_coupon_redemption_after_order_status ON public.orders;
CREATE TRIGGER sync_coupon_redemption_after_order_status
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION private.sync_coupon_redemption_order_status();

-- Replace the checkout RPC in-place. Its existing validation, idempotency, live
-- product pricing, inventory reservation and order-line snapshots are retained.
CREATE OR REPLACE FUNCTION public.create_website_order(p_order jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $website_order$
DECLARE
  v_name text := left(trim(coalesce(p_order->>'name','')),80);
  v_phone text := regexp_replace(coalesce(p_order->>'phone',p_order->>'mobile',''),'[[:space:]-]','','g');
  v_email text := nullif(left(trim(coalesce(p_order->>'email','')),120),'');
  v_address text := left(trim(coalesce(p_order->>'address','')),300);
  v_notes text := left(trim(coalesce(p_order->>'notes','')),500);
  v_zone text := coalesce(p_order->>'deliveryZone',p_order->>'delivery_zone','');
  v_payment text := lower(coalesce(p_order->>'paymentMethod',p_order->>'payment_method','cash_on_delivery'));
  v_delivery numeric;
  v_order_number text := nullif(left(trim(coalesce(p_order->>'orderId','')),20),'');
  v_coupon_code text := upper(left(trim(coalesce(p_order->>'couponCode',p_order->>'coupon_code','')),40));
  v_coupon_quote jsonb;
  v_coupon_id uuid;
  v_coupon_discount numeric := 0;
  v_coupon_snapshot jsonb := '{}'::jsonb;
  v_customer_id uuid;
  v_order_id uuid;
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_line jsonb;
  v_product public.products%ROWTYPE;
  v_qty numeric;
  v_before numeric;
  v_after numeric;
  v_lines integer := 0;
  v_item_rows jsonb := coalesce(p_order->'items','[]'::jsonb);
  v_existing public.orders%ROWTYPE;
BEGIN
  IF length(v_name)<2 THEN RAISE EXCEPTION 'Please enter your full name.' USING ERRCODE='22023'; END IF;
  IF v_phone !~ '^01[0-9]{9}$' THEN RAISE EXCEPTION 'Please enter a valid 11-digit mobile number (01XXXXXXXXX).' USING ERRCODE='22023'; END IF;
  IF v_email IS NOT NULL AND v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Please enter a valid email address.' USING ERRCODE='22023'; END IF;
  IF length(v_address)<5 THEN RAISE EXCEPTION 'Please enter your full address.' USING ERRCODE='22023'; END IF;
  IF v_zone NOT IN ('inside_dhaka','outside_dhaka') THEN RAISE EXCEPTION 'Please select a valid delivery area.' USING ERRCODE='22023'; END IF;
  IF v_payment<>'cash_on_delivery' THEN RAISE EXCEPTION 'Cash on Delivery is the only available payment method.' USING ERRCODE='22023'; END IF;
  v_delivery := CASE WHEN v_zone='inside_dhaka' THEN 70 ELSE 120 END;
  IF v_order_number IS NOT NULL AND v_order_number !~ '^HF-[0-9]{4,6}$' THEN v_order_number := NULL; END IF;
  IF jsonb_typeof(v_item_rows)<>'array' OR jsonb_array_length(v_item_rows)=0 OR jsonb_array_length(v_item_rows)>30 THEN
    RAISE EXCEPTION 'Please add between 1 and 30 order items.' USING ERRCODE='22023';
  END IF;

  IF v_order_number IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext(v_order_number));
    SELECT * INTO v_existing FROM public.orders WHERE order_number=v_order_number LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'success',true,'duplicate',true,'orderId',v_existing.order_number,
        'subtotal',v_existing.subtotal,'deliveryCharge',v_existing.delivery_charge,
        'couponCode',v_existing.coupon_code,'couponDiscount',v_existing.coupon_discount_amount,
        'total',v_existing.total,'orderTotal',v_existing.total
      );
    END IF;
  END IF;

  IF (SELECT count(*) FROM public.orders WHERE customer_phone=v_phone AND ordered_at>=now()-interval '10 minutes')>=5 THEN
    RAISE EXCEPTION 'Too many orders from this number in a short time. Please contact us by phone.' USING ERRCODE='P0001';
  END IF;
  SELECT id INTO v_customer_id FROM public.customers WHERE phone=v_phone ORDER BY created_at LIMIT 1;
  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers(name,phone,email,address) VALUES(v_name,v_phone,v_email,v_address) RETURNING id INTO v_customer_id;
  END IF;

  FOR v_line IN SELECT value FROM jsonb_array_elements(v_item_rows) LOOP
    v_lines:=v_lines+1;
    SELECT * INTO v_product FROM public.products
    WHERE is_active=true AND (
      lower(name)=lower(left(trim(coalesce(v_line->>'product',v_line->>'name',v_line->>'slug','')),120))
      OR lower(slug)=lower(left(trim(coalesce(v_line->>'product',v_line->>'name',v_line->>'slug','')),120))
    ) LIMIT 1;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Sorry, this product is not available: %',left(trim(coalesce(v_line->>'product',v_line->>'name',v_line->>'slug','')),120) USING ERRCODE='22023';
    END IF;
    BEGIN
      v_qty:=floor(coalesce(nullif(v_line->>'quantity','')::numeric,nullif(v_line->>'qty','')::numeric,1));
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Please enter a valid quantity.' USING ERRCODE='22023';
    END;
    IF v_qty<1 OR v_qty>1000 THEN RAISE EXCEPTION 'Please enter a valid quantity.' USING ERRCODE='22023'; END IF;
    v_subtotal:=v_subtotal+(v_product.price*v_qty);
  END LOOP;

  IF v_coupon_code<>'' THEN
    v_coupon_quote:=private.evaluate_coupon(v_coupon_code,v_item_rows,v_phone,true);
    IF coalesce((v_coupon_quote->>'valid')::boolean,false) IS NOT TRUE THEN
      RAISE EXCEPTION 'Coupon: %',coalesce(v_coupon_quote->>'message','This coupon is invalid or unavailable.') USING ERRCODE='22023';
    END IF;
    v_coupon_id:=(v_coupon_quote->>'couponId')::uuid;
    v_coupon_discount:=coalesce((v_coupon_quote->>'discountAmount')::numeric,0);
    v_coupon_snapshot:=v_coupon_quote-'valid'-'message';
    IF v_coupon_discount<=0 OR v_coupon_discount>v_subtotal THEN
      RAISE EXCEPTION 'Coupon: This coupon cannot be applied to this order.' USING ERRCODE='22023';
    END IF;
  END IF;

  v_total:=greatest(0,v_subtotal-v_coupon_discount)+v_delivery;
  INSERT INTO public.orders(
    order_number,customer_id,customer_name,customer_phone,customer_email,delivery_address,
    subtotal,delivery_charge,total,delivery_zone,payment_method,currency,status,source,notes,ordered_at,
    coupon_id,coupon_code,coupon_discount_amount,coupon_snapshot
  ) VALUES(
    v_order_number,v_customer_id,v_name,v_phone,v_email,v_address,
    v_subtotal,v_delivery,v_total,v_zone,'cash_on_delivery','BDT','pending','website_parallel',v_notes,now(),
    v_coupon_id,nullif(v_coupon_code,''),v_coupon_discount,v_coupon_snapshot
  ) RETURNING id INTO v_order_id;

  IF v_coupon_id IS NOT NULL THEN
    INSERT INTO public.coupon_redemptions(
      coupon_id,order_id,order_number,customer_phone,discount_amount,status
    ) VALUES(
      v_coupon_id,v_order_id,coalesce(v_order_number,'ORDER-'||v_order_id::text),v_phone,v_coupon_discount,'reserved'
    );
  END IF;

  PERFORM set_config('app.inventory_system_update','on',true);
  FOR v_line IN SELECT value FROM jsonb_array_elements(v_item_rows) LOOP
    SELECT * INTO v_product FROM public.products
    WHERE is_active=true AND (
      lower(name)=lower(left(trim(coalesce(v_line->>'product',v_line->>'name',v_line->>'slug','')),120))
      OR lower(slug)=lower(left(trim(coalesce(v_line->>'product',v_line->>'name',v_line->>'slug','')),120))
    ) LIMIT 1 FOR UPDATE;
    v_qty:=floor(coalesce(nullif(v_line->>'quantity','')::numeric,nullif(v_line->>'qty','')::numeric,1));
    IF v_product.stock_quantity IS NOT NULL THEN
      v_before:=v_product.stock_quantity;
      IF v_before<v_qty THEN RAISE EXCEPTION 'Not enough stock for %.',v_product.name USING ERRCODE='22023'; END IF;
      v_after:=v_before-v_qty;
      UPDATE public.products SET stock_quantity=v_after,updated_at=now() WHERE id=v_product.id;
      INSERT INTO public.inventory_movements(product_id,movement_type,quantity_delta,stock_before,stock_after,order_id,reason,created_by)
      VALUES(v_product.id,'order_reserve',-v_qty,v_before,v_after,v_order_id,'Stock reserved for website order '||coalesce(v_order_number,v_order_id::text),'order-sync');
    END IF;
    INSERT INTO public.order_items(order_id,product_id,product_name,quantity,unit,unit_price,line_total,product_image_url,shipping_weight_kg)
    VALUES(
      v_order_id,v_product.id,v_product.name,v_qty,v_product.unit_type,v_product.price,v_product.price*v_qty,
      CASE WHEN coalesce(v_line->>'image',v_line->>'imageUrl','') ~ '^images/[A-Za-z0-9_./-]+$'
           THEN coalesce(v_line->>'image',v_line->>'imageUrl') ELSE v_product.image_url END,
      v_product.shipping_weight_kg
    );
  END LOOP;

  SELECT total,subtotal INTO v_total,v_subtotal FROM public.orders WHERE id=v_order_id;
  RETURN jsonb_build_object(
    'success',true,'duplicate',false,'orderId',v_order_number,'subtotal',v_subtotal,
    'deliveryCharge',v_delivery,'deliveryZone',v_zone,'paymentMethod','cash_on_delivery',
    'couponCode',nullif(v_coupon_code,''),'couponDiscount',v_coupon_discount,
    'total',v_total,'orderTotal',v_total
  );
END
$website_order$;

REVOKE ALL ON FUNCTION public.create_website_order(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_website_order(jsonb) TO service_role;

COMMENT ON TABLE public.coupons IS 'Admin-managed coupon campaigns. Checkout applies discounts only through the atomic server order transaction.';
COMMENT ON TABLE public.coupon_redemptions IS 'Reserved, redeemed and released coupon uses linked to authoritative orders.';
COMMENT ON COLUMN public.orders.coupon_snapshot IS 'Immutable coupon rule snapshot at order placement; preserves historical pricing when a campaign is edited.';
