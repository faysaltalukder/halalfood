-- Halal Food Neon Data API and persistent Website Builder documents
-- Scope: grocery-template-builder-v1 (br-muddy-lake-a1tcb0n1), halal_food_db.
-- Supabase Auth JWTs are verified by Neon Data API using the project's public JWKS.
-- Template definitions are public read-only. All merchant data is owner-scoped.

GRANT USAGE ON SCHEMA builder TO anonymous, authenticated;
GRANT USAGE ON SCHEMA auth TO anonymous, authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anonymous, authenticated;
GRANT SELECT ON builder.template_catalog, builder.template_designs TO anonymous, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON builder.websites, builder.categories, builder.products, builder.assets, builder.website_plugins, builder.orders, builder.order_items, builder.audit_log TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE builder.audit_log_id_seq TO authenticated;

ALTER TABLE builder.template_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder.template_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder.websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder.website_plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY template_catalog_read ON builder.template_catalog FOR SELECT TO anonymous, authenticated USING (true);
CREATE POLICY template_designs_read ON builder.template_designs FOR SELECT TO anonymous, authenticated USING (true);

CREATE POLICY websites_owner_select ON builder.websites FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY websites_owner_insert ON builder.websites FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY websites_owner_update ON builder.websites FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY websites_owner_delete ON builder.websites FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE POLICY categories_owner_all ON builder.categories FOR ALL TO authenticated
 USING (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM builder.websites w WHERE w.id = website_id AND w.owner_id = auth.uid()))
 WITH CHECK (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM builder.websites w WHERE w.id = website_id AND w.owner_id = auth.uid()));
CREATE POLICY products_owner_all ON builder.products FOR ALL TO authenticated
 USING (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM builder.websites w WHERE w.id = website_id AND w.owner_id = auth.uid()))
 WITH CHECK (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM builder.websites w WHERE w.id = website_id AND w.owner_id = auth.uid()));
CREATE POLICY assets_owner_all ON builder.assets FOR ALL TO authenticated
 USING (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM builder.websites w WHERE w.id = website_id AND w.owner_id = auth.uid()))
 WITH CHECK (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM builder.websites w WHERE w.id = website_id AND w.owner_id = auth.uid()));
CREATE POLICY plugins_owner_all ON builder.website_plugins FOR ALL TO authenticated
 USING (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM builder.websites w WHERE w.id = website_id AND w.owner_id = auth.uid()))
 WITH CHECK (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM builder.websites w WHERE w.id = website_id AND w.owner_id = auth.uid()));
CREATE POLICY orders_owner_all ON builder.orders FOR ALL TO authenticated
 USING (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM builder.websites w WHERE w.id = website_id AND w.owner_id = auth.uid()))
 WITH CHECK (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM builder.websites w WHERE w.id = website_id AND w.owner_id = auth.uid()));
CREATE POLICY order_items_owner_all ON builder.order_items FOR ALL TO authenticated
 USING (EXISTS (SELECT 1 FROM builder.orders o WHERE o.id = order_id AND o.owner_id = auth.uid()))
 WITH CHECK (EXISTS (SELECT 1 FROM builder.orders o WHERE o.id = order_id AND o.owner_id = auth.uid()));
CREATE POLICY audit_log_owner_select ON builder.audit_log FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY audit_log_owner_insert ON builder.audit_log FOR INSERT TO authenticated
 WITH CHECK (owner_id = auth.uid() AND (website_id IS NULL OR EXISTS (SELECT 1 FROM builder.websites w WHERE w.id = website_id AND w.owner_id = auth.uid())));

CREATE TABLE IF NOT EXISTS builder.website_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 website_id uuid NOT NULL REFERENCES builder.websites(id) ON DELETE CASCADE,
 owner_id uuid NOT NULL,
 page_key text NOT NULL DEFAULT 'home',
 schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version > 0),
 document jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (website_id, page_key)
);
CREATE INDEX IF NOT EXISTS website_documents_owner_updated_idx ON builder.website_documents(owner_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON builder.website_documents TO authenticated;
ALTER TABLE builder.website_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY website_documents_owner_all ON builder.website_documents FOR ALL TO authenticated
 USING (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM builder.websites w WHERE w.id = website_id AND w.owner_id = auth.uid()))
 WITH CHECK (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM builder.websites w WHERE w.id = website_id AND w.owner_id = auth.uid()));
COMMENT ON TABLE builder.website_documents IS 'Persistent owner-scoped Website Builder page documents. GitHub owns renderer code and Neon owns editable documents.';
