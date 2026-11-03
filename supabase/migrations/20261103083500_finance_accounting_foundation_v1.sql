-- Finance Accounting Foundation v1
-- Additive, no backfill from operational cashbook records.
-- Posted journals become the source of truth for General Ledger and Trial Balance.
-- The existing admin_finance_entries table remains the operational cashbook until Phase 2 integration.

create table if not exists public.admin_finance_chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  account_code text not null unique check (account_code ~ '^[0-9]{4,6}$'),
  name text not null check (length(btrim(name)) between 2 and 120),
  account_type text not null check (account_type in ('asset','liability','equity','revenue','contra_revenue','cost_of_sales','expense','other_income')),
  normal_balance text not null check (normal_balance in ('debit','credit')),
  parent_account_id uuid references public.admin_finance_chart_of_accounts(id) on delete restrict,
  is_postable boolean not null default true,
  is_system boolean not null default false,
  is_active boolean not null default true,
  description text not null default '',
  created_by text not null default lower(coalesce(auth.jwt()->>'email','')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_finance_coa_not_self_parent check (parent_account_id is null or parent_account_id <> id)
);
create unique index if not exists admin_finance_coa_name_uidx
  on public.admin_finance_chart_of_accounts (lower(name));
create index if not exists admin_finance_coa_parent_idx
  on public.admin_finance_chart_of_accounts(parent_account_id, account_code);

with seed(account_code,name,account_type,normal_balance,parent_code,is_postable,description) as (
  values
  ('1000','Assets','asset','debit',null,false,'Assets controlled by the business'),
  ('1010','Cash in Hand','asset','debit','1000',true,'Physical cash held by the business'),
  ('1020','Bank Accounts','asset','debit','1000',true,'Current and savings bank balances'),
  ('1030','Mobile Wallets','asset','debit','1000',true,'bKash, Nagad, Rocket and other business wallets'),
  ('1040','Courier Clearing','asset','debit','1000',true,'COD amounts collected by couriers but not yet received in a business account'),
  ('1100','Accounts Receivable','asset','debit','1000',true,'Amounts due from customers'),
  ('1200','Inventory Asset','asset','debit','1000',true,'Cost value of saleable inventory'),
  ('1210','VAT / Tax Recoverable','asset','debit','1000',true,'Recoverable input tax, subject to accountant review'),
  ('1300','Prepaid Expenses','asset','debit','1000',true,'Expenses paid in advance'),
  ('1500','Fixed Assets','asset','debit','1000',false,'Long-lived assets owned by the business'),
  ('1510','Equipment & Furniture','asset','debit','1500',true,'Equipment, furniture and business devices'),
  ('2000','Liabilities','liability','credit',null,false,'Amounts owed by the business'),
  ('2010','Accounts Payable','liability','credit','2000',true,'Amounts due to suppliers'),
  ('2020','Customer Advances','liability','credit','2000',true,'Customer money received before revenue is recognized'),
  ('2030','VAT / Tax Payable','liability','credit','2000',true,'Tax payable, subject to accountant review'),
  ('2040','Loans Payable','liability','credit','2000',true,'Outstanding principal owed to lenders'),
  ('3000','Equity','equity','credit',null,false,'Owner equity and accumulated results'),
  ('3010','Owner Capital','equity','credit','3000',true,'Capital introduced by the owner'),
  ('3020','Owner Drawings','equity','debit','3000',true,'Cash or assets withdrawn by the owner'),
  ('3030','Retained Earnings','equity','credit','3000',true,'Accumulated retained business results'),
  ('4000','Revenue','revenue','credit',null,false,'Operating revenue'),
  ('4010','Product Sales','revenue','credit','4000',true,'Recognized product sales'),
  ('4020','Delivery Income','revenue','credit','4000',true,'Delivery charges earned'),
  ('4090','Other Operating Income','other_income','credit','4000',true,'Other operating income'),
  ('4095','Sales Returns & Allowances','contra_revenue','debit','4000',true,'Sales returns, discounts and allowances that reduce revenue'),
  ('5000','Cost of Sales','cost_of_sales','debit',null,false,'Costs directly attributable to products sold'),
  ('5010','Cost of Goods Sold','cost_of_sales','debit','5000',true,'Recognized cost of inventory sold'),
  ('5020','Freight Inward & Purchase Handling','cost_of_sales','debit','5000',true,'Inbound freight and purchase handling included in landed cost'),
  ('6000','Operating Expenses','expense','debit',null,false,'Day-to-day operating costs'),
  ('6010','Marketing & Advertising','expense','debit','6000',true,'Advertising and marketing costs'),
  ('6020','Courier & Delivery Expense','expense','debit','6000',true,'Courier and outbound delivery costs'),
  ('6030','Packaging Expense','expense','debit','6000',true,'Packaging and fulfilment materials'),
  ('6040','Salaries & Wages','expense','debit','6000',true,'Employee and contractor wages'),
  ('6050','Rent Expense','expense','debit','6000',true,'Office, shop or storage rent'),
  ('6060','Utilities Expense','expense','debit','6000',true,'Electricity, internet, water and utilities'),
  ('6070','Bank & Payment Charges','expense','debit','6000',true,'Bank, wallet and payment processing charges'),
  ('6080','Office & Administration','expense','debit','6000',true,'Stationery, administration and office costs'),
  ('6090','Repairs & Maintenance','expense','debit','6000',true,'Repairs and maintenance costs'),
  ('6095','Other Operating Expense','expense','debit','6000',true,'Other approved operating expenses'),
  ('7000','Other Expenses','expense','debit',null,false,'Non-operating and period-end expenses'),
  ('7010','Interest Expense','expense','debit','7000',true,'Interest and borrowing charges'),
  ('7020','Depreciation Expense','expense','debit','7000',true,'Period depreciation expense')
)
insert into public.admin_finance_chart_of_accounts
  (account_code,name,account_type,normal_balance,is_postable,is_system,description)
