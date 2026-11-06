-- Multipage grocery storefront system, public published reads and safe COD order RPC.
-- Apply only to Neon grocery-template-builder-v1 branch, database halal_food_db.
CREATE TABLE IF NOT EXISTS builder.template_pages (
 template_key text NOT NULL REFERENCES builder.template_catalog(template_key) ON DELETE CASCADE,
 page_key text NOT NULL,
 page_type text NOT NULL,
 title text NOT NULL,
 slug text NOT NULL,
 sort_order smallint NOT NULL DEFAULT 0,
 page_spec jsonb NOT NULL DEFAULT '{}'::jsonb,
 is_required boolean NOT NULL DEFAULT true,
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(template_key,page_key),
 UNIQUE(template_key,slug)
);
CREATE INDEX IF NOT EXISTS template_pages_active_order_idx ON builder.template_pages(template_key,is_active,sort_order);
GRANT SELECT ON builder.template_pages TO anonymous, authenticated;
ALTER TABLE builder.template_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS template_pages_read ON builder.template_pages;
CREATE POLICY template_pages_read ON builder.template_pages FOR SELECT TO anonymous,authenticated USING(is_active=true);

WITH themes(template_key,brand_name,layout,palette,typography,personality) AS (
 VALUES
 ('general-supermarket','Daily Basket','supermarket-grid','{"primary":"#b94f35","ink":"#273b32","paper":"#fbf8f1","surface":"#ffffff","accent":"#e7a54b","muted":"#77766f"}'::jsonb,'{"heading":"Playfair Display","body":"DM Sans"}'::jsonb,'Warm neighbourhood market with bold weekly merchandising'),
 ('fresh-produce','Field & Fork','editorial-farm','{"primary":"#657c4a","ink":"#293c31","paper":"#f7f7ef","surface":"#fffefa","accent":"#d8a65c","muted":"#7c8373"}'::jsonb,'{"heading":"Cormorant Garamond","body":"DM Sans"}'::jsonb,'Quiet editorial farm-to-table story with generous photography'),
 ('express-grocery','zipmart','quick-commerce','{"primary":"#df6b35","ink":"#27354a","paper":"#f7f8fb","surface":"#ffffff","accent":"#f3c54b","muted":"#768194"}'::jsonb,'{"heading":"Manrope","body":"Inter"}'::jsonb,'High-energy quick-commerce interface with compact utility-led cards'),
 ('wholesale-bulk','Merchant Supply','b2b-procurement','{"primary":"#344b70","ink":"#25344b","paper":"#f5f7fa","surface":"#ffffff","accent":"#d4a85a","muted":"#738094"}'::jsonb,'{"heading":"IBM Plex Sans","body":"Inter"}'::jsonb,'Structured B2B procurement portal with strong data hierarchy')
),
pages(page_key,page_type,title,slug,sort_order,sections) AS (
 VALUES ('home','home','Home','',1,ARRAY['announcement','header','hero','featured-categories','featured-products','brand-story','benefits','newsletter','footer' ]::text[]),
('shop','shop','Shop All','shop',2,ARRAY['breadcrumbs','shop-heading','search','filters','sort','product-grid','pagination','footer' ]::text[]),
('category','category','Category','category',3,ARRAY['breadcrumbs','category-hero','subcategories','filters','product-grid','pagination','footer' ]::text[]),
('product','product','Product Details','product',4,ARRAY['breadcrumbs','product-gallery','product-information','quantity-selector','add-to-cart','buy-now','product-details','reviews','related-products','footer' ]::text[]),
('search','search','Search Results','search',5,ARRAY['search-heading','search-form','filters','result-count','product-grid','footer' ]::text[]),
('cart','cart','Shopping Cart','cart',6,ARRAY['cart-heading','cart-items','quantity-controls','promo-code','order-summary','continue-shopping','checkout-cta','footer' ]::text[]),
('checkout','checkout','Checkout','checkout',7,ARRAY['checkout-progress','contact-form','shipping-address','delivery-method','payment-method','order-summary','place-order','footer' ]::text[]),
('order-confirmation','order-confirmation','Order Confirmation','order-confirmation',8,ARRAY['success-state','order-number','delivery-summary','order-items','next-steps','footer' ]::text[]),
('order-tracking','order-tracking','Track Order','track-order',9,ARRAY['tracking-search','order-status','status-timeline','order-items','support-link','footer' ]::text[]),
('about','content','Our Story','about',10,ARRAY['story-hero','brand-story','values','sourcing','team','footer' ]::text[]),
('contact','contact','Contact Us','contact',11,ARRAY['contact-hero','contact-details','contact-form','business-hours','location','footer' ]::text[]),
('faq','faq','FAQs','faq',12,ARRAY['faq-hero','faq-categories','faq-accordion','support-cta','footer' ]::text[]),
('delivery','content','Delivery Information','delivery',13,ARRAY['delivery-hero','delivery-zones','delivery-fees','delivery-times','delivery-faq','footer' ]::text[]),
('returns','content','Returns & Refunds','returns',14,ARRAY['returns-hero','policy-summary','return-steps','refund-timeline','support-cta','footer' ]::text[]),
('privacy','legal','Privacy Policy','privacy',15,ARRAY['legal-heading','legal-content','footer' ]::text[]),
('terms','legal','Terms & Conditions','terms',16,ARRAY['legal-heading','legal-content','footer' ]::text[]),
('account','account','My Account','account',17,ARRAY['account-heading','guest-order-lookup','account-benefits','support-link','footer' ]::text[]),
('wishlist','wishlist','Wishlist','wishlist',18,ARRAY['wishlist-heading','saved-products','empty-state','footer' ]::text[])
)
INSERT INTO builder.template_pages(template_key,page_key,page_type,title,slug,sort_order,page_spec,is_required,is_active)
SELECT t.template_key,p.page_key,p.page_type,p.title,p.slug,p.sort_order,
 jsonb_build_object('templateKey',t.template_key,'brandName',t.brand_name,'layout',t.layout,'palette',t.palette,'typography',t.typography,'personality',t.personality,'sections',to_jsonb(p.sections),'responsive',jsonb_build_object('mobile',true,'tablet',true,'desktop',true),'commerce',jsonb_build_object('productDetail',p.page_type='product','cart',p.page_type='cart','checkout',p.page_type='checkout','orderTracking',p.page_type='track-order'))
 ,true,true
