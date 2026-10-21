-- Add on-site page timing events to the existing first-party analytics stream.
-- For page_engagement rows, analytics_events.value is visible-tab duration in seconds.
alter table public.analytics_events
  drop constraint if exists analytics_events_event_name_check;

alter table public.analytics_events
  add constraint analytics_events_event_name_check
  check (event_name = any (array[
    'page_view',
    'view_item',
    'view_item_list',
    'select_item',
    'search',
    'add_to_cart',
    'view_cart',
    'begin_checkout',
    'order_submit',
    'order_success',
    'track_order',
    'whatsapp_click',
    'phone_click',
    'page_engagement'
  ]::text[]));

comment on column public.analytics_events.value is
  'For page_engagement events this stores visible-tab seconds; for other events it stores the event value in BDT when applicable.';
