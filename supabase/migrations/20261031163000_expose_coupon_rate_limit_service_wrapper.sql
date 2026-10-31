-- Expose only a service-role wrapper for the private coupon preview limiter.
CREATE OR REPLACE FUNCTION public.consume_coupon_validation_rate_limit(p_ip_hash text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $wrapper$
  SELECT private.consume_coupon_validation_rate_limit(p_ip_hash);
$wrapper$;
REVOKE ALL ON FUNCTION public.consume_coupon_validation_rate_limit(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_coupon_validation_rate_limit(text) TO service_role;
