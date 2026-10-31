-- Halal Food Customer Management & Segmentation
-- Applied to project qfwvrcfkrsydycbfjsxf as migration 20261031093837.
-- Additive changes only: existing customer identities and order history are retained.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS blocked_by text,
  ADD COLUMN IF NOT EXISTS blocked_reason text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS anonymized_at timestamptz;

CREATE INDEX IF NOT EXISTS customers_active_directory_idx
  ON public.customers (created_at DESC)
  WHERE archived_at IS NULL AND anonymized_at IS NULL;
CREATE INDEX IF NOT EXISTS orders_customer_history_idx
  ON public.orders (customer_id, ordered_at DESC)
  WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS order_security_signals_order_number_created_idx
  ON public.order_security_signals (order_number, created_at DESC);

CREATE TABLE IF NOT EXISTS public.customer_management_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  classification_basis text NOT NULL DEFAULT 'delivered'
    CHECK (classification_basis IN ('delivered', 'non_cancelled')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);
INSERT INTO public.customer_management_settings (id, classification_basis)
VALUES (1, 'delivered')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.customer_segment_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[a-z][a-z0-9_-]{1,39}$'),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 60),
  min_orders integer NOT NULL DEFAULT 0 CHECK (min_orders >= 0),
  max_orders integer CHECK (max_orders IS NULL OR max_orders >= min_orders),
  badge_color text NOT NULL DEFAULT 'slate'
    CHECK (badge_color IN ('slate','blue','amber','violet','gold','teal','rose')),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.customer_segment_rules
  (code, name, min_orders, max_orders, badge_color, sort_order, is_active)