select account_code,name,account_type,normal_balance,is_postable,true,description
from seed
on conflict (account_code) do nothing;

with parents(child_code,parent_code) as (
  values
  ('1010','1000'),('1020','1000'),('1030','1000'),('1040','1000'),('1100','1000'),('1200','1000'),('1210','1000'),('1300','1000'),('1500','1000'),
  ('1510','1500'),
  ('2010','2000'),('2020','2000'),('2030','2000'),('2040','2000'),
  ('3010','3000'),('3020','3000'),('3030','3000'),
  ('4010','4000'),('4020','4000'),('4090','4000'),('4095','4000'),
  ('5010','5000'),('5020','5000'),
  ('6010','6000'),('6020','6000'),('6030','6000'),('6040','6000'),('6050','6000'),('6060','6000'),('6070','6000'),('6080','6000'),('6090','6000'),('6095','6000'),
  ('7010','7000'),('7020','7000')
)
update public.admin_finance_chart_of_accounts child
set parent_account_id=parent.id
from parents p
join public.admin_finance_chart_of_accounts parent on parent.account_code=p.parent_code
where child.account_code=p.child_code and child.parent_account_id is null;

create table if not exists public.admin_finance_periods (
  period_start date primary key,
  period_end date not null,
  status text not null default 'open' check (status in ('open','closed','locked')),
  notes text not null default '',
  created_by text not null default lower(coalesce(auth.jwt()->>'email','')),
  created_at timestamptz not null default now(),
  closed_by text,
  closed_at timestamptz,
  locked_by text,
  locked_at timestamptz,
  constraint admin_finance_period_month_start check (period_start = date_trunc('month',period_start)::date),
  constraint admin_finance_period_month_end check (period_end = (date_trunc('month',period_start) + interval '1 month - 1 day')::date)
);
create index if not exists admin_finance_periods_status_idx
  on public.admin_finance_periods(status,period_start desc);

create table if not exists public.admin_finance_journal_entries (
  id uuid primary key default gen_random_uuid(),
  journal_number bigint generated by default as identity unique,
  entry_date date not null default current_date,
  description text not null check (length(btrim(description)) between 3 and 500),
  source_type text not null default 'manual' check (length(btrim(source_type)) between 1 and 40),
  source_key text,
  currency text not null default 'BDT' check (currency='BDT'),
  total_debit numeric(14,2) not null default 0 check (total_debit >= 0),
  total_credit numeric(14,2) not null default 0 check (total_credit >= 0),
  status text not null default 'draft' check (status in ('draft','posted','reversed')),
  reversal_of uuid references public.admin_finance_journal_entries(id) on delete restrict,
  reversed_by uuid references public.admin_finance_journal_entries(id) on delete restrict,
  created_by text not null default lower(coalesce(auth.jwt()->>'email','')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  posted_by text,
  posted_at timestamptz,
  constraint admin_finance_journal_reversal_direction check (reversal_of is null or reversed_by is null)
);
create unique index if not exists admin_finance_journal_source_uidx
  on public.admin_finance_journal_entries(source_type,source_key)
  where source_key is not null;
create unique index if not exists admin_finance_journal_reversal_uidx
  on public.admin_finance_journal_entries(reversal_of)
  where reversal_of is not null;
create index if not exists admin_finance_journal_date_status_idx
  on public.admin_finance_journal_entries(entry_date desc,status);
create index if not exists admin_finance_journal_created_idx
  on public.admin_finance_journal_entries(created_at desc);

create table if not exists public.admin_finance_journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.admin_finance_journal_entries(id) on delete restrict,
  line_no integer not null check (line_no > 0),
  account_id uuid not null references public.admin_finance_chart_of_accounts(id) on delete restrict,
  description text not null default '',
  party_name text not null default '',
  debit numeric(14,2) not null default 0 check (debit >= 0),
  credit numeric(14,2) not null default 0 check (credit >= 0),
  created_at timestamptz not null default now(),
  constraint admin_finance_journal_line_one_side_only check (
    (debit > 0 and credit = 0) or (credit > 0 and debit = 0)
  ),
  constraint admin_finance_journal_line_no_uidx unique(journal_entry_id,line_no)
);
create index if not exists admin_finance_journal_lines_account_idx
  on public.admin_finance_journal_lines(account_id,journal_entry_id);

create table if not exists public.admin_finance_journal_events (
  id bigint generated by default as identity primary key,
  journal_entry_id uuid not null references public.admin_finance_journal_entries(id) on delete restrict,
  action text not null,
  actor_email text not null,
  event_at timestamptz not null default now(),
  before_data jsonb,
  after_data jsonb
);
create index if not exists admin_finance_journal_events_entry_idx
  on public.admin_finance_journal_events(journal_entry_id,event_at desc);