FROM themes t CROSS JOIN pages p
ON CONFLICT(template_key,page_key) DO UPDATE SET
 page_type=EXCLUDED.page_type,title=EXCLUDED.title,slug=EXCLUDED.slug,sort_order=EXCLUDED.sort_order,
 page_spec=EXCLUDED.page_spec,is_active=true,updated_at=now();

GRANT SELECT ON builder.websites,builder.categories,builder.products,builder.website_documents TO anonymous;
DROP POLICY IF EXISTS websites_public_published_read ON builder.websites;
CREATE POLICY websites_public_published_read ON builder.websites FOR SELECT TO anonymous USING(status='published');
DROP POLICY IF EXISTS categories_public_published_read ON builder.categories;
CREATE POLICY categories_public_published_read ON builder.categories FOR SELECT TO anonymous USING(EXISTS(SELECT 1 FROM builder.websites w WHERE w.id=categories.website_id AND w.status='published'));
DROP POLICY IF EXISTS products_public_published_read ON builder.products;
CREATE POLICY products_public_published_read ON builder.products FOR SELECT TO anonymous USING(is_active=true AND EXISTS(SELECT 1 FROM builder.websites w WHERE w.id=products.website_id AND w.status='published'));
DROP POLICY IF EXISTS website_documents_public_published_read ON builder.website_documents;
CREATE POLICY website_documents_public_published_read ON builder.website_documents FOR SELECT TO anonymous USING(EXISTS(SELECT 1 FROM builder.websites w WHERE w.id=website_documents.website_id AND w.status='published'));

