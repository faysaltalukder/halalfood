-- Create a manually confirmed delivery order from the POS workspace.
-- Order, line items, inventory reservation, finance entry and optional courier parcel
-- are committed together. External courier booking is performed only after this RPC
-- returns successfully, so a failed API call never removes the saved customer order.

CREATE OR REPLACE FUNCTION public.create_manual_delivery_order(p_order jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_aal text := coalesce(auth.jwt() ->> 'aal', 'aal1');
  v_reference text;
  v_order_number text;
  v_channel text;
  v_source text;
  v_customer_name text;
  v_customer_phone text;
  v_delivery_address text;
  v_delivery_charge numeric := 0;
  v_payment_method text;
  v_payment_received boolean := false;
  v_notes text;
  v_items jsonb;
  v_line jsonb;
  v_product public.products%ROWTYPE;
  v_quantity numeric;
  v_unit_price numeric;
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_order_id uuid;
  v_customer_id uuid;
  v_existing public.orders%ROWTYPE;
  v_stock_before numeric;
  v_stock_after numeric;
  v_item_count integer := 0;
  v_finance_status text;
  v_courier_provider text;
  v_courier_name text;
  v_parcel_weight numeric;
  v_courier_fee numeric := 0;
  v_redx_area_id bigint;
  v_redx_area_name text;
  v_redx_district text;
  v_shipment_id uuid;
  v_provider_response jsonb := '{}'::jsonb;
  v_now timestamptz := now();
BEGIN
  IF v_email <> 'halalfoodbd.official@gmail.com' OR v_aal <> 'aal2' THEN
    RAISE EXCEPTION 'Halal Food administrator access with completed MFA is required.'
      USING ERRCODE = '42501';
  END IF;

  IF p_order IS NULL OR jsonb_typeof(p_order) <> 'object' THEN
    RAISE EXCEPTION 'A valid manual delivery order is required.' USING ERRCODE = '22023';
  END IF;

  v_reference := upper(trim(coalesce(p_order ->> 'order_reference', '')));
  IF v_reference !~ '^[A-Z0-9][A-Z0-9_-]{0,39}$' THEN
    RAISE EXCEPTION 'The internal order reference is invalid.' USING ERRCODE = '22023';
  END IF;
  v_order_number := 'HF-MD-' || v_reference;

  -- Repeated requests after a network timeout return the same saved order.
  PERFORM pg_advisory_xact_lock(hashtext(v_order_number));
  SELECT * INTO v_existing
  FROM public.orders
  WHERE order_number = v_order_number
  LIMIT 1;
  IF FOUND THEN
    IF v_existing.source IN ('manual_whatsapp', 'manual_phone', 'manual_facebook', 'manual_other') THEN
      SELECT id INTO v_shipment_id
      FROM public.admin_shipments
      WHERE order_id = v_existing.id
      LIMIT 1;
      RETURN jsonb_build_object(
        'success', true,
        'duplicate', true,
        'orderId', v_existing.id,
        'orderNumber', v_existing.order_number,
        'total', v_existing.total,
        'shipmentId', v_shipment_id
      );
    END IF;
    RAISE EXCEPTION 'The generated order reference conflicts with another order.'
      USING ERRCODE = '23505';
  END IF;

  v_channel := lower(trim(coalesce(p_order ->> 'order_channel', '')));
  IF v_channel NOT IN ('whatsapp', 'phone', 'facebook', 'other') THEN
    RAISE EXCEPTION 'Choose whether the customer confirmed by WhatsApp, phone, Facebook or another channel.'
      USING ERRCODE = '22023';
  END IF;
  v_source := 'manual_' || v_channel;

  v_customer_name := left(trim(coalesce(p_order ->> 'customer_name', '')), 80);
  IF length(v_customer_name) < 2 THEN
    RAISE EXCEPTION 'Enter the customer name.' USING ERRCODE = '22023';
  END IF;

  v_customer_phone := regexp_replace(coalesce(p_order ->> 'customer_phone', ''), '[^0-9]', '', 'g');
  IF left(v_customer_phone, 5) = '00880' THEN
    v_customer_phone := '0' || substr(v_customer_phone, 6);
  ELSIF left(v_customer_phone, 3) = '880' THEN
    v_customer_phone := '0' || substr(v_customer_phone, 4);
  END IF;
  IF v_customer_phone !~ '^01[0-9]{9}$' THEN
    RAISE EXCEPTION 'Enter a valid 11-digit Bangladesh mobile number.'
      USING ERRCODE = '22023';
  END IF;

  v_delivery_address := left(trim(coalesce(p_order ->> 'delivery_address', '')), 250);
  IF length(v_delivery_address) < 10 THEN
    RAISE EXCEPTION 'Enter a complete delivery address including area/upazila and district.'
      USING ERRCODE = '22023';
  END IF;

  BEGIN
    v_delivery_charge := coalesce(nullif(p_order ->> 'delivery_charge', '')::numeric, 0);
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Delivery charge must be a valid amount.' USING ERRCODE = '22023';
  END;
  IF v_delivery_charge < 0 OR v_delivery_charge > 100000 THEN
    RAISE EXCEPTION 'Delivery charge must be between 0 and 100,000 BDT.'
      USING ERRCODE = '22023';
  END IF;

  v_payment_method := lower(trim(coalesce(p_order ->> 'payment_method', 'cash_on_delivery')));
  IF v_payment_method NOT IN ('cash', 'mobile_banking', 'bank_transfer', 'cash_on_delivery', 'other') THEN
    RAISE EXCEPTION 'Unsupported payment method for a delivery order.'
      USING ERRCODE = '22023';
  END IF;
  BEGIN
    v_payment_received := coalesce(nullif(p_order ->> 'payment_received', '')::boolean, false);
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Payment received must be a true/false value.' USING ERRCODE = '22023';
  END;
  IF v_payment_method = 'cash_on_delivery' AND v_payment_received THEN
    RAISE EXCEPTION 'A Cash on Delivery order cannot be marked as already paid.'
      USING ERRCODE = '22023';
  END IF;

  v_notes := left(trim(coalesce(p_order ->> 'notes', '')), 500);

  v_items := p_order -> 'items';
  IF jsonb_typeof(v_items) <> 'array'
     OR jsonb_array_length(v_items) < 1
     OR jsonb_array_length(v_items) > 30 THEN
    RAISE EXCEPTION 'A delivery order must contain between 1 and 30 product lines.'
      USING ERRCODE = '22023';
  END IF;

  v_courier_provider := lower(trim(coalesce(p_order ->> 'courier_provider', '')));
  IF v_courier_provider NOT IN ('', 'steadfast', 'pathao', 'redx') THEN
    RAISE EXCEPTION 'Choose Steadfast, Pathao, REDX or no courier.'
      USING ERRCODE = '22023';
  END IF;
  IF v_courier_provider <> '' AND (v_payment_method <> 'cash_on_delivery' OR v_payment_received) THEN
    RAISE EXCEPTION 'The connected courier booking currently supports unpaid Cash on Delivery orders only.'
      USING ERRCODE = '22023';
  END IF;

  v_parcel_weight := nullif(trim(coalesce(p_order ->> 'parcel_weight_kg', '')), '')::numeric;
  v_courier_fee := coalesce(nullif(p_order ->> 'courier_fee', '')::numeric, 0);
  IF v_courier_fee < 0 OR v_courier_fee > 100000 THEN
    RAISE EXCEPTION 'Courier fee must be between 0 and 100,000 BDT.'
      USING ERRCODE = '22023';
  END IF;
  IF v_courier_provider = 'pathao' AND (v_parcel_weight IS NULL OR v_parcel_weight < 0.5 OR v_parcel_weight > 10) THEN
    RAISE EXCEPTION 'Pathao requires a packed parcel weight between 0.5 kg and 10 kg.'
      USING ERRCODE = '22023';
  END IF;
  IF v_courier_provider = 'redx' AND (v_parcel_weight IS NULL OR v_parcel_weight < 0.1 OR v_parcel_weight > 10) THEN
    RAISE EXCEPTION 'REDX requires a packed parcel weight between 0.1 kg and 10 kg.'
      USING ERRCODE = '22023';
  END IF;
  IF v_parcel_weight IS NOT NULL AND (v_parcel_weight <= 0 OR v_parcel_weight > 100) THEN
    RAISE EXCEPTION 'Packed parcel weight must be greater than zero and no more than 100 kg.'
      USING ERRCODE = '22023';
  END IF;

  IF v_courier_provider = 'redx' THEN
    BEGIN
      v_redx_area_id := (p_order ->> 'redx_delivery_area_id')::bigint;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Select the exact REDX delivery area before saving this parcel.'
        USING ERRCODE = '22023';
    END;
    v_redx_area_name := left(trim(coalesce(p_order ->> 'redx_delivery_area', '')), 120);
    v_redx_district := left(trim(coalesce(p_order ->> 'redx_delivery_district', '')), 80);
    IF v_redx_area_id IS NULL OR v_redx_area_id <= 0 OR v_redx_area_name = '' OR length(v_redx_district) < 2
       OR coalesce((p_order ->> 'redx_sandbox_test_area')::boolean, false)
       OR lower(v_redx_area_name) IN ('test area', 'test district') THEN
      RAISE EXCEPTION 'Choose a real REDX Production area matching the customer address. Sandbox test areas cannot be used for customer deliveries.'
        USING ERRCODE = '22023';
    END IF;
    v_provider_response := jsonb_build_object(
      'redx_delivery_area_id', v_redx_area_id,
      'redx_delivery_area', v_redx_area_name,
      'redx_delivery_district', v_redx_district,
      'redx_sandbox_test_area', false
    );
  END IF;

  -- Validate all product lines and compute the order subtotal before writing.
  FOR v_line IN SELECT value FROM jsonb_array_elements(v_items) LOOP
    v_item_count := v_item_count + 1;
    IF length(trim(coalesce(v_line ->> 'product_slug', ''))) = 0 THEN
      RAISE EXCEPTION 'Every delivery order line must reference a product.' USING ERRCODE = '22023';
    END IF;
    BEGIN
      v_quantity := (v_line ->> 'quantity')::numeric;
      v_unit_price := (v_line ->> 'unit_price')::numeric;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Product quantity and selling price must be valid numbers.' USING ERRCODE = '22023';
    END;
    IF v_quantity <= 0 OR v_quantity > 1000 OR round(v_quantity, 3) <> v_quantity THEN
      RAISE EXCEPTION 'Product quantity must be greater than zero, at most 1,000 and use no more than three decimal places.'
        USING ERRCODE = '22023';
    END IF;
    IF v_unit_price <= 0 OR v_unit_price > 1000000 THEN
      RAISE EXCEPTION 'Selling price must be greater than zero and no more than 1,000,000 BDT.'
        USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_product
    FROM public.products
    WHERE is_active = true AND lower(slug) = lower(trim(v_line ->> 'product_slug'))
    LIMIT 1
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'An active product was not found: %', left(trim(v_line ->> 'product_slug'), 90)
        USING ERRCODE = '22023';
    END IF;
    IF lower(v_product.unit_type) NOT IN ('kg', 'liter') AND v_quantity <> floor(v_quantity) THEN
      RAISE EXCEPTION 'Packaged products and pieces must use a whole-number quantity.'
        USING ERRCODE = '22023';
    END IF;
    v_subtotal := v_subtotal + (v_quantity * v_unit_price);
  END LOOP;

  v_total := v_subtotal + v_delivery_charge;
  IF v_subtotal <= 0 OR v_total <= 0 OR v_total > 1000000000 THEN
    RAISE EXCEPTION 'The delivery order total is outside the allowed range.'
      USING ERRCODE = '22023';
  END IF;

  -- Reuse a known customer by phone; the order itself always keeps the exact address
  -- supplied for this delivery, without overwriting the customer's previous address.
  PERFORM pg_advisory_xact_lock(hashtext('customer:' || v_customer_phone));
  SELECT id INTO v_customer_id
  FROM public.customers
  WHERE phone = v_customer_phone
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE;
  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers(name, phone, address)
    VALUES(v_customer_name, v_customer_phone, v_delivery_address)
    RETURNING id INTO v_customer_id;
  END IF;

  INSERT INTO public.orders(
    order_number, customer_id, customer_name, customer_phone, customer_email,
    delivery_address, subtotal, delivery_charge, total, currency, status,
    source, notes, ordered_at, payment_method
  )
  VALUES(
    v_order_number, v_customer_id, v_customer_name, v_customer_phone, null,
    v_delivery_address, v_subtotal, v_delivery_charge, v_total, 'BDT', 'processing',
    v_source,
    left('Manually confirmed via ' || initcap(v_channel) || '. ' || v_notes, 500),
    v_now,
    v_payment_method
  )
  RETURNING id INTO v_order_id;

  -- Reserve the tracked products exactly like a website order. The existing order
  -- cancellation trigger releases these order_reserve movements automatically.
  PERFORM set_config('app.inventory_system_update', 'on', true);
  FOR v_line IN SELECT value FROM jsonb_array_elements(v_items) LOOP
    SELECT * INTO v_product
    FROM public.products
    WHERE is_active = true AND lower(slug) = lower(trim(v_line ->> 'product_slug'))
    LIMIT 1
    FOR UPDATE;

    v_quantity := (v_line ->> 'quantity')::numeric;
    v_unit_price := (v_line ->> 'unit_price')::numeric;

    IF v_product.stock_quantity IS NOT NULL THEN
      v_stock_before := v_product.stock_quantity;
      IF v_stock_before < v_quantity THEN
        RAISE EXCEPTION 'Not enough stock for %. Available: %, requested: %.',
          v_product.name, v_stock_before, v_quantity USING ERRCODE = '22023';
      END IF;
      v_stock_after := v_stock_before - v_quantity;
      UPDATE public.products
      SET stock_quantity = v_stock_after, updated_at = now()
      WHERE id = v_product.id;

      INSERT INTO public.inventory_movements(
        product_id, movement_type, quantity_delta, stock_before, stock_after,
        order_id, reason, created_by
      )
      VALUES(
        v_product.id, 'order_reserve', -v_quantity, v_stock_before, v_stock_after,
        v_order_id, 'Stock reserved for manual delivery order ' || v_order_number, v_email
      );
    END IF;

    INSERT INTO public.order_items(
      order_id, product_id, product_name, quantity, unit, unit_price,
      line_total, product_image_url, shipping_weight_kg
    )
    VALUES(
      v_order_id, v_product.id, v_product.name, v_quantity, v_product.unit_type,
      v_unit_price, (v_unit_price * v_quantity), v_product.image_url,
      v_product.shipping_weight_kg
    );
  END LOOP;

  -- Paid orders enter confirmed income. COD/unpaid orders remain draft until real
  -- collection is reconciled in Finance; an order value is not cash received.
  v_finance_status := CASE WHEN v_payment_received THEN 'confirmed' ELSE 'draft' END;
  INSERT INTO public.admin_finance_entries(
    entry_type, category, amount, entry_date, description, reference,
    status, related_order_id, created_by
  )
  VALUES(
    'income', 'Manual Delivery Order', v_total,
    (timezone('Asia/Dhaka', v_now))::date,
    'Manual delivery order ' || v_order_number ||
      CASE WHEN v_payment_received THEN ' — payment marked received.'
           ELSE ' — payment not received; pending collection.' END,
    v_order_number, v_finance_status, v_order_id, v_email
  );

  -- Save the courier parcel in the same transaction as the order. The actual
  -- external API request is a separate, explicit client action after this commit.
  IF v_courier_provider <> '' THEN
    v_courier_name := CASE v_courier_provider
      WHEN 'steadfast' THEN 'Steadfast'
      WHEN 'pathao' THEN 'Pathao'
      WHEN 'redx' THEN 'REDX'
    END;
    INSERT INTO public.admin_shipments(
      order_id, courier_name, shipment_status, integration_mode,
      cod_amount, courier_fee, settlement_status, settled_amount,
      parcel_weight_kg, parcel_notes, booking_state, provider_response,
      created_by, updated_by
    )
    VALUES(
      v_order_id, v_courier_name, 'ready_for_pickup', 'api_ready',
      v_total, v_courier_fee, 'pending', 0,
      v_parcel_weight, v_notes, 'not_started', v_provider_response,
      v_email, v_email
    )
    RETURNING id INTO v_shipment_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'orderId', v_order_id,
    'orderNumber', v_order_number,
    'total', v_total,
    'subtotal', v_subtotal,
    'deliveryCharge', v_delivery_charge,
    'itemsCount', v_item_count,
    'financeStatus', v_finance_status,
    'shipmentId', v_shipment_id,
    'courierProvider', v_courier_provider
  );
END;
$function$;

COMMENT ON FUNCTION public.create_manual_delivery_order(jsonb) IS
  'MFA-gated SECURITY INVOKER RPC for WhatsApp/phone/Facebook delivery orders created from POS. Atomically writes order, product lines, order_reserve inventory movements, linked confirmed/draft finance entry and optional API-ready courier parcel. External courier booking is a separate explicit action.';

REVOKE ALL ON FUNCTION public.create_manual_delivery_order(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_manual_delivery_order(jsonb) TO authenticated;