create index if not exists admin_finance_journal_events_date_idx
  on public.admin_finance_journal_events(event_at desc);

-- Public-schema tables are explicitly granted because newly created tables are not automatically
-- exposed by the Data API in current Supabase projects. No public/anon access is granted.
revoke all on public.admin_finance_chart_of_accounts,public.admin_finance_periods,
  public.admin_finance_journal_entries,public.admin_finance_journal_lines,
  public.admin_finance_journal_events from public,anon;
grant select on public.admin_finance_chart_of_accounts to authenticated;
grant select,insert,update on public.admin_finance_periods to authenticated;
grant select,insert,update on public.admin_finance_journal_entries to authenticated;
grant select,insert,update,delete on public.admin_finance_journal_lines to authenticated;
grant select on public.admin_finance_journal_events to authenticated;

alter table public.admin_finance_chart_of_accounts enable row level security;
alter table public.admin_finance_periods enable row level security;
alter table public.admin_finance_journal_entries enable row level security;
alter table public.admin_finance_journal_lines enable row level security;
alter table public.admin_finance_journal_events enable row level security;

drop policy if exists "Finance accounting chart read" on public.admin_finance_chart_of_accounts;
create policy "Finance accounting chart read"
on public.admin_finance_chart_of_accounts as permissive for select to authenticated
using (lower(coalesce((select auth.jwt()->>'email'),''))='halalfoodbd.official@gmail.com');

drop policy if exists "Finance accounting chart MFA" on public.admin_finance_chart_of_accounts;
create policy "Finance accounting chart MFA"
on public.admin_finance_chart_of_accounts as restrictive for select to authenticated
using (
  lower(coalesce((select auth.jwt()->>'email'),''))='halalfoodbd.official@gmail.com'
  and coalesce((select auth.jwt()->>'aal'),'aal1')='aal2'
);

drop policy if exists "Finance accounting periods admin access" on public.admin_finance_periods;
create policy "Finance accounting periods admin access"
on public.admin_finance_periods as permissive for all to authenticated
using (lower(coalesce((select auth.jwt()->>'email'),''))='halalfoodbd.official@gmail.com')
with check (
  lower(coalesce((select auth.jwt()->>'email'),''))='halalfoodbd.official@gmail.com'
  and lower(coalesce(created_by,''))=lower(coalesce((select auth.jwt()->>'email'),'' ))
);

drop policy if exists "Finance accounting periods require MFA" on public.admin_finance_periods;
create policy "Finance accounting periods require MFA"
on public.admin_finance_periods as restrictive for all to authenticated
using (
  lower(coalesce((select auth.jwt()->>'email'),''))='halalfoodbd.official@gmail.com'
  and coalesce((select auth.jwt()->>'aal'),'aal1')='aal2'
)
with check (
  lower(coalesce((select auth.jwt()->>'email'),''))='halalfoodbd.official@gmail.com'
  and coalesce((select auth.jwt()->>'aal'),'aal1')='aal2'
  and lower(coalesce(created_by,''))=lower(coalesce((select auth.jwt()->>'email'),'' ))
);

drop policy if exists "Finance journals admin access" on public.admin_finance_journal_entries;
create policy "Finance journals admin access"
on public.admin_finance_journal_entries as permissive for all to authenticated
using (lower(coalesce((select auth.jwt()->>'email'),''))='halalfoodbd.official@gmail.com')
with check (
  lower(coalesce((select auth.jwt()->>'email'),''))='halalfoodbd.official@gmail.com'
  and lower(coalesce(created_by,''))=lower(coalesce((select auth.jwt()->>'email'),'' ))
);

drop policy if exists "Finance journals require MFA" on public.admin_finance_journal_entries;
create policy "Finance journals require MFA"
on public.admin_finance_journal_entries as restrictive for all to authenticated
using (
  lower(coalesce((select auth.jwt()->>'email'),''))='halalfoodbd.official@gmail.com'
  and coalesce((select auth.jwt()->>'aal'),'aal1')='aal2'
)
with check (
  lower(coalesce((select auth.jwt()->>'email'),''))='halalfoodbd.official@gmail.com'
  and coalesce((select auth.jwt()->>'aal'),'aal1')='aal2'
  and lower(coalesce(created_by,''))=lower(coalesce((select auth.jwt()->>'email'),'' ))
);

drop policy if exists "Finance journal lines admin access" on public.admin_finance_journal_lines;
create policy "Finance journal lines admin access"
on public.admin_finance_journal_lines as permissive for all to authenticated
using (lower(coalesce((select auth.jwt()->>'email'),''))='halalfoodbd.official@gmail.com')
with check (lower(coalesce((select auth.jwt()->>'email'),''))='halalfoodbd.official@gmail.com');

drop policy if exists "Finance journal lines require MFA" on public.admin_finance_journal_lines;
create policy "Finance journal lines require MFA"
on public.admin_finance_journal_lines as restrictive for all to authenticated
using (
  lower(coalesce((select auth.jwt()->>'email'),''))='halalfoodbd.official@gmail.com'
  and coalesce((select auth.jwt()->>'aal'),'aal1')='aal2'
)
with check (
  lower(coalesce((select auth.jwt()->>'email'),''))='halalfoodbd.official@gmail.com'
  and coalesce((select auth.jwt()->>'aal'),'aal1')='aal2'
);

