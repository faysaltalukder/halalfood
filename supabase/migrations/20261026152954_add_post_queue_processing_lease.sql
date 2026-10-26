
ALTER TABLE public.post_queue
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;

CREATE OR REPLACE FUNCTION public.claim_due_posts_with_daily_limit(
  p_platform text,
  p_limit integer,
  p_daily_limit integer
)
RETURNS SETOF public.post_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_day date := (now() AT TIME ZONE 'Asia/Dhaka')::date;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_published integer := 0;
  v_meta_scheduled integer := 0;
  v_reserved integer := 0;
  v_remaining integer := 0;
  v_take integer := 0;
BEGIN
  IF p_platform <> 'facebook' OR p_limit IS NULL OR p_limit < 1
     OR p_daily_limit IS NULL OR p_daily_limit < 1 THEN
    RETURN;
  END IF;

  v_day_start := v_day::timestamp AT TIME ZONE 'Asia/Dhaka';
  v_day_end := (v_day + 1)::timestamp AT TIME ZONE 'Asia/Dhaka';

  -- Serialize quota reservation for this platform and Bangladesh-local day.
  PERFORM pg_advisory_xact_lock(hashtext('post-dispatcher-quota:' || p_platform || ':' || v_day::text));

  -- Repair rows whose publish history was saved but the queue status update did not finish.
  UPDATE public.post_queue q
  SET status = 'published',
      error = NULL,
      processing_started_at = NULL,
      permalink = COALESCE(q.permalink, h.permalink_url)
  FROM public.facebook_publish_history h
  WHERE q.platform = p_platform
    AND q.status = 'processing'
    AND q.external_id IS NOT NULL
    AND h.facebook_post_id = q.external_id
    AND h.status = 'published';

  -- An abandoned worker lease is marked uncertain, never automatically retried.
  UPDATE public.post_queue q
  SET status = 'failed',
      error = 'OUTCOME UNCERTAIN: dispatcher lease expired. Verify the Facebook Page before manual recovery.',
      processing_started_at = COALESCE(q.processing_started_at, now())
  WHERE q.platform = p_platform
    AND q.status = 'processing'
    AND (
      q.processing_started_at IS NULL
      OR q.processing_started_at < now() - interval '20 minutes'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.facebook_publish_history h
      WHERE h.facebook_post_id = q.external_id AND h.status = 'published'
    );

  SELECT count(*)::integer INTO v_published
  FROM public.facebook_publish_history
  WHERE status = 'published'
    AND published_at >= v_day_start AND published_at < v_day_end;

  SELECT count(*)::integer INTO v_meta_scheduled
  FROM public.facebook_publish_history
  WHERE status = 'scheduled'
    AND scheduled_at >= v_day_start AND scheduled_at < v_day_end;

  SELECT count(*)::integer INTO v_reserved
  FROM public.post_queue q
  WHERE q.platform = p_platform
    AND (
      (q.status = 'pending' AND q.publish_at >= v_day_start AND q.publish_at < v_day_end)
      OR (
        q.status = 'processing'
        AND NOT EXISTS (
          SELECT 1 FROM public.facebook_publish_history h
          WHERE h.facebook_post_id = q.external_id AND h.status = 'published'
        )
      )
      OR (
        q.status = 'failed'
        AND q.error LIKE 'OUTCOME UNCERTAIN:%'
        AND q.processing_started_at >= v_day_start AND q.processing_started_at < v_day_end
        AND NOT EXISTS (
          SELECT 1 FROM public.facebook_publish_history h
          WHERE h.facebook_post_id = q.external_id AND h.status = 'published'
        )
      )
      OR (
        q.status = 'published'
        AND q.publish_at >= v_day_start AND q.publish_at < v_day_end
        AND NOT EXISTS (
          SELECT 1 FROM public.facebook_publish_history h
          WHERE h.facebook_post_id = q.external_id AND h.status = 'published'
        )
      )
    );

  v_remaining := p_daily_limit - v_published - v_meta_scheduled - v_reserved;
  IF v_remaining < 1 THEN
    RETURN;
  END IF;

  v_take := LEAST(p_limit, v_remaining);

  RETURN QUERY
  WITH claimed AS (
    SELECT q.id
    FROM public.post_queue q
    WHERE q.status = 'pending'
      AND q.platform = p_platform
      AND q.publish_at <= now()
    ORDER BY q.publish_at, q.created_at
    LIMIT v_take
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.post_queue q
  SET status = 'processing',
      processing_started_at = now(),
      error = NULL
  FROM claimed
  WHERE q.id = claimed.id
  RETURNING q.*;
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_due_posts_with_daily_limit(text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_due_posts_with_daily_limit(text, integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_posts_with_daily_limit(text, integer, integer) TO service_role;
