-- Finance & Cash Flow workspace v1.
-- Additive only: preserves historic finance entries and existing Supplier Payment synchronization.

create table if not exists public.admin_finance_accounts (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(trim(name)) between 2 and 100),
 account_type text not null check (account_type in ('cash','bank','bkash','nagad','rocket','courier_clearing','other')),
 provider text not null default '',
 account_reference text not null default '',
 opening_balance numeric(12,2) not null default 0 check (opening_balance >= 0),
 opening_date date not null default current_date,
 is_active boolean not null default true,
 created_by text not null default lower(coalesce(auth.jwt()->>'email','')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists admin_finance_accounts_active_idx on public.admin_finance_accounts(is_active,name);

create table if not exists public.admin_finance_transfers (
 id uuid primary key default gen_random_uuid(),
 source_account_id uuid not null references public.admin_finance_accounts(id) on delete restrict,
 destination_account_id uuid not null references public.admin_finance_accounts(id) on delete restrict,
 transfer_date date not null default current_date,
 amount numeric(12,2) not null check (amount > 0),
 reference text,
 description text not null default '',
 status text not null default 'draft' check (status in ('draft','confirmed','void')),
 created_by text not null default lower(coalesce(auth.jwt()->>'email','')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint admin_finance_transfer_distinct_accounts check (source_account_id <> destination_account_id)
);
create index if not exists admin_finance_transfers_date_idx on public.admin_finance_transfers(transfer_date desc);
create index if not exists admin_finance_transfers_source_idx on public.admin_finance_transfers(source_account_id,status);
create index if not exists admin_finance_transfers_destination_idx on public.admin_finance_transfers(destination_account_id,status);

create table if not exists public.admin_finance_budgets (
 id uuid primary key default gen_random_uuid(),
 category text not null check (length(trim(category)) between 1 and 80),
 period_start date not null,
 budget_amount numeric(12,2) not null check (budget_amount > 0),
 notes text not null default '',
 status text not null default 'active' check (status in ('active','archived')),
 created_by text not null default lower(coalesce(auth.jwt()->>'email','')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint admin_finance_budget_month_start check (extract(day from period_start)=1)
);
create unique index if not exists admin_finance_budgets_category_period_uidx on public.admin_finance_budgets(lower(category),period_start);
create index if not exists admin_finance_budgets_period_idx on public.admin_finance_budgets(period_start desc,status);

create table if not exists public.admin_cod_settlements (
 id uuid primary key default gen_random_uuid(),
 order_id uuid references public.orders(id) on delete set null,
 order_number text not null check (length(trim(order_number)) between 1 and 80),
 customer_name text not null default '',
 courier_name text not null default '',
 tracking_reference text not null default '',
 cod_amount numeric(12,2) not null check (cod_amount >= 0),
 collected_amount numeric(12,2) not null default 0 check (collected_amount >= 0),
 courier_fee numeric(12,2) not null default 0 check (courier_fee >= 0),
 adjustment_amount numeric(12,2) not null default 0,
 remitted_amount numeric(12,2) not null default 0 check (remitted_amount >= 0),
 remitted_account_id uuid references public.admin_finance_accounts(id) on delete restrict,
 status text not null default 'pending' check (status in ('pending','collected','remitted','reconciled','exception','cancelled')),
 collected_at date,
 remitted_at date,
 notes text not null default '',
 created_by text not null default lower(coalesce(auth.jwt()->>'email','')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint admin_cod_reconciled_requires_verified_remittance
  check (status <> 'reconciled' or (remitted_amount > 0 and remitted_account_id is not null and remitted_at is not null))
);
create unique index if not exists admin_cod_settlements_order_uidx on public.admin_cod_settlements(order_id) where order_id is not null;
create index if not exists admin_cod_settlements_status_date_idx on public.admin_cod_settlements(status,created_at desc);
create index if not exists admin_cod_settlements_courier_idx on public.admin_cod_settlements(courier_name,status);

alter table public.admin_finance_entries
 add column if not exists account_id uuid,
 add column if not exists payment_method text not null default '',
 add column if not exists party_name text not null default '',
 add column if not exists financial_class text not null default 'operating',
 add column if not exists related_cod_settlement_id uuid;

alter table public.admin_finance_entries
 add constraint admin_finance_entries_account_id_fkey
 foreign key (account_id) references public.admin_finance_accounts(id) on delete set null;
alter table public.admin_finance_entries
 add constraint admin_finance_entries_cod_settlement_id_fkey
 foreign key (related_cod_settlement_id) references public.admin_cod_settlements(id) on delete set null;
alter table public.admin_finance_entries
 add constraint admin_finance_entries_financial_class_check
 check (financial_class in ('operating','capital','loan','refund','adjustment'));

create unique index if not exists admin_finance_entries_cod_settlement_uidx
 on public.admin_finance_entries(related_cod_settlement_id) where related_cod_settlement_id is not null;
create index if not exists admin_finance_entries_account_date_idx
 on public.admin_finance_entries(account_id,entry_date desc,status);
create index if not exists admin_finance_entries_class_status_idx
 on public.admin_finance_entries(financial_class,status);

-- Explicit grants are required for new public-schema tables; RLS remains the row-level boundary.
grant select,insert,update,delete on public.admin_finance_accounts, public.admin_finance_transfers,
 public.admin_finance_budgets, public.admin_cod_settlements to authenticated;
revoke all on public.admin_finance_accounts, public.admin_finance_transfers,
 public.admin_finance_budgets, public.admin_cod_settlements from anon;

alter table public.admin_finance_accounts enable row level security;
alter table public.admin_finance_transfers enable row level security;
alter table public.admin_finance_budgets enable row level security;
alter table public.admin_cod_settlements enable row level security;

drop policy if exists "Finance account admin access" on public.admin_finance_accounts;
create policy "Finance account admin access" on public.admin_finance_accounts for all to authenticated
 using (lower(coalesce((select auth.jwt()->>'email'),''))='halalfoodbd.official@gmail.com'
  and coalesce((select auth.jwt()->>'aal'),'aal1')='aal2')
 with check (lower(coalesce((select auth.jwt()->>'email'),''))='halalfoodbd.official@gmail.com'
  and coalesce((select auth.jwt()->>'aal'),'aal1')='aal2'
  and lower(coalesce(created_by,''))=lower(coalesce((select auth.jwt()->>'email'),'')));

drop policy if exists "Finance transfer admin access" on public.admin_finance_transfers;
create policy "Finance transfer admin access" on public.admin_finance_transfers for all to authenticated
 using (lower(coalesce((select auth.jwt()->>'email'),''))='halalfoodbd.official@gmail.com'
  and coalesce((select auth.jwt()->>'aal'),'aal1')='aal2')
 with check (lower(coalesce((select auth.jwt()->>'email'),''))='halalfoodbd.official@gmail.com'
  and coalesce((select auth.jwt()->>'aal'),'aal1')='aal2'
  and lower(coalesce(created_by,''))=lower(coalesce((select auth.jwt()->>'email'),'')));

drop policy if exists "Finance budget admin access" on public.admin_finance_budgets;
create policy "Finance budget admin access" on public.admin_finance_budgets for all to authenticated
 using (lower(coalesce((select auth.jwt()->>'email'),''))='halalfoodbd.official@gmail.com'
  and coalesce((select auth.jwt()->>'aal'),'aal1')='aal2')
 with check (lower(coalesce((select auth.jwt()->>'email'),''))='halalfoodbd.official@gmail.com'
  and coalesce((select auth.jwt()->>'aal'),'aal1')='aal2'
  and lower(coalesce(created_by,''))=lower(coalesce((select auth.jwt()->>'email'),'')));

drop policy if exists "COD settlement admin access" on public.admin_cod_settlements;
create policy "COD settlement admin access" on public.admin_cod_settlements for all to authenticated
 using (lower(coalesce((select auth.jwt()->>'email'),''))='halalfoodbd.official@gmail.com'
  and coalesce((select auth.jwt()->>'aal'),'aal1')='aal2')
 with check (lower(coalesce((select auth.jwt()->>'email'),''))='halalfoodbd.official@gmail.com'
  and coalesce((select auth.jwt()->>'aal'),'aal1')='aal2'
  and lower(coalesce(created_by,''))=lower(coalesce((select auth.jwt()->>'email'),'')));

-- Preserve Supplier Payment row protection and extend it to generated COD ledger items.
create or replace function public.guard_supplier_linked_finance_entries()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if current_setting('app.supplier_payment_sync',true)='on'
  or current_setting('app.cod_settlement_sync',true)='on' then
  if tg_op='DELETE' then return old; end if;
  return new;
 end if;
 if tg_op='INSERT' then
  if new.related_supplier_payment_id is not null or new.related_cod_settlement_id is not null then
   raise exception 'Linked supplier or COD settlement entries are created by their source workflow only.';
  end if;
  return new;
 elsif tg_op='UPDATE' then
  if old.related_supplier_payment_id is not null or new.related_supplier_payment_id is not null
   or old.related_cod_settlement_id is not null or new.related_cod_settlement_id is not null then
   raise exception 'Update or reverse this linked entry from its source workflow, not from the general Finance ledger.';
  end if;
  return new;
 elsif tg_op='DELETE' then
  if old.related_supplier_payment_id is not null or old.related_cod_settlement_id is not null then
   raise exception 'Linked finance records cannot be deleted; void or reverse them from their source workflow.';
  end if;
  return old;
 end if;
 return null;
end $$;
revoke all on function public.guard_supplier_linked_finance_entries() from public,anon,authenticated;

create or replace function public.sync_cod_settlement_finance_entry()
returns trigger language plpgsql security invoker set search_path='' as $$
declare v_entry_date date;
begin
 perform pg_catalog.set_config('app.cod_settlement_sync','on',true);
 if new.status='reconciled' then
  v_entry_date:=coalesce(new.remitted_at,now()::date);
  insert into public.admin_finance_entries(
   entry_type,category,amount,entry_date,description,reference,status,related_order_id,
   account_id,party_name,financial_class,related_cod_settlement_id,created_by
  ) values (
   'income','COD settlement',new.remitted_amount,v_entry_date,
   'Verified COD remittance for '||new.order_number,
   coalesce(nullif(new.tracking_reference,''),new.order_number),'confirmed',new.order_id,
   new.remitted_account_id,coalesce(nullif(new.courier_name,''),'Courier'),'operating',
   new.id,lower(coalesce((select auth.jwt()->>'email'),new.created_by,''))
  )
  on conflict (related_cod_settlement_id) where related_cod_settlement_id is not null
  do update set amount=excluded.amount,entry_date=excluded.entry_date,description=excluded.description,
   reference=excluded.reference,related_order_id=excluded.related_order_id,account_id=excluded.account_id,
   party_name=excluded.party_name,status='confirmed',updated_at=now();
 else
  update public.admin_finance_entries set status='void',updated_at=now()
   where related_cod_settlement_id=new.id and status<>'void';
 end if;
 return new;
end $$;
revoke all on function public.sync_cod_settlement_finance_entry() from public,anon,authenticated;
drop trigger if exists admin_cod_settlement_sync_finance on public.admin_cod_settlements;
create trigger admin_cod_settlement_sync_finance after insert or update on public.admin_cod_settlements
 for each row execute function public.sync_cod_settlement_finance_entry();

comment on table public.admin_finance_accounts is 'Manually maintained cash and payment accounts. Current balances are derived from opening balances, assigned confirmed finance entries and transfers.';
comment on table public.admin_finance_transfers is 'Internal account transfers. Confirmed transfers change account balances but are not income or expense.';
comment on table public.admin_finance_budgets is 'Monthly expense budgets by category. Budgets are planning targets, not cash transactions.';
comment on table public.admin_cod_settlements is 'Manual COD collection and remittance tracking. Only a reconciled, verified remittance creates one linked confirmed Finance income record.';
comment on column public.admin_finance_entries.financial_class is 'Separates operating activity, owner capital, loans, refunds and adjustments without misclassifying them as ordinary operating income or expense.';
