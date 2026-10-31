-- Applied to Supabase as migration 20261031044407_create_offline_pos_sales.
-- Offline POS sales use the central Orders, Inventory and Finance ledgers.
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method = ANY (ARRAY[
    'cash'::text, 'mobile_banking'::text, 'bank_transfer'::text,
    'cash_on_delivery'::text, 'other'::text
  ]));

ALTER TABLE public.inventory_movements
  DROP CONSTRAINT IF EXISTS inventory_movements_movement_type_check;
ALTER TABLE public.inventory_movements
  ADD CONSTRAINT inventory_movements_movement_type_check
  CHECK (movement_type = ANY (ARRAY[
    'opening_balance'::text, 'receipt'::text, 'adjustment_increase'::text,
    'adjustment_decrease'::text, 'order_reserve'::text,
    'order_cancel_release'::text, 'pos_sale'::text
  ]));

COMMENT ON COLUMN public.orders.source IS
  'Order origin, including website and offline_pos. Offline POS imports are regular order records, not website conversion events.';

CREATE OR REPLACE FUNCTION public.create_offline_pos_sale(p_sale jsonb)
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
  v_sale_date date;
  v_sale_time time;
  v_customer_name text;
  v_customer_phone text;
  v_customer_email text;
  v_payment_method text;
  v_payment_received boolean;
  v_adjust_stock boolean;
  v_notes text;
  v_items jsonb;
  v_line jsonb;
  v_product public.products%ROWTYPE;
  v_quantity numeric;
  v_unit_price numeric;
  v_subtotal numeric := 0;
  v_order_id uuid;
  v_customer_id uuid;
  v_existing public.orders%ROWTYPE;
  v_stock_before numeric;
  v_stock_after numeric;
  v_stock_lines integer := 0;
  v_item_count integer := 0;
  v_finance_status text;