drop policy if exists "Finance journal events admin read" on public.admin_finance_journal_events;
create policy "Finance journal events admin read"
on public.admin_finance_journal_events as permissive for select to authenticated
using (lower(coalesce((select auth.jwt()->>'email'),''))='halalfoodbd.official@gmail.com');

drop policy if exists "Finance journal events require MFA" on public.admin_finance_journal_events;
create policy "Finance journal events require MFA"
on public.admin_finance_journal_events as restrictive for select to authenticated
using (
  lower(coalesce((select auth.jwt()->>'email'),''))='halalfoodbd.official@gmail.com'
  and coalesce((select auth.jwt()->>'aal'),'aal1')='aal2'
);

create or replace function public.admin_finance_guard_period()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_email text := lower(coalesce((select auth.jwt()->>'email'),''));
  v_aal text := coalesce((select auth.jwt()->>'aal'),'aal1');
  v_drafts bigint;
begin
  if v_email <> 'halalfoodbd.official@gmail.com' or v_aal <> 'aal2' then
    raise exception 'Finance period changes require the authorized admin account and MFA.' using errcode='42501';
  end if;

  if tg_op='DELETE' then
    raise exception 'Accounting periods are permanent audit records and cannot be deleted.';
  elsif tg_op='INSERT' then
    if new.status <> 'open' then
      raise exception 'A new accounting period must start in Open status.';
    end if;
    new.created_by := v_email;
    return new;
  elsif tg_op='UPDATE' then
    if new.period_start is distinct from old.period_start
      or new.period_end is distinct from old.period_end
      or new.created_by is distinct from old.created_by
      or new.created_at is distinct from old.created_at then
      raise exception 'Accounting period identity fields cannot be changed.';
    end if;

    if old.status='open' and new.status='closed' then
      select count(*) into v_drafts
      from public.admin_finance_journal_entries
      where status='draft' and entry_date between old.period_start and old.period_end;
      if v_drafts > 0 then
        raise exception 'Cannot close this period while % draft journal(s) remain. Review or complete them first.',v_drafts;
      end if;
      new.closed_by := v_email;
      new.closed_at := now();
      new.locked_by := null;
      new.locked_at := null;
    elsif old.status='closed' and new.status='locked' then
      new.locked_by := v_email;
      new.locked_at := now();
    else
      raise exception 'Accounting periods can move only from Open to Closed, then Closed to Locked. Reopening is not permitted.';
    end if;
    return new;
  end if;
  return null;
end;
$$;
revoke all on function public.admin_finance_guard_period() from public,anon,authenticated;
drop trigger if exists admin_finance_period_guard on public.admin_finance_periods;
create trigger admin_finance_period_guard
before insert or update or delete on public.admin_finance_periods
for each row execute function public.admin_finance_guard_period();

create or replace function public.admin_finance_guard_journal_lines()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_email text := lower(coalesce((select auth.jwt()->>'email'),''));
  v_aal text := coalesce((select auth.jwt()->>'aal'),'aal1');
  v_status text;
begin
  if v_email <> 'halalfoodbd.official@gmail.com' or v_aal <> 'aal2' then
    raise exception 'Journal line changes require the authorized admin account and MFA.' using errcode='42501';
  end if;

  if tg_op='DELETE' then
    select status into v_status from public.admin_finance_journal_entries where id=old.journal_entry_id;
    if v_status is distinct from 'draft' then
      raise exception 'Posted or reversed journal lines are immutable. Use a reversal journal.';
    end if;
    return old;
  elsif tg_op='UPDATE' then
    select status into v_status from public.admin_finance_journal_entries where id=old.journal_entry_id;
    if v_status is distinct from 'draft' then
      raise exception 'Posted or reversed journal lines are immutable. Use a reversal journal.';
    end if;
    if new.journal_entry_id is distinct from old.journal_entry_id then
      select status into v_status from public.admin_finance_journal_entries where id=new.journal_entry_id;
      if v_status is distinct from 'draft' then
        raise exception 'Journal lines can only move between Draft journals.';
      end if;
    end if;
    return new;
  else
    select status into v_status from public.admin_finance_journal_entries where id=new.journal_entry_id;
    if v_status is distinct from 'draft' then
      raise exception 'New lines can only be added to Draft journals.';
    end if;
    return new;
  end if;
end;
$$;
revoke all on function public.admin_finance_guard_journal_lines() from public,anon,authenticated;
drop trigger if exists admin_finance_journal_lines_guard on public.admin_finance_journal_lines;
create trigger admin_finance_journal_lines_guard
before insert or update or delete on public.admin_finance_journal_lines
for each row execute function public.admin_finance_guard_journal_lines();

create or replace function public.admin_finance_guard_journal_header()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_email text := lower(coalesce((select auth.jwt()->>'email'),''));
  v_aal text := coalesce((select auth.jwt()->>'aal'),'aal1');
  v_line_count bigint;
  v_debit numeric(14,2);
  v_credit numeric(14,2);
  v_inactive bigint;
  v_period_start date;
  v_period_status text;
  v_original_status text;
  v_bad_lines bigint;
  v_target uuid;
