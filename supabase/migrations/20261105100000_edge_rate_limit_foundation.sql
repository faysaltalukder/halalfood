-- Shared atomic rate-limit buckets for public Edge Function entrypoints.
-- Keys are HMACed in Edge Functions; raw IPs, phone numbers and visitor IDs are never stored.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.edge_rate_limit_counters (
  scope text NOT NULL CHECK (scope ~ '^[a-z][a-z0-9_-]{1,48}$'),
  key_hash text NOT NULL CHECK (key_hash ~ '^[a-f0-9]{64}$'),
  window_start timestamptz NOT NULL,
  hits integer NOT NULL CHECK (hits >= 1),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (scope, key_hash, window_start)
);
ALTER TABLE private.edge_rate_limit_counters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.edge_rate_limit_counters FROM PUBLIC, anon, authenticated, service_role;
CREATE INDEX IF NOT EXISTS edge_rate_limit_counters_window_idx
  ON private.edge_rate_limit_counters (window_start);

CREATE OR REPLACE FUNCTION public.consume_edge_rate_limit(
  p_scope text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $rate_limit$
DECLARE
  v_window_seconds integer := least(greatest(coalesce(p_window_seconds, 60), 1), 86400);
  v_limit integer := least(greatest(coalesce(p_limit, 1), 1), 10000);
  v_window_start timestamptz;
  v_hits integer;
BEGIN
  IF p_scope IS NULL OR p_scope !~ '^[a-z][a-z0-9_-]{1,48}$'
     OR p_key_hash IS NULL OR p_key_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid rate-limit key.' USING ERRCODE='22023';
  END IF;

  v_window_start := pg_catalog.to_timestamp(
    pg_catalog.floor(pg_catalog.date_part('epoch', pg_catalog.clock_timestamp()) / v_window_seconds) * v_window_seconds
  );

  INSERT INTO private.edge_rate_limit_counters(scope, key_hash, window_start, hits, updated_at)
  VALUES (p_scope, p_key_hash, v_window_start, 1, pg_catalog.clock_timestamp())
  ON CONFLICT (scope, key_hash, window_start)
  DO UPDATE SET hits = private.edge_rate_limit_counters.hits + 1,
                updated_at = pg_catalog.clock_timestamp()
  RETURNING hits INTO v_hits;

  IF pg_catalog.random() < 0.01 THEN
    DELETE FROM private.edge_rate_limit_counters
    WHERE window_start < pg_catalog.clock_timestamp() - interval '1 day';
  END IF;

  RETURN v_hits <= v_limit;
END
$rate_limit$;

REVOKE ALL ON FUNCTION public.consume_edge_rate_limit(text,text,integer,integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_edge_rate_limit(text,text,integer,integer)
  TO service_role;

COMMENT ON FUNCTION public.consume_edge_rate_limit(text,text,integer,integer)
  IS 'Atomic private rate-limit counter; callable only by service_role. Client identifiers must be HMACed before passing.';