BEGIN
  IF v_email <> 'halalfoodbd.official@gmail.com' OR v_aal <> 'aal2' THEN
    RAISE EXCEPTION 'Halal Food administrator access with completed MFA is required.'
      USING ERRCODE = '42501';
  END IF;
  IF p_sale IS NULL OR jsonb_typeof(p_sale) <> 'object' THEN
    RAISE EXCEPTION 'A valid offline sale object is required.' USING ERRCODE = '22023';
  END IF;

  v_reference := upper(trim(coalesce(p_sale ->> 'sale_reference', '')));
  IF v_reference !~ '^[A-Z0-9][A-Z0-9_-]{0,49}$' THEN
    RAISE EXCEPTION 'Sale reference must contain 1–50 letters, numbers, hyphens or underscores.'
      USING ERRCODE = '22023';
  END IF;
  v_order_number := 'POS-' || v_reference;
  PERFORM pg_advisory_xact_lock(hashtext(v_order_number));
  SELECT * INTO v_existing FROM public.orders WHERE order_number = v_order_number LIMIT 1;
  IF FOUND THEN
    IF v_existing.source = 'offline_pos' THEN
      RETURN jsonb_build_object(
        'success', true, 'duplicate', true, 'orderId', v_existing.id,
        'orderNumber', v_existing.order_number, 'total', v_existing.total,
        'itemsCount', (SELECT count(*) FROM public.order_items WHERE order_id = v_existing.id)
      );
    END IF;
    RAISE EXCEPTION 'Sale reference % conflicts with an existing non-POS order number.', v_reference
      USING ERRCODE = '23505';
  END IF;

  BEGIN
    v_sale_date := (p_sale ->> 'sale_date')::date;
    v_sale_time := coalesce(nullif(p_sale ->> 'sale_time', '')::time, time '12:00');
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Sale date must be YYYY-MM-DD and sale time must be HH:MM.' USING ERRCODE = '22023';
  END;
  IF (v_sale_date::timestamp + v_sale_time) > timezone('Asia/Dhaka', now()) THEN
    RAISE EXCEPTION 'Sale date and time cannot be in the future.' USING ERRCODE = '22023';
  END IF;

  v_customer_name := left(trim(coalesce(p_sale ->> 'customer_name', '')), 80);
  IF v_customer_name = '' THEN v_customer_name := 'Walk-in Customer'; END IF;
  v_customer_phone := regexp_replace(coalesce(p_sale ->> 'customer_phone', ''), '[^0-9]', '', 'g');
  IF left(v_customer_phone, 5) = '00880' THEN
    v_customer_phone := '0' || substr(v_customer_phone, 6);
  ELSIF left(v_customer_phone, 3) = '880' THEN
    v_customer_phone := '0' || substr(v_customer_phone, 4);
  END IF;
  IF v_customer_phone <> '' AND v_customer_phone !~ '^01[0-9]{9}$' THEN
    RAISE EXCEPTION 'Customer phone must be a valid Bangladesh mobile number or left blank.'
      USING ERRCODE = '22023';
  END IF;
  IF v_customer_phone = '' THEN v_customer_phone := 'Not provided'; END IF;

  v_customer_email := nullif(left(trim(coalesce(p_sale ->> 'customer_email', '')), 120), '');
  IF v_customer_email IS NOT NULL
     AND v_customer_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Customer email is not valid.' USING ERRCODE = '22023';
  END IF;
  v_payment_method := lower(trim(coalesce(p_sale ->> 'payment_method', 'cash')));
  IF v_payment_method NOT IN ('cash', 'mobile_banking', 'bank_transfer', 'cash_on_delivery', 'other') THEN
    RAISE EXCEPTION 'Unsupported payment method for an offline sale.' USING ERRCODE = '22023';
  END IF;
  BEGIN
    v_payment_received := coalesce(nullif(p_sale ->> 'payment_received', '')::boolean, true);
    v_adjust_stock := coalesce(nullif(p_sale ->> 'adjust_stock', '')::boolean, true);
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Payment received and stock adjustment must be true/false values.'
      USING ERRCODE = '22023';
  END;

  v_notes := left(trim(coalesce(p_sale ->> 'notes', '')), 500);
  v_items := p_sale -> 'items';
  IF jsonb_typeof(v_items) <> 'array'
     OR jsonb_array_length(v_items) < 1
     OR jsonb_array_length(v_items) > 100 THEN
    RAISE EXCEPTION 'An offline sale must contain between 1 and 100 items.' USING ERRCODE = '22023';
  END IF;

  -- Validate all products and prices before any writes.
  FOR v_line IN SELECT value FROM jsonb_array_elements(v_items) LOOP
    v_item_count := v_item_count + 1;
    IF length(trim(coalesce(v_line ->> 'product_slug', ''))) = 0 THEN
      RAISE EXCEPTION 'Every item must include a product slug.' USING ERRCODE = '22023';
    END IF;
    BEGIN
      v_quantity := (v_line ->> 'quantity')::numeric;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Item quantity must be a valid number.' USING ERRCODE = '22023';
    END;
    IF v_quantity <= 0 OR v_quantity > 1000 OR round(v_quantity, 3) <> v_quantity THEN
      RAISE EXCEPTION 'Item quantity must be greater than zero, at most 1,000, and use no more than three decimal places.' USING ERRCODE = '22023';
    END IF;
    SELECT * INTO v_product
    FROM public.products
    WHERE lower(slug) = lower(trim(v_line ->> 'product_slug'))
    LIMIT 1
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product slug not found: %', left(trim(v_line ->> 'product_slug'), 90)
        USING ERRCODE = '22023';
    END IF;
    IF lower(v_product.unit_type) NOT IN ('kg', 'liter') AND v_quantity <> floor(v_quantity) THEN
      RAISE EXCEPTION 'Packaged products and pieces must use a whole-number quantity.' USING ERRCODE = '22023';
    END IF;
    IF nullif(trim(coalesce(v_line ->> 'unit_price', '')), '') IS NULL THEN
      v_unit_price := v_product.price;
    ELSE
      BEGIN
        v_unit_price := (v_line ->> 'unit_price')::numeric;
      EXCEPTION WHEN others THEN
        RAISE EXCEPTION 'Unit price must be a valid number.' USING ERRCODE = '22023';
      END;
    END IF;
    IF v_unit_price < 0 OR v_unit_price > 1000000 THEN
      RAISE EXCEPTION 'Unit price must be between 0 and 1,000,000 BDT.' USING ERRCODE = '22023';
    END IF;
    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
  END LOOP;
  IF v_subtotal <= 0 THEN
    RAISE EXCEPTION 'The sale total must be greater than zero.' USING ERRCODE = '22023';
  END IF;

  IF v_customer_phone <> 'Not provided' THEN
    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE phone = v_customer_phone
    ORDER BY created_at
    LIMIT 1
    FOR UPDATE;
    IF v_customer_id IS NULL THEN
      INSERT INTO public.customers(name, phone, email)
      VALUES (v_customer_name, v_customer_phone, v_customer_email)
      RETURNING id INTO v_customer_id;
    END IF;
  END IF;

  INSERT INTO public.orders(
    order_number, customer_id, customer_name, customer_phone, customer_email,
    delivery_address, subtotal, delivery_charge, total, currency, status,
    source, notes, ordered_at, payment_method
  )
  VALUES (
    v_order_number, v_customer_id, v_customer_name, v_customer_phone, v_customer_email,
    'In-store / offline sale', v_subtotal, 0, v_subtotal, 'BDT', 'delivered',
    'offline_pos', v_notes,
    ((v_sale_date::timestamp + v_sale_time) AT TIME ZONE 'Asia/Dhaka'),
    v_payment_method
  )
  RETURNING id INTO v_order_id;

  FOR v_line IN SELECT value FROM jsonb_array_elements(v_items) LOOP
    SELECT * INTO v_product
    FROM public.products
    WHERE lower(slug) = lower(trim(v_line ->> 'product_slug'))
    LIMIT 1
    FOR UPDATE;
    v_quantity := (v_line ->> 'quantity')::numeric;
    IF nullif(trim(coalesce(v_line ->> 'unit_price', '')), '') IS NULL THEN
      v_unit_price := v_product.price;
    ELSE
      v_unit_price := (v_line ->> 'unit_price')::numeric;
    END IF;

    IF v_adjust_stock AND v_product.stock_quantity IS NOT NULL THEN
      v_stock_before := v_product.stock_quantity;
      IF v_stock_before < v_quantity THEN
        RAISE EXCEPTION 'Not enough stock for %. Available: %, requested: %.',
          v_product.name, v_stock_before, v_quantity USING ERRCODE = '22023';
      END IF;
      v_stock_after := v_stock_before - v_quantity;
      PERFORM set_config('app.inventory_system_update', 'on', true);
      UPDATE public.products SET stock_quantity = v_stock_after, updated_at = now()
      WHERE id = v_product.id;
      INSERT INTO public.inventory_movements(
        product_id, movement_type, quantity_delta, stock_before, stock_after,
        order_id, reason, created_by
      )
      VALUES (
        v_product.id, 'pos_sale', -v_quantity, v_stock_before, v_stock_after,
        v_order_id, 'Offline POS sale ' || v_order_number, v_email
      );
      v_stock_lines := v_stock_lines + 1;
    END IF;

    INSERT INTO public.order_items(
      order_id, product_id, product_name, quantity, unit, unit_price,
      line_total, product_image_url, shipping_weight_kg
    )
    VALUES (
      v_order_id, v_product.id, v_product.name, v_quantity, v_product.unit_type,
      v_unit_price, (v_unit_price * v_quantity), v_product.image_url,
      v_product.shipping_weight_kg
    );
  END LOOP;

  v_finance_status := CASE WHEN v_payment_received THEN 'confirmed' ELSE 'draft' END;
  INSERT INTO public.admin_finance_entries(
    entry_type, category, amount, entry_date, description, reference,
    status, related_order_id, created_by
  )
  VALUES (
    'income', 'Offline POS Sale', v_subtotal, v_sale_date,
    'Recorded offline POS sale ' || v_order_number ||
      CASE WHEN v_payment_received THEN ' — marked as received at the POS.'
           ELSE ' — payment not received at the POS; kept as draft.' END,
    v_order_number, v_finance_status, v_order_id, v_email
  );

  RETURN jsonb_build_object(
    'success', true, 'duplicate', false, 'orderId', v_order_id,
    'orderNumber', v_order_number, 'total', v_subtotal,
    'itemsCount', v_item_count, 'stockAdjusted', v_stock_lines > 0,
    'stockLinesAdjusted', v_stock_lines, 'financeStatus', v_finance_status
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.create_offline_pos_sale(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_offline_pos_sale(jsonb) TO authenticated;
COMMENT ON FUNCTION public.create_offline_pos_sale(jsonb) IS
  'MFA-gated interactive Halal Food POS transaction. Stores exact sale date/time, customer, selling price, supported kg/liter fractional quantity, stock movement and linked finance income. Uses SECURITY INVOKER and admin RLS. Does not emit website purchase tracking events.';

-- Keep the hardened caller-privilege model and explicit RPC grants.
ALTER FUNCTION public.create_offline_pos_sale(jsonb) SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.create_offline_pos_sale(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_offline_pos_sale(jsonb) TO authenticated;
