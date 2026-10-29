alter table public.analytics_events
  add column if not exists event_id text;

drop index if exists public.analytics_events_event_id_uidx;
create unique index analytics_events_event_id_uidx
  on public.analytics_events (event_id)
  where event_id is not null;

alter table public.analytics_events
  drop constraint if exists analytics_events_event_name_check;
alter table public.analytics_events
  add constraint analytics_events_event_name_check check (
    event_name = any (array[
      'page_view','page_engagement','view_item','view_item_list','select_item','search',
      'add_to_cart','remove_from_cart','view_cart','begin_checkout','add_shipping_info',
      'add_payment_info','order_submit','order_success','purchase','track_order',
      'whatsapp_click','phone_click','sign_up','login','generate_lead','refund'
    ]::text[])
  );

comment on column public.analytics_events.event_id is
  'Unique per interaction; shared with browser Meta Pixel eventID to support event deduplication. Never store customer PII here.';

create table if not exists public.tracking_event_settings (
  destination text not null check (destination in ('meta_pixel','meta_capi','ga4')),
  event_key text not null check (event_key in (
    'page_view','page_engagement','view_item','view_item_list','select_item','search',
    'add_to_cart','remove_from_cart','view_cart','begin_checkout','add_shipping_info',
    'add_payment_info','order_submit','order_success','purchase','track_order',
    'whatsapp_click','phone_click','sign_up','login','generate_lead','refund'
  )),
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by text,
  primary key (destination, event_key)
);

alter table public.tracking_event_settings enable row level security;
revoke all on public.tracking_event_settings from anon, authenticated;
grant select, insert, update, delete on public.tracking_event_settings to authenticated;
grant all on public.tracking_event_settings to service_role;

drop policy if exists "Only admin MFA can manage tracking settings" on public.tracking_event_settings;
create policy "Only admin MFA can manage tracking settings"
on public.tracking_event_settings
for all
to authenticated
using (
  lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'halalfoodbd.official@gmail.com'
  and coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
)
with check (
  lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'halalfoodbd.official@gmail.com'
  and coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
  and (updated_by is null or lower(updated_by) = 'halalfoodbd.official@gmail.com')
);

create table if not exists public.meta_event_delivery_log (
  event_id text primary key,
  event_key text not null,
  meta_event_name text not null,
  occurred_at timestamptz not null,
  event_source_url text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','sent','failed','skipped')),
  attempts integer not null default 0 check (attempts >= 0),
  meta_http_status integer,
  meta_response jsonb not null default '{}'::jsonb,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.meta_event_delivery_log enable row level security;
revoke all on public.meta_event_delivery_log from anon, authenticated;
grant all on public.meta_event_delivery_log to service_role;
create index if not exists meta_event_delivery_log_status_created_idx
  on public.meta_event_delivery_log (status, created_at desc);

insert into public.tracking_event_settings (destination,event_key,enabled)
select destinations.destination, events.event_key,
  case
    when destinations.destination = 'meta_capi' then false
    when events.event_key = 'purchase' then false
    when destinations.destination = 'meta_pixel'
      then events.event_key = any(array[
        'page_view','view_item','search','add_to_cart','begin_checkout','whatsapp_click','phone_click'
      ]::text[])
    when destinations.destination = 'ga4'
      then events.event_key = any(array[
        'page_view','page_engagement','view_item','view_item_list','select_item','search',
        'add_to_cart','view_cart','begin_checkout','add_shipping_info','order_submit',
        'order_success','track_order','whatsapp_click','phone_click'
      ]::text[])
    else false
  end
from (values ('meta_pixel'),('meta_capi'),('ga4')) as destinations(destination)
cross join (values
  ('page_view'),('page_engagement'),('view_item'),('view_item_list'),('select_item'),('search'),
  ('add_to_cart'),('remove_from_cart'),('view_cart'),('begin_checkout'),('add_shipping_info'),
  ('add_payment_info'),('order_submit'),('order_success'),('purchase'),('track_order'),
  ('whatsapp_click'),('phone_click'),('sign_up'),('login'),('generate_lead'),('refund')
) as events(event_key)
on conflict (destination,event_key) do nothing;

comment on table public.tracking_event_settings is
  'Admin-only routing controls for Meta Pixel, Meta Conversions API and GA4. Browser-safe public config is returned only by analytics-ingest.';
comment on table public.meta_event_delivery_log is
  'Server-only Meta CAPI delivery/idempotency log. Payload must contain sanitized event fields only; do not store names, emails, phone numbers or addresses.';
