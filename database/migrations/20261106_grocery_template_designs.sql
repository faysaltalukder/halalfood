-- Halal Food WordPress Grocery Template Suite
-- Neon project: super-glade-83751859
-- Neon branch: grocery-template-builder-v1 (br-muddy-lake-a1tcb0n1)
-- Database: halal_food_db | Schema: builder
-- Additive migration only. Never run against production/main without review.
CREATE TABLE IF NOT EXISTS builder.template_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL REFERENCES builder.template_catalog(template_key) ON DELETE CASCADE,
  design_version integer NOT NULL DEFAULT 1 CHECK (design_version > 0),
  design_spec jsonb NOT NULL DEFAULT '{}'::jsonb,
  preview_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_commit text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_key, design_version)
);
CREATE INDEX IF NOT EXISTS template_designs_active_idx
  ON builder.template_designs (template_key, is_active, design_version DESC);
COMMENT ON TABLE builder.template_designs IS
  'Versioned WordPress storefront design specs. GitHub owns renderer source; Neon owns template metadata and merchant data.';
INSERT INTO builder.template_designs
  (template_key, design_version, design_spec, preview_settings, source_commit, is_active)
VALUES
('general-supermarket',1,'{"layout":"dense-catalogue","palette":{"accent":"#b94f35","ink":"#273b32","paper":"#fbf8f1","soft":"#f4eadb"},"sections":["utility-bar","brand-search-header","category-navigation","split-hero","promotion-tiles","featured-product-grid","footer"],"components":["advanced-search","category-rail","product-card","basket","promotion-tile"],"commerce":{"catalog":"dense-grid","search":"advanced","reorder":true,"promotions":true,"delivery":["scheduled","pickup"]}}'::jsonb,'{"viewport":"desktop","sample_data":true,"preview_only":true}'::jsonb,'feature/grocery-template-suite-v1',true),
('fresh-produce',1,'{"layout":"editorial-seasonal","palette":{"accent":"#657c4a","ink":"#293c31","paper":"#f7f7ef","soft":"#e9eddf"},"sections":["seasonal-utility","editorial-header","photo-hero","seasonal-introduction","produce-categories","harvest-product-grid","grower-story-footer"],"components":["origin-note","seasonal-collection","variable-weight-selector","substitution-preference","editorial-product-card"],"commerce":{"catalog":"editorial","origin_info":true,"seasonal_collections":true,"variable_weight":true,"substitution":true}}'::jsonb,'{"viewport":"desktop","sample_data":true,"preview_only":true}'::jsonb,'feature/grocery-template-suite-v1',true),
('express-grocery',1,'{"layout":"compact-quick-commerce","palette":{"accent":"#df6b35","ink":"#27354a","paper":"#f7f8fb","soft":"#fff0e7"},"sections":["delivery-ribbon","compact-header","search-bar","quick-hero","benefit-strip","category-pills","quick-add-product-list","sticky-basket"],"components":["delivery-zone","quick-add","quantity-stepper","sticky-cart","reorder-shortcut"],"commerce":{"catalog":"compact","quick_add":true,"sticky_cart":true,"reorder":true,"delivery_zone":true}}'::jsonb,'{"viewport":"mobile","sample_data":true,"preview_only":true}'::jsonb,'feature/grocery-template-suite-v1',true),
('wholesale-bulk',1,'{"layout":"b2b-procurement","palette":{"accent":"#344b70","ink":"#25344b","paper":"#f5f7fa","soft":"#e9eef5"},"sections":["business-utility","account-header","b2b-hero","procurement-benefits","structured-product-table","quote-request","business-footer"],"components":["pack-size","minimum-order-quantity","tiered-pricing","quick-order-sheet","quote-request"],"commerce":{"catalog":"table-and-grid","quote_request":true,"tiered_pricing":true,"quick_order_sheet":true,"minimum_order_quantity":true}}'::jsonb,'{"viewport":"desktop","sample_data":true,"preview_only":true}'::jsonb,'feature/grocery-template-suite-v1',true)
ON CONFLICT (template_key, design_version) DO UPDATE SET
  design_spec=EXCLUDED.design_spec,
  preview_settings=EXCLUDED.preview_settings,
  source_commit=EXCLUDED.source_commit,
  is_active=EXCLUDED.is_active,
  updated_at=now();
UPDATE builder.template_catalog
SET feature_flags = feature_flags || '{"design_ready":true,"design_version":1,"design_source":"github:faysaltalukder/halalfood","data_source":"neon:builder.template_designs"}'::jsonb
WHERE template_key IN ('general-supermarket','fresh-produce','express-grocery','wholesale-bulk');