begin
  if v_email <> 'halalfoodbd.official@gmail.com' or v_aal <> 'aal2' then
    raise exception 'Journal changes require the authorized admin account and MFA.' using errcode='42501';
  end if;

  if tg_op='DELETE' then
    raise exception 'Journal entries are permanent audit records. Use a reversal journal instead.';
  elsif tg_op='INSERT' then
    if new.status <> 'draft' then
      raise exception 'Journal entries must be created as Draft and posted through validation.';
    end if;
    if new.reversal_of is not null then
      select status into v_original_status
      from public.admin_finance_journal_entries
      where id=new.reversal_of
      for update;
      if v_original_status is distinct from 'posted' then
        raise exception 'A reversal can only reference an original Posted journal.';
      end if;
    end if;
    if lower(coalesce(new.created_by,'')) <> v_email then
      raise exception 'Journal creator must match the authenticated admin account.';
    end if;
    new.total_debit := 0;
    new.total_credit := 0;
    new.posted_by := null;
    new.posted_at := null;
    new.updated_at := now();
    return new;
  elsif tg_op='UPDATE' then
    if new.journal_number is distinct from old.journal_number
      or new.created_by is distinct from old.created_by
      or new.created_at is distinct from old.created_at
      or new.source_type is distinct from old.source_type
      or new.source_key is distinct from old.source_key
      or new.currency is distinct from old.currency
      or new.reversal_of is distinct from old.reversal_of then
      raise exception 'Journal identity and source fields cannot be changed after creation.';
    end if;

    if old.status='draft' then
      if new.status not in ('draft','posted') then
        raise exception 'A Draft journal may only remain Draft or become Posted after validation.';
      end if;
      if new.status='draft' then
        select count(*),coalesce(sum(debit),0),coalesce(sum(credit),0),
               count(*) filter (where not coa.is_active or not coa.is_postable)
        into v_line_count,v_debit,v_credit,v_inactive
        from public.admin_finance_journal_lines jl
        join public.admin_finance_chart_of_accounts coa on coa.id=jl.account_id
        where jl.journal_entry_id=old.id;
        new.total_debit := v_debit;
        new.total_credit := v_credit;
        new.posted_by := null;
        new.posted_at := null;
      else
        select count(*),coalesce(sum(debit),0),coalesce(sum(credit),0),
               count(*) filter (where not coa.is_active or not coa.is_postable)
        into v_line_count,v_debit,v_credit,v_inactive
        from public.admin_finance_journal_lines jl
        join public.admin_finance_chart_of_accounts coa on coa.id=jl.account_id
        where jl.journal_entry_id=old.id;

        if v_line_count < 2 then
          raise exception 'A journal needs at least two posting lines.';
        end if;
        if v_debit <= 0 or v_credit <= 0 or v_debit <> v_credit then
          raise exception 'Journal is not balanced. Debit % and Credit % must be equal and greater than zero.',v_debit,v_credit;
        end if;
        if v_inactive > 0 then
          raise exception 'A journal contains an inactive or non-postable account.';
        end if;

        v_period_start := date_trunc('month',new.entry_date)::date;
        insert into public.admin_finance_periods(period_start,period_end,status,created_by)
        values (
          v_period_start,
          (date_trunc('month',new.entry_date) + interval '1 month - 1 day')::date,
          'open',
          v_email
        )
        on conflict (period_start) do nothing;

        select status into v_period_status
        from public.admin_finance_periods
        where period_start=v_period_start
        for update;
        if v_period_status is distinct from 'open' then
          raise exception 'The accounting period for % is %. Posting is allowed only in an Open period.',v_period_start,v_period_status;
        end if;

        if new.reversal_of is not null then
          select status into v_original_status
          from public.admin_finance_journal_entries
          where id=new.reversal_of
          for update;
          if v_original_status is distinct from 'posted' then
            raise exception 'The original journal must still be Posted when a reversal is posted.';
          end if;

          select count(*) into v_bad_lines
          from (
            select line_no,account_id,debit,credit
            from public.admin_finance_journal_lines
            where journal_entry_id=new.reversal_of
          ) original_lines
          full join (
            select line_no,account_id,debit,credit
            from public.admin_finance_journal_lines
            where journal_entry_id=old.id
          ) reversal_lines using(line_no)
          where original_lines.line_no is null
             or reversal_lines.line_no is null
             or original_lines.account_id is distinct from reversal_lines.account_id
             or original_lines.debit is distinct from reversal_lines.credit
             or original_lines.credit is distinct from reversal_lines.debit;
          if v_bad_lines > 0 then
            raise exception 'Reversal journal lines must exactly reverse every original account line.';
          end if;
        end if;

        new.total_debit := v_debit;
        new.total_credit := v_credit;
        new.posted_by := v_email;
        new.posted_at := now();
      end if;
      new.updated_at := now();
      return new;
    elsif old.status='posted' then
      if new.status <> 'reversed' or new.reversed_by is null then
        raise exception 'Posted journals are immutable. Create a reversal journal to correct them.';
      end if;
      if (to_jsonb(new) - array['status','reversed_by','updated_at']::text[])
         is distinct from
         (to_jsonb(old) - array['status','reversed_by','updated_at']::text[]) then
        raise exception 'Only the controlled Reversed status and reversal link may change on a Posted journal.';
      end if;
      select id into v_target
      from public.admin_finance_journal_entries
      where id=new.reversed_by
        and reversal_of=old.id
        and status='posted';
      if v_target is null then
        raise exception 'The linked reversal must be a Posted journal that references this original entry.';
      end if;
      new.updated_at := now();
      return new;
    else
      raise exception 'Reversed journals are immutable.';
    end if;
  end if;
  return null;
