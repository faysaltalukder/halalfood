-- Idempotent checkout submission and safe order-number collision handling.
-- Existing order history is preserved; this adds nullable metadata and a partial unique index.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS checkout_session_id uuid,
  ADD COLUMN IF NOT EXISTS checkout_request_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS orders_checkout_session_id_uidx
  ON public.orders(checkout_session_id)
  WHERE checkout_session_id IS NOT NULL;

DO $patch$
DECLARE
  v_definition text;
  v_patched text;
  v_old_declaration text := '  v_existing public.orders%ROWTYPE;';
  v_new_declaration text := '  v_existing public.orders%ROWTYPE;
  v_checkout_session_id uuid;
  v_request_hash text;
  v_attempt integer;';
  v_old_validation text := '  IF jsonb_typeof(v_item_rows)<>''array'' OR jsonb_array_length(v_item_rows)=0 OR jsonb_array_length(v_item_rows)>30 THEN
    RAISE EXCEPTION ''Please add between 1 and 30 order items.'' USING ERRCODE=''22023'';
  END IF;';
  v_new_validation text := '  IF jsonb_typeof(v_item_rows)<>''array'' OR jsonb_array_length(v_item_rows)=0 OR jsonb_array_length(v_item_rows)>30 THEN
    RAISE EXCEPTION ''Please add between 1 and 30 order items.'' USING ERRCODE=''22023'';
  END IF;

  BEGIN
    v_checkout_session_id := nullif(p_order->>''checkoutSessionId'','''')::uuid;
  EXCEPTION WHEN others THEN
    v_checkout_session_id := NULL;
  END;
  v_request_hash := pg_catalog.md5((p_order - ''orderId'' - ''checkoutSessionId'')::text);

  IF v_checkout_session_id IS NOT NULL THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(''checkout:'' || v_checkout_session_id::text));
    SELECT * INTO v_existing
    FROM public.orders
    WHERE checkout_session_id=v_checkout_session_id
    LIMIT 1
    FOR UPDATE;
    IF FOUND THEN
      IF v_existing.checkout_request_hash=v_request_hash
         AND v_existing.customer_phone=v_phone THEN
        RETURN jsonb_build_object(
          ''success'',true,''duplicate'',true,''orderId'',v_existing.order_number,
          ''subtotal'',v_existing.subtotal,''deliveryCharge'',v_existing.delivery_charge,
          ''couponCode'',v_existing.coupon_code,''couponDiscount'',v_existing.coupon_discount_amount,
          ''total'',v_existing.total,''orderTotal'',v_existing.total
        );
      END IF;
      RAISE EXCEPTION ''This checkout session was already used with different order details. Refresh checkout and try again.'' USING ERRCODE=''23505'';
    END IF;
  END IF;';
  v_old_order_block text := '  IF v_order_number IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext(v_order_number));
    SELECT * INTO v_existing FROM public.orders WHERE order_number=v_order_number LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object(
        ''success'',true,''duplicate'',true,''orderId'',v_existing.order_number,
        ''subtotal'',v_existing.subtotal,''deliveryCharge'',v_existing.delivery_charge,
        ''couponCode'',v_existing.coupon_code,''couponDiscount'',v_existing.coupon_discount_amount,
        ''total'',v_existing.total,''orderTotal'',v_existing.total
      );
    END IF;
  END IF;';
  v_new_order_block text := '  IF v_order_number IS NOT NULL THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(''order:'' || v_order_number));
    SELECT * INTO v_existing FROM public.orders WHERE order_number=v_order_number LIMIT 1;
    IF FOUND THEN
      -- Preserve retry idempotency for legacy orders created before checkout_session_id existed.
      IF v_existing.checkout_session_id IS NULL
         AND v_existing.customer_phone=v_phone
         AND v_existing.customer_name=v_name
         AND v_existing.delivery_address=v_address
         AND v_existing.delivery_zone=v_zone
         AND v_existing.coupon_code IS NOT DISTINCT FROM nullif(v_coupon_code,'''')
         AND (SELECT count(*) FROM public.order_items WHERE order_id=v_existing.id)=jsonb_array_length(v_item_rows)
         AND NOT EXISTS (
           SELECT 1
           FROM jsonb_array_elements(v_item_rows) AS incoming(item)
           WHERE NOT EXISTS (
             SELECT 1
             FROM public.order_items oi
             WHERE oi.order_id=v_existing.id
               AND oi.quantity::text=coalesce(nullif(incoming.item->>''quantity'',''''),nullif(incoming.item->>''qty'',''''),''1'')
               AND (
                 lower(oi.product_name)=lower(left(trim(coalesce(incoming.item->>''product'',incoming.item->>''name'',incoming.item->>''slug'','''')),120))
                 OR EXISTS (
                   SELECT 1 FROM public.products p
                   WHERE p.id=oi.product_id
                     AND lower(p.slug)=lower(left(trim(coalesce(incoming.item->>''product'',incoming.item->>''name'',incoming.item->>''slug'','''')),120))
                 )
               )
           )
         ) THEN
        RETURN jsonb_build_object(
          ''success'',true,''duplicate'',true,''orderId'',v_existing.order_number,
          ''subtotal'',v_existing.subtotal,''deliveryCharge'',v_existing.delivery_charge,
          ''couponCode'',v_existing.coupon_code,''couponDiscount'',v_existing.coupon_discount_amount,
          ''total'',v_existing.total,''orderTotal'',v_existing.total
        );
      END IF;

      -- A six-digit public reference is not an idempotency key. If it collides with
      -- another order, allocate a fresh unused reference instead of returning that order.
      v_order_number := NULL;
      FOR v_attempt IN 1..30 LOOP
        v_order_number := ''HF-'' || (pg_catalog.floor(pg_catalog.random()*900000)+100000)::bigint::text;
        PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(''order:'' || v_order_number));
        IF NOT EXISTS (SELECT 1 FROM public.orders WHERE order_number=v_order_number) THEN
          EXIT;
        END IF;
        v_order_number := NULL;
      END LOOP;
      IF v_order_number IS NULL THEN
        RAISE EXCEPTION ''Could not allocate a unique order reference. Please retry.'' USING ERRCODE=''23505'';
      END IF;
    END IF;
  END IF;';
  v_old_insert text := '    coupon_id,coupon_code,coupon_discount_amount,coupon_snapshot
  ) VALUES(
    v_order_number,v_customer_id,v_name,v_phone,v_email,v_address,
    v_subtotal,v_delivery,v_total,v_zone,''cash_on_delivery'',''BDT'',''pending'',''website_parallel'',v_notes,now(),
    v_coupon_id,nullif(v_coupon_code,''''),v_coupon_discount,v_coupon_snapshot
  ) RETURNING id INTO v_order_id;';
  v_new_insert text := '    coupon_id,coupon_code,coupon_discount_amount,coupon_snapshot,checkout_session_id,checkout_request_hash
  ) VALUES(
    v_order_number,v_customer_id,v_name,v_phone,v_email,v_address,
    v_subtotal,v_delivery,v_total,v_zone,''cash_on_delivery'',''BDT'',''pending'',''website_parallel'',v_notes,now(),
    v_coupon_id,nullif(v_coupon_code,''''),v_coupon_discount,v_coupon_snapshot,v_checkout_session_id,v_request_hash
  ) RETURNING id INTO v_order_id;';
BEGIN
  SELECT pg_catalog.pg_get_functiondef('public.create_website_order(jsonb)'::regprocedure)
    INTO v_definition;

  IF position('checkout_session_id' IN v_definition)>0 THEN
    RETURN;
  END IF;
  IF position(v_old_declaration IN v_definition)=0
     OR position(v_old_validation IN v_definition)=0
     OR position(v_old_order_block IN v_definition)=0
     OR position(v_old_insert IN v_definition)=0 THEN
    RAISE EXCEPTION ''create_website_order() no longer matches the audited source; refusing an unsafe automatic patch.'';
  END IF;

  v_patched := pg_catalog.replace(v_definition,v_old_declaration,v_new_declaration);
  v_patched := pg_catalog.replace(v_patched,v_old_validation,v_new_validation);
  v_patched := pg_catalog.replace(v_patched,v_old_order_block,v_new_order_block);
  v_patched := pg_catalog.replace(v_patched,v_old_insert,v_new_insert);

  IF v_patched=v_definition
     OR position('v_checkout_session_id' IN v_patched)=0
     OR position('v_request_hash' IN v_patched)=0
     OR position('v_order_number := NULL' IN v_patched)=0
     OR position('checkout_session_id,checkout_request_hash' IN v_patched)=0 THEN
    RAISE EXCEPTION ''The checkout idempotency patch did not apply completely; transaction aborted.'';
  END IF;
  EXECUTE v_patched;
END
$patch$;

REVOKE ALL ON FUNCTION public.create_website_order(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_website_order(jsonb) TO service_role;

COMMENT ON COLUMN public.orders.checkout_session_id IS
  'Unique browser/chat checkout session used to make retries idempotent without trusting the public order number.';
COMMENT ON COLUMN public.orders.checkout_request_hash IS
  'Server-side hash of normalized checkout payload (excluding public order number and session ID) for retry verification.';
