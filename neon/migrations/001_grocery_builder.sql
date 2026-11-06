-- Halal Food Website Builder: Grocery templates
-- Additive migration. Does not modify any existing Halal Food tables.
CREATE SCHEMA IF NOT EXISTS builder;

CREATE TABLE IF NOT EXISTS builder.template_catalog (
  template_key text PRIMARY KEY,
  category_slug text NOT NULL DEFAULT 'ecommerce-grocery',
  name text NOT NULL,
  tagline text NOT NULL,
  description text NOT NULL,
  business_types text[] NOT NULL DEFAULT '{}',
  feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order smallint NOT NULL DEFAULT 0,
  is_builtin boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS builder.websites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  category_slug text NOT NULL DEFAULT 'ecommerce-grocery',
  template_key text NOT NULL REFERENCES builder.template_catalog(template_key),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','installed','published','archived')),
  brand jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id,slug)
);

CREATE TABLE IF NOT EXISTS builder.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES builder.websites(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  parent_id uuid REFERENCES builder.categories(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(website_id,slug)
);

CREATE TABLE IF NOT EXISTS builder.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES builder.websites(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  category_id uuid REFERENCES builder.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  sku text,
  price numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  compare_at_price numeric(12,2) CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  unit text NOT NULL DEFAULT 'piece',
  stock numeric(12,3) NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_key text,
  image_url text,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(website_id,sku)
);

CREATE TABLE IF NOT EXISTS builder.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES builder.websites(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  object_key text NOT NULL UNIQUE,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size > 0),
  alt_text text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS builder.website_plugins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES builder.websites(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  plugin_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(website_id,plugin_key)
);

CREATE TABLE IF NOT EXISTS builder.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES builder.websites(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  order_number text NOT NULL,
  customer jsonb NOT NULL DEFAULT '{}'::jsonb,
  shipping_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  delivery_fee numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cod',
  payment_status text NOT NULL DEFAULT 'unpaid',
  status text NOT NULL DEFAULT 'pending',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(website_id,order_number)
);

CREATE TABLE IF NOT EXISTS builder.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES builder.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES builder.products(id) ON DELETE SET NULL,
  product_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  quantity numeric(12,3) NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  line_total numeric(12,2) NOT NULL CHECK (line_total >= 0)
);

CREATE TABLE IF NOT EXISTS builder.audit_log (
  id bigserial PRIMARY KEY,
  owner_id uuid NOT NULL,
  website_id uuid REFERENCES builder.websites(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS websites_owner_updated_idx ON builder.websites(owner_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS products_website_sort_idx ON builder.products(website_id,is_active,sort_order);
CREATE INDEX IF NOT EXISTS categories_website_sort_idx ON builder.categories(website_id,sort_order);
CREATE INDEX IF NOT EXISTS orders_website_created_idx ON builder.orders(website_id,created_at DESC);

INSERT INTO builder.template_catalog (template_key,name,tagline,description,business_types,feature_flags,sort_order) VALUES
('general-supermarket','General Supermarket','The complete everyday grocery store','A broad supermarket storefront for families and daily grocery baskets.',ARRAY['Supermarket','Local grocery shop','Mini market','Daily essentials'], '{"catalog":"dense-grid","search":"advanced","promotions":true,"reorder":true,"delivery":"scheduled-or-pickup","bulk_pricing":false}'::jsonb,1),
('fresh-produce','Fresh & Farm','Freshness-led produce shopping','A visual storefront for fruit, vegetables, dairy, meat, fish and farm-to-home sellers.',ARRAY['Fresh produce','Organic grocery','Farm-to-home','Fruit and vegetable shop','Fresh meat and fish'], '{"catalog":"editorial","variable_weight":true,"origin_info":true,"seasonal_collections":true,"substitution":true}'::jsonb,2),
('express-grocery','Express Grocery','Fast essentials, fewer steps','A mobile-first convenience grocery storefront focused on fast add-to-cart and local delivery.',ARRAY['Convenience store','Express grocery','Local delivery','Quick essentials'], '{"catalog":"compact","quick_add":true,"sticky_cart":true,"delivery_zone":true,"reorder":true}'::jsonb,3),
('wholesale-bulk','Wholesale & Bulk','Built for repeat business orders','A B2B grocery storefront with pack sizes, minimum order quantities, tiered pricing and quote requests.',ARRAY['Grocery wholesale','Restaurant supply','Bulk food supplier','Institutional grocery'], '{"catalog":"table-and-grid","tiered_pricing":true,"minimum_order_quantity":true,"quick_order_sheet":true,"quote_request":true}'::jsonb,4)
ON CONFLICT (template_key) DO UPDATE SET
  name=EXCLUDED.name,
  tagline=EXCLUDED.tagline,
  description=EXCLUDED.description,
  business_types=EXCLUDED.business_types,
  feature_flags=EXCLUDED.feature_flags,
  sort_order=EXCLUDED.sort_order;