end;
$$;
revoke all on function public.admin_finance_guard_journal_header() from public,anon,authenticated;
drop trigger if exists admin_finance_journal_header_guard on public.admin_finance_journal_entries;
create trigger admin_finance_journal_header_guard
before insert or update or delete on public.admin_finance_journal_entries
for each row execute function public.admin_finance_guard_journal_header();

create or replace function private.log_admin_finance_journal_event()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_journal_id uuid;
  v_action text;
  v_before jsonb;
  v_after jsonb;
  v_actor text;
begin
  v_actor := lower(coalesce((select auth.jwt()->>'email'),'system'));
  if tg_table_name='admin_finance_journal_entries' then
    if tg_op='INSERT' then
      v_journal_id := new.id;
      v_action := 'draft_created';
      v_after := to_jsonb(new);
    else
      v_journal_id := new.id;
      v_before := to_jsonb(old);
      v_after := to_jsonb(new);
      v_action := case
        when old.status is distinct from new.status and new.status='posted' then 'journal_posted'
        when old.status is distinct from new.status and new.status='reversed' then 'journal_reversed'
        else 'draft_updated'
      end;
    end if;
  else
    if tg_op='DELETE' then
      v_journal_id := old.journal_entry_id;
      v_action := 'draft_line_deleted';
      v_before := to_jsonb(old);
    elsif tg_op='UPDATE' then
      v_journal_id := new.journal_entry_id;
      v_action := 'draft_line_updated';
      v_before := to_jsonb(old);
      v_after := to_jsonb(new);
    else
      v_journal_id := new.journal_entry_id;
      v_action := 'draft_line_added';
      v_after := to_jsonb(new);
    end if;
  end if;

  insert into public.admin_finance_journal_events
    (journal_entry_id,action,actor_email,before_data,after_data)
  values(v_journal_id,v_action,v_actor,v_before,v_after);

  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.log_admin_finance_journal_event() from public,anon,authenticated;
drop trigger if exists admin_finance_journal_header_audit on public.admin_finance_journal_entries;
create trigger admin_finance_journal_header_audit
after insert or update on public.admin_finance_journal_entries
for each row execute function private.log_admin_finance_journal_event();
drop trigger if exists admin_finance_journal_line_audit on public.admin_finance_journal_lines;
create trigger admin_finance_journal_line_audit
after insert or update or delete on public.admin_finance_journal_lines
for each row execute function private.log_admin_finance_journal_event();

create or replace function public.admin_finance_save_journal_entry(
  p_entry_id uuid,
  p_entry_date date,
  p_description text,
  p_lines jsonb,
  p_source_type text default 'manual',
  p_source_key text default null,
  p_post boolean default false
)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_email text := lower(coalesce((select auth.jwt()->>'email'),''));
  v_aal text := coalesce((select auth.jwt()->>'aal'),'aal1');
  v_id uuid;
begin
  if v_email <> 'halalfoodbd.official@gmail.com' or v_aal <> 'aal2' or auth.uid() is null then
    raise exception 'Authorized admin account and MFA are required.' using errcode='42501';
  end if;
  if p_entry_date is null then raise exception 'Journal date is required.'; end if;
  if length(btrim(coalesce(p_description,''))) < 3 or length(p_description) > 500 then
    raise exception 'Enter a journal description between 3 and 500 characters.';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines) > 100 then
    raise exception 'Journal lines must be an array containing no more than 100 lines.';
  end if;
  if length(btrim(coalesce(p_source_type,''))) not between 1 and 40 then
    raise exception 'Journal source type must contain 1 to 40 characters.';
  end if;
  if p_source_key is not null and length(p_source_key) > 180 then
    raise exception 'Journal source key cannot exceed 180 characters.';
  end if;

  if p_entry_id is null then
    insert into public.admin_finance_journal_entries
      (entry_date,description,source_type,source_key,created_by,status)
    values
      (p_entry_date,btrim(p_description),btrim(p_source_type),nullif(btrim(p_source_key),''),v_email,'draft')
    returning id into v_id;
  else
    select id into v_id
    from public.admin_finance_journal_entries
    where id=p_entry_id and status='draft'
    for update;
    if v_id is null then
      raise exception 'Only an existing Draft journal can be edited.';
    end if;
    update public.admin_finance_journal_entries
    set entry_date=p_entry_date,description=btrim(p_description),
        updated_at=now()
    where id=v_id;
  end if;

  delete from public.admin_finance_journal_lines where journal_entry_id=v_id;

  insert into public.admin_finance_journal_lines
    (journal_entry_id,line_no,account_id,description,party_name,debit,credit)
  select
    v_id,
    e.ordinality::integer,
    (e.value->>'account_id')::uuid,
    coalesce(e.value->>'description',''),
    coalesce(e.value->>'party_name',''),
    coalesce(nullif(e.value->>'debit','')::numeric,0),
    coalesce(nullif(e.value->>'credit','')::numeric,0)
  from jsonb_array_elements(p_lines) with ordinality as e(value,ordinality);

  update public.admin_finance_journal_entries
  set updated_at=now()
  where id=v_id and status='draft';

  if p_post then
    update public.admin_finance_journal_entries
    set status='posted',updated_at=now()
    where id=v_id and status='draft';
  end if;
  return v_id;
