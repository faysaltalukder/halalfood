-- Ensure MFA-authenticated admins can cause the catalog triggers to run.
-- Trigger-returning functions cannot be invoked as ordinary PostgREST RPC functions.
GRANT EXECUTE ON FUNCTION public.validate_category_hierarchy() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_category_product_labels() TO authenticated;