CREATE OR REPLACE FUNCTION builder.place_storefront_order(
 p_website_slug text,
 p_items jsonb,
 p_customer jsonb,
 p_shipping_address jsonb,
 p_notes text DEFAULT ''
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,builder
AS $$
DECLARE
 v_website builder.websites%ROWTYPE;
 v_item jsonb;
 v_product builder.products%ROWTYPE;
 v_qty numeric;
 v_min_qty numeric;
 v_subtotal numeric:=0;
 v_delivery_fee numeric:=0;
 v_order_id uuid;
 v_order_number text;
 v_count integer:=0;
BEGIN
 IF p_items IS NULL OR jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)<1 OR jsonb_array_length(p_items)>30 THEN
  RAISE EXCEPTION 'Cart must contain between 1 and 30 products' USING ERRCODE='22023';
 END IF;
 IF COALESCE(trim(p_customer->>'name'),'')='' OR COALESCE(trim(p_customer->>'phone'),'')='' OR COALESCE(trim(p_shipping_address->>'address'),'')='' THEN
  RAISE EXCEPTION 'Customer name, phone and delivery address are required' USING ERRCODE='22023';
 END IF;
 SELECT * INTO v_website FROM builder.websites WHERE slug=p_website_slug AND status='published' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'This storefront is not published' USING ERRCODE='P0002'; END IF;
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
  v_count:=v_count+1;
  IF COALESCE(v_item->>'product_id','') !~* '^[0-9a-f-]{36}$' THEN RAISE EXCEPTION 'Invalid product in cart' USING ERRCODE='22023'; END IF;
  v_qty:=COALESCE(NULLIF(v_item->>'quantity','')::numeric,0);
  IF v_qty<=0 OR v_qty>1000 THEN RAISE EXCEPTION 'Invalid product quantity' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_product FROM builder.products WHERE id=(v_item->>'product_id')::uuid AND website_id=v_website.id AND is_active=true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'A product is no longer available' USING ERRCODE='P0002'; END IF;
  v_min_qty:=COALESCE(NULLIF(v_product.attributes->>'minimum_order_quantity','')::numeric,1);
  IF v_qty<v_min_qty THEN RAISE EXCEPTION 'Minimum order quantity not met for %',v_product.name USING ERRCODE='22023'; END IF;
  IF v_product.stock<v_qty THEN RAISE EXCEPTION 'Insufficient stock for %',v_product.name USING ERRCODE='P0001'; END IF;
  v_subtotal:=v_subtotal+(v_product.price*v_qty);
 END LOOP;
 v_delivery_fee:=GREATEST(0,LEAST(100000,COALESCE(NULLIF(v_website.settings #>> '{delivery,default_fee}','')::numeric,0)));
 v_order_number:='HF-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
 INSERT INTO builder.orders(website_id,owner_id,order_number,customer,shipping_address,subtotal,delivery_fee,discount,total,payment_method,payment_status,status,notes)
 VALUES(v_website.id,v_website.owner_id,v_order_number,p_customer,p_shipping_address,v_subtotal,v_delivery_fee,0,v_subtotal+v_delivery_fee,'cod','unpaid','pending',left(COALESCE(p_notes,''),2000))
 RETURNING id INTO v_order_id;
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
  SELECT * INTO v_product FROM builder.products WHERE id=(v_item->>'product_id')::uuid AND website_id=v_website.id FOR UPDATE;
  v_qty:=(v_item->>'quantity')::numeric;
  INSERT INTO builder.order_items(order_id,product_id,product_snapshot,quantity,unit_price,line_total)
  VALUES(v_order_id,v_product.id,jsonb_build_object('id',v_product.id,'name',v_product.name,'sku',v_product.sku,'unit',v_product.unit,'image_url',v_product.image_url),v_qty,v_product.price,v_product.price*v_qty);
  UPDATE builder.products SET stock=stock-v_qty,updated_at=now() WHERE id=v_product.id AND website_id=v_website.id;
 END LOOP;
 RETURN jsonb_build_object('id',v_order_id,'order_number',v_order_number,'status','pending','subtotal',v_subtotal,'delivery_fee',v_delivery_fee,'total',v_subtotal+v_delivery_fee,'payment_method','cod');
END;
$$;
REVOKE ALL ON FUNCTION builder.place_storefront_order(text,jsonb,jsonb,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION builder.place_storefront_order(text,jsonb,jsonb,jsonb,text) TO anonymous,authenticated;

CREATE OR REPLACE FUNCTION builder.track_storefront_order(
 p_website_slug text,
 p_order_number text,
 p_phone text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,builder
AS $$
DECLARE
 v_order builder.orders%ROWTYPE;
 v_website builder.websites%ROWTYPE;
 v_items jsonb;
 v_phone text;
BEGIN
 SELECT * INTO v_website FROM builder.websites WHERE slug=p_website_slug AND status='published';
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT * INTO v_order FROM builder.orders WHERE website_id=v_website.id AND upper(order_number)=upper(trim(p_order_number));
 IF NOT FOUND THEN RETURN NULL; END IF;
 v_phone:=regexp_replace(COALESCE(v_order.customer->>'phone',v_order.shipping_address->>'phone',''),'[^0-9]','','g');
 IF v_phone='' OR v_phone<>regexp_replace(COALESCE(p_phone,''),'[^0-9]','','g') THEN RETURN NULL; END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('product',product_snapshot,'quantity',quantity,'unit_price',unit_price,'line_total',line_total) ORDER BY id),'[]'::jsonb)
 INTO v_items FROM builder.order_items WHERE order_id=v_order.id;
 RETURN jsonb_build_object('order_number',v_order.order_number,'status',v_order.status,'payment_status',v_order.payment_status,'total',v_order.total,'created_at',v_order.created_at,'items',v_items);
END;
$$;
REVOKE ALL ON FUNCTION builder.track_storefront_order(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION builder.track_storefront_order(text,text,text) TO anonymous,authenticated;

NOTIFY pgrst,'reload schema';