end;
$$;
revoke all on function public.admin_finance_save_journal_entry(uuid,date,text,jsonb,text,text,boolean) from public,anon;
grant execute on function public.admin_finance_save_journal_entry(uuid,date,text,jsonb,text,text,boolean) to authenticated;

create or replace function public.admin_finance_reverse_journal_entry(
  p_journal_entry_id uuid,
  p_reversal_date date,
  p_reason text
)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_email text := lower(coalesce((select auth.jwt()->>'email'),''));
  v_aal text := coalesce((select auth.jwt()->>'aal'),'aal1');
  v_original public.admin_finance_journal_entries%rowtype;
  v_reversal_id uuid;
begin
  if v_email <> 'halalfoodbd.official@gmail.com' or v_aal <> 'aal2' or auth.uid() is null then
    raise exception 'Authorized admin account and MFA are required.' using errcode='42501';
  end if;
  if p_reversal_date is null or length(btrim(coalesce(p_reason,''))) < 5 or length(p_reason)>500 then
    raise exception 'Enter a reversal date and a reason of at least 5 characters.';
  end if;

  select * into v_original
  from public.admin_finance_journal_entries
  where id=p_journal_entry_id
  for update;
  if not found then raise exception 'Journal entry was not found.'; end if;
  if v_original.status='reversed' and v_original.reversed_by is not null then
    return v_original.reversed_by;
  end if;
  if v_original.status <> 'posted' then
    raise exception 'Only a Posted journal can be reversed.';
  end if;

  insert into public.admin_finance_journal_entries
    (entry_date,description,source_type,source_key,reversal_of,created_by,status)
  values
    (p_reversal_date,'Reversal of JE-'||lpad(v_original.journal_number::text,6,'0')||': '||btrim(p_reason),
     'reversal',p_journal_entry_id::text,p_journal_entry_id,v_email,'draft')
  returning id into v_reversal_id;

  insert into public.admin_finance_journal_lines
    (journal_entry_id,line_no,account_id,description,party_name,debit,credit)
  select
    v_reversal_id,line_no,account_id,'Reversal · '||description,party_name,credit,debit
  from public.admin_finance_journal_lines
  where journal_entry_id=p_journal_entry_id
  order by line_no;

  update public.admin_finance_journal_entries
  set status='posted',updated_at=now()
  where id=v_reversal_id;

  update public.admin_finance_journal_entries
  set status='reversed',reversed_by=v_reversal_id,updated_at=now()
  where id=p_journal_entry_id;

  return v_reversal_id;
end;
$$;
revoke all on function public.admin_finance_reverse_journal_entry(uuid,date,text) from public,anon;
grant execute on function public.admin_finance_reverse_journal_entry(uuid,date,text) to authenticated;

create or replace function public.admin_finance_set_period_status(
  p_period_start date,
  p_status text,
  p_notes text default null
)
returns void
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_email text := lower(coalesce((select auth.jwt()->>'email'),''));
  v_aal text := coalesce((select auth.jwt()->>'aal'),'aal1');
  v_current text;
begin
  if v_email <> 'halalfoodbd.official@gmail.com' or v_aal <> 'aal2' or auth.uid() is null then
    raise exception 'Authorized admin account and MFA are required.' using errcode='42501';
  end if;
  if p_status not in ('closed','locked') then
    raise exception 'A period may be moved only to Closed or Locked.';
  end if;
  select status into v_current
  from public.admin_finance_periods
  where period_start=p_period_start
  for update;
  if v_current is null then raise exception 'Accounting period does not exist yet.'; end if;
  if v_current='open' and p_status='closed' then
    update public.admin_finance_periods
    set status='closed',notes=coalesce(p_notes,notes)
    where period_start=p_period_start;
  elsif v_current='closed' and p_status='locked' then
    update public.admin_finance_periods
    set status='locked',notes=coalesce(p_notes,notes)
    where period_start=p_period_start;
  else
    raise exception 'Invalid period transition from % to %.',v_current,p_status;
  end if;
end;
$$;
revoke all on function public.admin_finance_set_period_status(date,text,text) from public,anon;
grant execute on function public.admin_finance_set_period_status(date,text,text) to authenticated;