VALUES
  ('new', 'New Customer', 0, 1, 'blue', 10, true),
  ('regular', 'Regular Customer', 2, 9, 'teal', 20, true),
  ('special', 'Special Customer', 10, 49, 'violet', 30, true),
  ('vip', 'VIP Customer', 50, NULL, 'gold', 40, true)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.customer_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[a-z][a-z0-9_-]{1,39}$'),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 60),
  description text NOT NULL DEFAULT '',
  badge_color text NOT NULL DEFAULT 'rose'
    CHECK (badge_color IN ('slate','blue','amber','violet','gold','teal','rose')),
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.customer_tags (code, name, description, badge_color, is_system, is_active)
VALUES ('friend', 'Friend Customer', 'Manually assigned relationship tag.', 'rose', true, true)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.customer_tag_assignments (
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.customer_tags(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by text,
  PRIMARY KEY (customer_id, tag_id)
);
CREATE INDEX IF NOT EXISTS customer_tag_assignments_tag_idx
  ON public.customer_tag_assignments (tag_id, customer_id);

ALTER TABLE public.customer_management_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_segment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_tag_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customer management admin MFA" ON public.customer_management_settings;
CREATE POLICY "Customer management admin MFA"
  ON public.customer_management_settings FOR ALL TO authenticated
  USING (lower(coalesce((SELECT auth.jwt())->>'email','')) = 'halalfoodbd.official@gmail.com'
    AND coalesce((SELECT auth.jwt())->>'aal','aal1') = 'aal2')
  WITH CHECK (lower(coalesce((SELECT auth.jwt())->>'email','')) = 'halalfoodbd.official@gmail.com'
    AND coalesce((SELECT auth.jwt())->>'aal','aal1') = 'aal2');

DROP POLICY IF EXISTS "Customer segment rules admin MFA" ON public.customer_segment_rules;
CREATE POLICY "Customer segment rules admin MFA"
  ON public.customer_segment_rules FOR ALL TO authenticated
  USING (lower(coalesce((SELECT auth.jwt())->>'email','')) = 'halalfoodbd.official@gmail.com'
    AND coalesce((SELECT auth.jwt())->>'aal','aal1') = 'aal2')
  WITH CHECK (lower(coalesce((SELECT auth.jwt())->>'email','')) = 'halalfoodbd.official@gmail.com'
    AND coalesce((SELECT auth.jwt())->>'aal','aal1') = 'aal2');

DROP POLICY IF EXISTS "Customer tags admin MFA" ON public.customer_tags;
CREATE POLICY "Customer tags admin MFA"
  ON public.customer_tags FOR ALL TO authenticated
  USING (lower(coalesce((SELECT auth.jwt())->>'email','')) = 'halalfoodbd.official@gmail.com'
    AND coalesce((SELECT auth.jwt())->>'aal','aal1') = 'aal2')
  WITH CHECK (lower(coalesce((SELECT auth.jwt())->>'email','')) = 'halalfoodbd.official@gmail.com'
    AND coalesce((SELECT auth.jwt())->>'aal','aal1') = 'aal2');

DROP POLICY IF EXISTS "Customer tag assignments admin MFA" ON public.customer_tag_assignments;
CREATE POLICY "Customer tag assignments admin MFA"
  ON public.customer_tag_assignments FOR ALL TO authenticated
  USING (lower(coalesce((SELECT auth.jwt())->>'email','')) = 'halalfoodbd.official@gmail.com'
    AND coalesce((SELECT auth.jwt())->>'aal','aal1') = 'aal2')
  WITH CHECK (lower(coalesce((SELECT auth.jwt())->>'email','')) = 'halalfoodbd.official@gmail.com'
    AND coalesce((SELECT auth.jwt())->>'aal','aal1') = 'aal2');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_management_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_segment_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_tag_assignments TO authenticated;

DROP POLICY IF EXISTS "Admin MFA can read customer security signals" ON public.order_security_signals;
CREATE POLICY "Admin MFA can read customer security signals"
  ON public.order_security_signals FOR SELECT TO authenticated
  USING (lower(coalesce((SELECT auth.jwt())->>'email','')) = 'halalfoodbd.official@gmail.com'
    AND coalesce((SELECT auth.jwt())->>'aal','aal1') = 'aal2');
GRANT SELECT ON public.order_security_signals TO authenticated;

CREATE OR REPLACE VIEW public.customer_directory
WITH (security_invoker = true)
AS
SELECT
  c.id,c.name,c.phone,c.email,c.address,c.auth_user_id,c.created_at,c.updated_at,
  c.is_blocked,c.blocked_at,c.blocked_by,c.blocked_reason,c.archived_at,c.anonymized_at,
  COALESCE(stats.total_orders,0)::bigint AS total_orders,
  COALESCE(stats.delivered_orders,0)::bigint AS delivered_orders,
  COALESCE(stats.cancelled_orders,0)::bigint AS cancelled_orders,
  COALESCE(stats.non_cancelled_orders,0)::bigint AS non_cancelled_orders,
  COALESCE(stats.recorded_order_value,0)::numeric AS recorded_order_value,
  COALESCE(stats.average_recorded_order_value,0)::numeric AS average_recorded_order_value,
  stats.first_order_at,stats.last_order_at,stats.last_order_status,
  COALESCE(stats.qualifying_orders,0)::bigint AS qualifying_orders,
  segment.code AS segment_code,segment.name AS segment_name,segment.badge_color AS segment_color,
  COALESCE(tag_data.tags,'[]'::jsonb) AS manual_tags,
  COALESCE(tag_data.tag_codes,ARRAY[]::text[]) AS tag_codes,
  COALESCE('friend'=ANY(tag_data.tag_codes),false) AS has_friend_tag,
  latest_security.ip_masked,latest_security.ip_country,latest_security.signal_created_at
FROM public.customers c
CROSS JOIN public.customer_management_settings cms
LEFT JOIN LATERAL (
  SELECT count(*) AS total_orders,
    count(*) FILTER (WHERE o.status='delivered') AS delivered_orders,
    count(*) FILTER (WHERE o.status='cancelled') AS cancelled_orders,
    count(*) FILTER (WHERE o.status<>'cancelled') AS non_cancelled_orders,
    COALESCE(sum(o.total) FILTER (WHERE o.status<>'cancelled'),0) AS recorded_order_value,
    CASE WHEN count(*) FILTER (WHERE o.status<>'cancelled')=0 THEN 0
      ELSE COALESCE(sum(o.total) FILTER (WHERE o.status<>'cancelled'),0)
        / count(*) FILTER (WHERE o.status<>'cancelled') END AS average_recorded_order_value,
    min(o.ordered_at) AS first_order_at,max(o.ordered_at) AS last_order_at,
    (array_agg(o.status ORDER BY o.ordered_at DESC,o.id DESC))[1] AS last_order_status,
    count(*) FILTER (WHERE CASE WHEN cms.classification_basis='non_cancelled'
      THEN o.status<>'cancelled' ELSE o.status='delivered' END) AS qualifying_orders
  FROM public.orders o WHERE o.customer_id=c.id
) stats ON true
LEFT JOIN LATERAL (
  SELECT r.code,r.name,r.badge_color FROM public.customer_segment_rules r
  WHERE r.is_active AND stats.qualifying_orders>=r.min_orders
    AND (r.max_orders IS NULL OR stats.qualifying_orders<=r.max_orders)
  ORDER BY r.sort_order,r.min_orders DESC LIMIT 1
) segment ON true
LEFT JOIN LATERAL (
  SELECT jsonb_agg(jsonb_build_object('id',t.id,'code',t.code,'name',t.name,'badge_color',t.badge_color) ORDER BY t.name) AS tags,
    array_agg(t.code ORDER BY t.code) AS tag_codes
  FROM public.customer_tag_assignments a JOIN public.customer_tags t ON t.id=a.tag_id
  WHERE a.customer_id=c.id AND t.is_active
) tag_data ON true
LEFT JOIN LATERAL (
  SELECT s.ip_masked,s.ip_country,s.created_at AS signal_created_at
  FROM public.orders o JOIN public.order_security_signals s ON s.order_number=o.order_number
  WHERE o.customer_id=c.id AND (s.ip_masked IS NOT NULL OR s.ip_country IS NOT NULL)
  ORDER BY s.created_at DESC,s.order_number DESC LIMIT 1
) latest_security ON true;

GRANT SELECT ON public.customer_directory TO authenticated;

CREATE OR REPLACE FUNCTION private.enforce_customer_block_before_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $block_check$
DECLARE
  v_customer_id uuid;
  v_is_blocked boolean;
  v_archived_at timestamptz;
BEGIN
  v_customer_id:=NEW.customer_id;
  IF v_customer_id IS NULL AND nullif(NEW.customer_phone,'') IS NOT NULL THEN
    SELECT c.id,c.is_blocked,c.archived_at INTO v_customer_id,v_is_blocked,v_archived_at
    FROM public.customers c WHERE c.phone=NEW.customer_phone ORDER BY c.created_at LIMIT 1 FOR UPDATE;
    IF FOUND THEN NEW.customer_id:=v_customer_id; END IF;
  ELSIF v_customer_id IS NOT NULL THEN
    SELECT c.is_blocked,c.archived_at INTO v_is_blocked,v_archived_at
    FROM public.customers c WHERE c.id=v_customer_id FOR UPDATE;
  END IF;
  IF coalesce(v_is_blocked,false) THEN
    RAISE EXCEPTION 'This customer is blocked from placing new orders. Please contact the store.' USING ERRCODE='P0001';
  END IF;
  IF v_customer_id IS NOT NULL AND v_archived_at IS NOT NULL THEN
    UPDATE public.customers SET archived_at=NULL,updated_at=now()
    WHERE id=v_customer_id AND anonymized_at IS NULL;
  END IF;
  RETURN NEW;
END;
$block_check$;
REVOKE ALL ON FUNCTION private.enforce_customer_block_before_order() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS enforce_customer_block_before_order ON public.orders;
CREATE TRIGGER enforce_customer_block_before_order BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION private.enforce_customer_block_before_order();

CREATE OR REPLACE FUNCTION public.admin_customer_action(
  p_customer_id uuid,p_action text,p_reason text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $customer_action$
DECLARE
  v_action text:=lower(trim(coalesce(p_action,'')));
  v_email text:=lower(coalesce((SELECT auth.jwt())->>'email',''));
  v_aal text:=coalesce((SELECT auth.jwt())->>'aal','aal1');
  v_customer public.customers%ROWTYPE;
  v_old_phone text;
  v_old_email text;
  v_safe_phone text;
  v_order_ids uuid[];
  v_order_numbers text[];
  v_reason text:=left(trim(coalesce(p_reason,'')),500);
BEGIN
  IF v_email<>'halalfoodbd.official@gmail.com' OR v_aal<>'aal2' THEN
    RAISE EXCEPTION 'Admin MFA is required for customer management actions.' USING ERRCODE='42501';
  END IF;
  IF p_customer_id IS NULL THEN RAISE EXCEPTION 'A customer ID is required.' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_customer FROM public.customers WHERE id=p_customer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Customer record was not found.' USING ERRCODE='P0002'; END IF;
  IF v_customer.anonymized_at IS NOT NULL AND v_action<>'anonymize' THEN
    RAISE EXCEPTION 'This customer record has already been anonymized.' USING ERRCODE='22023';
  END IF;

  IF v_action='block' THEN
    UPDATE public.customers SET is_blocked=true,blocked_at=now(),blocked_by=v_email,
      blocked_reason=nullif(v_reason,''),updated_at=now() WHERE id=p_customer_id;
  ELSIF v_action='unblock' THEN
    UPDATE public.customers SET is_blocked=false,blocked_at=NULL,blocked_by=NULL,
      blocked_reason=NULL,updated_at=now() WHERE id=p_customer_id;
  ELSIF v_action='archive' THEN
    UPDATE public.customers SET archived_at=now(),updated_at=now() WHERE id=p_customer_id;
  ELSIF v_action='restore' THEN
    UPDATE public.customers SET archived_at=NULL,updated_at=now() WHERE id=p_customer_id;
  ELSIF v_action='anonymize' THEN
    IF v_customer.anonymized_at IS NOT NULL THEN
      RAISE EXCEPTION 'This customer has already been anonymized.' USING ERRCODE='22023';
    END IF;
    v_old_phone:=v_customer.phone;v_old_email:=v_customer.email;
    v_safe_phone:='ANON-'||upper(substr(replace(p_customer_id::text,'-',''),1,12));
    SELECT array_agg(o.id),array_agg(o.order_number) INTO v_order_ids,v_order_numbers
    FROM public.orders o WHERE o.customer_id=p_customer_id;
    UPDATE public.orders SET customer_name='Anonymized customer',customer_phone=v_safe_phone,
      customer_email=NULL,delivery_address='[Personal details removed]',updated_at=now()
    WHERE customer_id=p_customer_id;
    IF v_order_numbers IS NOT NULL THEN
      UPDATE public.order_security_reviews
      SET order_payload=(order_payload-'phone'-'mobile'-'email'-'address')||jsonb_build_object('name','Anonymized customer')
      WHERE order_number=ANY(v_order_numbers);
    END IF;
    UPDATE public.order_security_reviews
    SET order_payload=(order_payload-'phone'-'mobile'-'email'-'address')||jsonb_build_object('name','Anonymized customer')
    WHERE (v_old_phone IS NOT NULL AND (order_payload->>'phone'=v_old_phone OR order_payload->>'mobile'=v_old_phone))
       OR (v_old_email IS NOT NULL AND lower(coalesce(order_payload->>'email',''))=lower(v_old_email));
    IF v_order_ids IS NOT NULL THEN
      UPDATE public.coupon_redemptions SET customer_phone=v_safe_phone WHERE order_id=ANY(v_order_ids);
      UPDATE public.incomplete_checkouts SET customer_name='Anonymized customer',customer_phone=v_safe_phone,
        customer_email=NULL,delivery_address='[Personal details removed]',updated_at=now()
      WHERE converted_order_id=ANY(v_order_ids);
    END IF;
    UPDATE public.incomplete_checkouts SET customer_name='Anonymized customer',customer_phone=v_safe_phone,
      customer_email=NULL,delivery_address='[Personal details removed]',updated_at=now()
    WHERE (v_old_phone IS NOT NULL AND customer_phone=v_old_phone)
       OR (v_old_email IS NOT NULL AND lower(coalesce(customer_email,''))=lower(v_old_email));
    IF v_old_phone IS NOT NULL THEN
      DELETE FROM public.coupon_customer_allowlist WHERE customer_phone=v_old_phone;
    END IF;
    IF v_customer.auth_user_id IS NOT NULL THEN
      UPDATE public.customer_profiles SET full_name='Anonymized customer',phone=NULL,avatar_url=NULL,updated_at=now()
      WHERE user_id=v_customer.auth_user_id;
      DELETE FROM public.customer_cart_items WHERE user_id=v_customer.auth_user_id;
    END IF;
    DELETE FROM public.customer_tag_assignments WHERE customer_id=p_customer_id;
    UPDATE public.customers SET name='Anonymized customer',phone=v_safe_phone,email=NULL,address=NULL,
      auth_user_id=NULL,is_blocked=true,blocked_at=now(),blocked_by=v_email,
      blocked_reason='Customer data anonymized',archived_at=now(),anonymized_at=now(),updated_at=now()
    WHERE id=p_customer_id;
  ELSE
    RAISE EXCEPTION 'Unsupported customer action.' USING ERRCODE='22023';
  END IF;

  INSERT INTO public.admin_activity_log(actor_email,action,entity_type,entity_id,summary,metadata)
  VALUES(v_email,'customer_'||v_action,'customer',p_customer_id::text,
    CASE v_action
      WHEN 'block' THEN 'Customer blocked'
      WHEN 'unblock' THEN 'Customer unblocked'
      WHEN 'archive' THEN 'Customer archived'
      WHEN 'restore' THEN 'Customer restored'
      WHEN 'anonymize' THEN 'Customer personal details anonymized; order history retained'
    END,
    jsonb_build_object('reason',nullif(v_reason,''),'order_count',coalesce(cardinality(v_order_ids),0)));
  RETURN jsonb_build_object('success',true,'action',v_action,'customer_id',p_customer_id);
END;
$customer_action$;
REVOKE ALL ON FUNCTION public.admin_customer_action(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_customer_action(uuid,text,text) TO authenticated;
