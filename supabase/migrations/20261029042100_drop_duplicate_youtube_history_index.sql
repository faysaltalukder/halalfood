-- Remove a redundant index. The retained index
-- youtube_publish_history_channel_created_idx has the same key columns and order.
DROP INDEX IF EXISTS public.youtube_publish_history_channel_idx;
