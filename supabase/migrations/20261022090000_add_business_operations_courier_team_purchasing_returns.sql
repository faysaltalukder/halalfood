-- Halal Food Operations Center: courier placeholders, internal tasks, purchasing and returns.
-- Courier integration is intentionally manual_placeholder until a provider API is supplied.
create table if not exists public.admin_shipments (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null unique references public.orders(id) on delete restrict,
 courier_name text not null default 'Manual / Placeholder',
 tracking_id text,
 shipment_status text not null default 'draft' check (shipment_status in ('draft','ready_for_pickup','booked','picked_up','in_transit','delivered','delivery_failed','returned','cancelled')),
 integration_mode text not null default 'manual_placeholder' check (integration_mode in ('manual_placeholder','api_ready','live_api')),
 cod_amount numeric(12,2) not null default 0 check (cod_amount >= 0),
 courier_fee numeric(12,2) not null default 0 check (courier_fee >= 0),
 settlement_status text not null default 'not_applicable' check (settlement_status in ('not_applicable','pending','partial','settled')),
 settled_amount numeric(12,2) not null default 0 check (settled_amount >= 0),
 parcel_weight_kg numeric(8,3) check (parcel_weight_kg is null or parcel_weight_kg > 0),
 parcel_notes text not null default '',
 handed_over_at timestamptz,
 delivered_at timestamptz,
 created_by text not null default lower(coalesce(auth.jwt()->>'email','')),
 updated_by text not null default lower(coalesce(auth.jwt()->>'email','')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists admin_shipments_status_idx on public.admin_shipments(shipment_status, updated_at desc);
create index if not exists admin_shipments_settlement_idx on public.admin_shipments(settlement_status, updated_at desc);

create table if not exists public.admin_operational_tasks (
 id uuid primary key default gen_random_uuid(),
 title text not null check (length(trim(title)) between 2 and 180),
 department text not null default 'Operations' check (department in ('Operations','Packing','Customer service','Inventory','Finance','Marketing','Management')),
 assigned_to text not null default '',
 priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
 status text not null default 'todo' check (status in ('todo','in_progress','blocked','done','cancelled')),
 due_date date,
 related_order_id uuid references public.orders(id) on delete set null,
 notes text not null default '',
 created_by text not null default lower(coalesce(auth.jwt()->>'email','')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists admin_operational_tasks_status_idx on public.admin_operational_tasks(status, due_date);

create table if not exists public.admin_suppliers (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(trim(name)) between 2 and 180),
 contact_name text not null default '',
 phone text not null default '',
 email text not null default '',
 address text not null default '',
 notes text not null default '',
 is_active boolean not null default true,
 created_by text not null default lower(coalesce(auth.jwt()->>'email','')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists admin_suppliers_name_idx on public.admin_suppliers(name);

create table if not exists public.admin_purchase_orders (
 id uuid primary key default gen_random_uuid(),
 purchase_number text not null unique default ('PO-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
 supplier_id uuid references public.admin_suppliers(id) on delete set null,
 status text not null default 'draft' check (status in ('draft','ordered','partially_received','received','cancelled')),
 order_date date not null default current_date,
 expected_date date,
 total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
 reference text not null default '',
 notes text not null default '',
 created_by text not null default lower(coalesce(auth.jwt()->>'email','')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (expected_date is null or expected_date >= order_date)
);
create index if not exists admin_purchase_orders_status_idx on public.admin_purchase_orders(status, order_date desc);

create table if not exists public.admin_purchase_order_items (
 id uuid primary key default gen_random_uuid(),
 purchase_order_id uuid not null references public.admin_purchase_orders(id) on delete cascade,
 product_id uuid references public.products(id) on delete set null,
 product_name text not null,
 quantity numeric(12,3) not null check (quantity > 0),
 received_quantity numeric(12,3) not null default 0 check (received_quantity >= 0 and received_quantity <= quantity),
 unit_cost numeric(12,2) not null check (unit_cost >= 0),
 line_total numeric(12,2) not null check (line_total >= 0),
 created_at timestamptz not null default now()
);
create index if not exists admin_purchase_order_items_po_idx on public.admin_purchase_order_items(purchase_order_id);

create table if not exists public.admin_return_requests (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete restrict,
 return_number text not null unique default ('RET-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
 reason text not null check (length(trim(reason)) between 2 and 500),
 status text not null default 'requested' check (status in ('requested','approved','rejected','awaiting_item','received','inspected','refunded','exchanged','closed')),
 item_condition text not null default 'unknown' check (item_condition in ('unknown','resellable','damaged','incomplete')),
 refund_amount numeric(12,2) not null default 0 check (refund_amount >= 0),
 restock_approved boolean not null default false,
 notes text not null default '',
 created_by text not null default lower(coalesce(auth.jwt()->>'email','')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists admin_return_requests_status_idx on public.admin_return_requests(status, created_at desc);

do $$
declare t text;
begin
 foreach t in array array['admin_shipments','admin_operational_tasks','admin_suppliers','admin_purchase_orders','admin_purchase_order_items','admin_return_requests']
 loop
  execute format('alter table public.%I enable row level security', t);
  execute format('drop policy if exists "Admin operations access with MFA" on public.%I', t);
  execute format('create policy "Admin operations access with MFA" on public.%I for all to authenticated using (lower(coalesce(auth.jwt()->>''email'','''')) = ''halalfoodbd.official@gmail.com'' and coalesce(auth.jwt()->>''aal'',''aal1'') = ''aal2'') with check (lower(coalesce(auth.jwt()->>''email'','''')) = ''halalfoodbd.official@gmail.com'' and coalesce(auth.jwt()->>''aal'',''aal1'') = ''aal2'')', t);
 end loop;
end $$;

comment on table public.admin_shipments is 'Operational courier and COD tracking records. API remains disabled until a real courier integration is configured.';
comment on table public.admin_operational_tasks is 'Internal daily operations and team task tracking.';
comment on table public.admin_suppliers is 'Supplier contact directory for purchase planning.';
comment on table public.admin_purchase_orders is 'Purchase orders for replenishing inventory; receiving stock must be recorded separately.';
comment on table public.admin_return_requests is 'Return, exchange, inspection and refund workflow. Stock is not automatically returned when a return is created.';