create or replace view public.admin_finance_trial_balance
with (security_invoker=true)
as
select
  coa.id as account_id,
  coa.account_code,
  coa.name as account_name,
  coa.account_type,
  coa.normal_balance,
  coa.parent_account_id,
  coa.is_postable,
  coalesce(sum(jl.debit) filter (where je.status in ('posted','reversed')),0)::numeric(14,2) as total_debits,
  coalesce(sum(jl.credit) filter (where je.status in ('posted','reversed')),0)::numeric(14,2) as total_credits,
  greatest(
    case when coa.normal_balance='debit'
      then coalesce(sum(jl.debit-jl.credit) filter (where je.status in ('posted','reversed')),0)
      else coalesce(sum(jl.credit-jl.debit) filter (where je.status in ('posted','reversed')),0)
    end,0
  )::numeric(14,2) as debit_balance,
  greatest(
    case when coa.normal_balance='debit'
      then coalesce(sum(jl.credit-jl.debit) filter (where je.status in ('posted','reversed')),0)
      else coalesce(sum(jl.debit-jl.credit) filter (where je.status in ('posted','reversed')),0)
    end,0
  )::numeric(14,2) as credit_balance
from public.admin_finance_chart_of_accounts coa
left join public.admin_finance_journal_lines jl on jl.account_id=coa.id
left join public.admin_finance_journal_entries je on je.id=jl.journal_entry_id
group by coa.id,coa.account_code,coa.name,coa.account_type,coa.normal_balance,coa.parent_account_id,coa.is_postable;

create or replace view public.admin_finance_general_ledger
with (security_invoker=true)
as
select
  je.id as journal_entry_id,
  je.journal_number,
  je.entry_date,
  je.description as journal_description,
  je.source_type,
  je.source_key,
  je.status as journal_status,
  je.posted_at,
  jl.id as journal_line_id,
  jl.line_no,
  coa.id as account_id,
  coa.account_code,
  coa.name as account_name,
  coa.account_type,
  coa.normal_balance,
  jl.description as line_description,
  jl.party_name,
  jl.debit,
  jl.credit,
  sum(case when coa.normal_balance='debit' then jl.debit-jl.credit else jl.credit-jl.debit end)
    over(partition by coa.id order by je.entry_date,je.journal_number,jl.line_no rows between unbounded preceding and current row)
    ::numeric(14,2) as running_balance
from public.admin_finance_journal_entries je
join public.admin_finance_journal_lines jl on jl.journal_entry_id=je.id
join public.admin_finance_chart_of_accounts coa on coa.id=jl.account_id
where je.status in ('posted','reversed');

grant select on public.admin_finance_trial_balance,public.admin_finance_general_ledger to authenticated;
revoke all on public.admin_finance_trial_balance,public.admin_finance_general_ledger from anon;

drop trigger if exists admin_finance_coa_updated_at on public.admin_finance_chart_of_accounts;
create trigger admin_finance_coa_updated_at
before update on public.admin_finance_chart_of_accounts
for each row execute function public.set_admin_finance_updated_at();

create or replace function public.admin_finance_guard_chart_account()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_email text := lower(coalesce((select auth.jwt()->>'email'),''));
  v_aal text := coalesce((select auth.jwt()->>'aal'),'aal1');
  v_used bigint;
begin
  if v_email <> 'halalfoodbd.official@gmail.com' or v_aal <> 'aal2' then
    raise exception 'Chart of Accounts changes require the authorized admin account and MFA.' using errcode='42501';
  end if;
  if tg_op='DELETE' then
    if old.is_system then raise exception 'System Chart of Accounts rows cannot be deleted.'; end if;
    select count(*) into v_used from public.admin_finance_journal_lines where account_id=old.id;
    if v_used>0 then raise exception 'An account used by a journal cannot be deleted. Deactivate it instead.'; end if;
    return old;
  end if;
  if old.is_system and (
    new.account_code is distinct from old.account_code
    or new.name is distinct from old.name
    or new.account_type is distinct from old.account_type
    or new.normal_balance is distinct from old.normal_balance
    or new.parent_account_id is distinct from old.parent_account_id
    or new.is_postable is distinct from old.is_postable
    or new.is_system is distinct from old.is_system
  ) then
    raise exception 'System account codes, names, types and hierarchy are protected.';
  end if;
  new.updated_at:=now();
  return new;
end;
$$;
revoke all on function public.admin_finance_guard_chart_account() from public,anon,authenticated;
drop trigger if exists admin_finance_chart_account_guard on public.admin_finance_chart_of_accounts;
create trigger admin_finance_chart_account_guard
before update or delete on public.admin_finance_chart_of_accounts
for each row execute function public.admin_finance_guard_chart_account();

comment on table public.admin_finance_chart_of_accounts is 'Chart of Accounts for double-entry accounting. Seeded account definitions only; no balances are created automatically.';
comment on table public.admin_finance_periods is 'Monthly accounting periods. Journals may post only to Open periods; Closed periods may be Locked and cannot be reopened.';
comment on table public.admin_finance_journal_entries is 'Canonical posted accounting journal headers. Only balanced, validated journals are included in the General Ledger and Trial Balance.';
comment on table public.admin_finance_journal_lines is 'Debit and credit lines for a journal. Posted and reversed journal lines are immutable.';
comment on table public.admin_finance_journal_events is 'Append-only audit events for journal header and line changes.';
comment on table public.admin_finance_entries is 'Operational cashbook/source-capture records. Existing rows are not automatically promoted to accounting journals; future Phase 2 integrations must create balanced journals only after source verification.';
comment on view public.admin_finance_trial_balance is 'Trial balance across posted and reversal journals. Original reversed journals remain paired with their reversal so the net balances remain correct.';
comment on view public.admin_finance_general_ledger is 'General ledger rows from posted and reversal journals, with running balances by account.';
