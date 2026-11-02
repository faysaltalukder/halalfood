create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.business_health_order_cost_snapshots (
  order_item_id uuid primary key references public.order_items(id) on delete cascade,
  cost_price numeric(14,2),
  packaging_cost numeric(14,2) not null default 0,
  snapshot_status text not null check (snapshot_status in ('captured','missing_cost','unlinked_product')),
  captured_at timestamptz not null default now(),
  constraint business_health_cost_nonnegative check (cost_price is null or cost_price >= 0),
  constraint business_health_packaging_nonnegative check (packaging_cost >= 0)
);

alter table private.business_health_order_cost_snapshots enable row level security;
revoke all on table private.business_health_order_cost_snapshots from public, anon, authenticated;

create index if not exists business_health_cost_snapshot_captured_idx
  on private.business_health_order_cost_snapshots(captured_at desc);

create or replace function private.capture_business_health_order_item_cost()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cost numeric(14,2);
  v_packaging numeric(14,2) := 0;
  v_status text := 'unlinked_product';
begin
  if new.product_id is not null then
    select c.cost_price, c.packaging_cost
      into v_cost, v_packaging
      from public.admin_product_costs c
     where c.product_id = new.product_id;

    if found and v_cost is not null then
      v_status := 'captured';
    else
      v_cost := null;
      v_packaging := coalesce(v_packaging, 0);
      v_status := 'missing_cost';
    end if;
  end if;

  insert into private.business_health_order_cost_snapshots(
    order_item_id, cost_price, packaging_cost, snapshot_status, captured_at
  )
  values (new.id, v_cost, coalesce(v_packaging, 0), v_status, clock_timestamp())
  on conflict (order_item_id) do nothing;

  return new;
end;
$$;

revoke all on function private.capture_business_health_order_item_cost() from public, anon, authenticated;

drop trigger if exists trg_capture_business_health_order_item_cost on public.order_items;
create trigger trg_capture_business_health_order_item_cost
after insert on public.order_items
for each row execute function private.capture_business_health_order_item_cost();

create or replace function public.get_business_health_cost_snapshots(p_from date,p_to date)
returns table(order_item_id uuid,cost_price numeric,packaging_cost numeric,snapshot_status text,captured_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null
     or lower(coalesce(auth.jwt() ->> 'email','')) <> 'halalfoodbd.official@gmail.com'
     or coalesce(auth.jwt() ->> 'aal','aal1') <> 'aal2' then
    raise exception 'Business Health cost details require the authorized admin account and MFA.' using errcode='42501';
  end if;
  if p_from is null or p_to is null or p_to<p_from or (p_to-p_from)>366 then
    raise exception 'Choose a valid reporting period of 367 days or less.' using errcode='22023';
  end if;
  return query
  select s.order_item_id,s.cost_price,s.packaging_cost,s.snapshot_status,s.captured_at
    from private.business_health_order_cost_snapshots s
    join public.order_items oi on oi.id=s.order_item_id
    join public.orders o on o.id=oi.order_id
   where (o.ordered_at at time zone 'Asia/Dhaka')::date between p_from and p_to
   order by o.ordered_at desc,s.captured_at desc;
end;
$$;
revoke all on function public.get_business_health_cost_snapshots(date,date) from public,anon,authenticated;
grant execute on function public.get_business_health_cost_snapshots(date,date) to authenticated;

comment on table private.business_health_order_cost_snapshots is
  'Immutable, private per-order-item product and packaging cost captured at sale insertion for reliable historical business health reporting.';
comment on function public.get_business_health_cost_snapshots(date,date) is
  'MFA-gated read path for private order-item cost snapshots, bounded to a reporting period of at most 367 days.';
