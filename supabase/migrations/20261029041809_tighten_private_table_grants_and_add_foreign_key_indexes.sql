-- Least-privilege hardening: admin UI uses authenticated access, while these
-- private records are never intended to be accessible through the anon role.
REVOKE ALL PRIVILEGES ON TABLE
  public.admin_activity_log,
  public.admin_ad_review_drafts,
  public.admin_finance_entries,
  public.admin_operational_tasks,
  public.admin_product_costs,
  public.admin_purchase_order_items,
  public.admin_purchase_orders,
  public.admin_return_requests,
  public.admin_shipments,
  public.admin_suppliers,
  public.admin_team_members,
  public.meta_ads_oauth_states,
  public.meta_ads_review_accounts,
  public.meta_ads_review_connection,
  public.order_status_history
FROM anon;

-- Social-publishing queue/settings and Meta OAuth account state are processed
-- through server-side Edge Functions using service-role access only.
REVOKE ALL PRIVILEGES ON TABLE
  public.platform_settings,
  public.post_queue,
  public.meta_ads_oauth_states,
  public.meta_ads_review_accounts,
  public.meta_ads_review_connection
FROM anon, authenticated;

-- The public storefront requires read access to site content, not client writes.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON TABLE public.site_content_blocks FROM anon;

-- Add the seven missing indexes identified by Supabase's FK-index advisor.
CREATE INDEX IF NOT EXISTS idx_admin_operational_tasks_related_order_id
  ON public.admin_operational_tasks (related_order_id);
CREATE INDEX IF NOT EXISTS idx_admin_purchase_order_items_product_id
  ON public.admin_purchase_order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_admin_purchase_orders_supplier_id
  ON public.admin_purchase_orders (supplier_id);
CREATE INDEX IF NOT EXISTS idx_admin_return_requests_order_id
  ON public.admin_return_requests (order_id);
CREATE INDEX IF NOT EXISTS idx_messaging_conversations_contact_id
  ON public.messaging_conversations (contact_id);
CREATE INDEX IF NOT EXISTS idx_products_category_slug
  ON public.products (category_slug);
CREATE INDEX IF NOT EXISTS idx_site_change_sets_rollback_of_change_set_id
  ON public.site_change_sets (rollback_of_change_set_id);
