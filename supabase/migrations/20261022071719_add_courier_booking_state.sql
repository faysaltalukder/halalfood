-- Add safe idempotency and minimal provider tracking metadata to courier bookings.
alter table public.admin_shipments
  add column if not exists booking_state text not null default 'not_started',
  add column if not exists booking_error text not null default '',
  add column if not exists booking_requested_at timestamptz,
  add column if not exists provider_order_id text,
  add column if not exists provider_response jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.admin_shipments'::regclass
      and conname = 'admin_shipments_booking_state_check'
  ) then
    alter table public.admin_shipments
      add constraint admin_shipments_booking_state_check
      check (booking_state in ('not_started','in_progress','succeeded','failed','unknown'));
  end if;
end $$;

create index if not exists admin_shipments_booking_state_idx
  on public.admin_shipments(booking_state, updated_at desc);

comment on column public.admin_shipments.booking_state is
  'Server-side courier booking idempotency state; unknown means the provider response was ambiguous and must be checked before retry.';
comment on column public.admin_shipments.provider_response is
  'Minimal courier response metadata only. Never store credentials or raw customer payloads here.';
