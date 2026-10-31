-- Private, atomic per-IP rate limit for the public coupon preview endpoint.
CREATE TABLE IF NOT EXISTS private.coupon_validation_rate_limits (
  ip_hash text PRIMARY KEY CHECK (ip_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON TABLE private.coupon_validation_rate_limits FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.consume_coupon_validation_rate_limit(p_ip_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $rate_limit$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_window timestamptz;
  v_count integer;
  v_limit constant integer := 20;
BEGIN
  IF p_ip_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'A valid request fingerprint is required.' USING ERRCODE='22023';
  END IF;
  INSERT INTO private.coupon_validation_rate_limits(ip_hash,window_started_at,request_count,updated_at)
  VALUES(p_ip_hash,v_now,1,v_now)
  ON CONFLICT(ip_hash) DO UPDATE SET
    window_started_at = CASE
      WHEN private.coupon_validation_rate_limits.window_started_at <= v_now - interval '1 minute'
        THEN v_now
      ELSE private.coupon_validation_rate_limits.window_started_at
    END,
    request_count = CASE
      WHEN private.coupon_validation_rate_limits.window_started_at <= v_now - interval '1 minute'
        THEN 1
      ELSE private.coupon_validation_rate_limits.request_count + 1
    END,
    updated_at = v_now
  RETURNING window_started_at,request_count INTO v_window,v_count;

  IF v_count=1 AND mod(abs(hashtext(p_ip_hash)),100)=0 THEN
    DELETE FROM private.coupon_validation_rate_limits
    WHERE updated_at < v_now - interval '2 days'
      AND ip_hash <> p_ip_hash;
  END IF;

  RETURN jsonb_build_object(
    'allowed',v_count<=v_limit,
    'limit',v_limit,
    'remaining',greatest(0,v_limit-v_count),
    'retryAfterSeconds',greatest(1,ceil(extract(epoch FROM (v_window + interval '1 minute' - v_now)))::integer)
  );
END
$rate_limit$;
REVOKE ALL ON FUNCTION private.consume_coupon_validation_rate_limit(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.consume_coupon_validation_rate_limit(text) TO service_role;
