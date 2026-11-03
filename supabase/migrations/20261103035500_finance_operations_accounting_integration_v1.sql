-- Phase 2: Operational finance and business-module accounting integration.
-- Additive only. No historical cashbook/order/supplier/COD rows are automatically journalized.

insert into public.admin_finance_chart_of_accounts
  (account_code,name,account_type,normal_balance,parent_account_id,is_postable,is_system,description)
select '1110','Supplier Advances','asset','debit',p.id,true,true,
       'Prepayments and supplier amounts not yet allocated to confirmed bills'
from public.admin_finance_chart_of_accounts p
where p.account_code='1000'
on conflict (account_code) do nothing;

insert into public.admin_finance_chart_of_accounts
  (account_code,name,account_type,normal_balance,parent_account_id,is_postable,is_system,description)
select '4096','COD Settlement Adjustment Income','other_income','credit',p.id,true,true,
       'Positive courier settlement adjustments after remittance reconciliation'
from public.admin_finance_chart_of_accounts p
where p.account_code='4000'
on conflict (account_code) do nothing;

insert into public.admin_finance_chart_of_accounts
  (account_code,name,account_type,normal_balance,parent_account_id,is_postable,is_system,description)
select '6096','COD Settlement Adjustment Expense','expense','debit',p.id,true,true,
       'Negative courier settlement adjustments after remittance reconciliation'
from public.admin_finance_chart_of_accounts p
where p.account_code='6000'
on conflict (account_code) do nothing;

insert into public.admin_finance_chart_of_accounts
  (account_code,name,account_type,normal_balance,parent_account_id,is_postable,is_system,description)
select '5030','Supplier Purchase Returns & Allowances','cost_of_sales','credit',p.id,true,true,
       'Supplier credit notes and purchase returns that reduce inventory purchase cost'
from public.admin_finance_chart_of_accounts p
where p.account_code='5000'
on conflict (account_code) do nothing;

alter table public.admin_finance_accounts
  add column if not exists ledger_account_id uuid,
  add column if not exists opening_balance_journal_id uuid,
  add column if not exists opening_offset_account_id uuid;

alter table public.admin_finance_entries
  add column if not exists accounting_journal_id uuid,
  add column if not exists reversal_journal_id uuid;

alter table public.admin_finance_transfers
  add column if not exists accounting_journal_id uuid,
  add column if not exists reversal_journal_id uuid;

alter table public.admin_cod_settlements
  add column if not exists accounting_journal_id uuid,
  add column if not exists reversal_journal_id uuid,
  add column if not exists order_sale_reversal_journal_id uuid,
  add column if not exists order_cogs_reversal_journal_id uuid;

alter table public.admin_supplier_bills
  add column if not exists accounting_journal_id uuid,
  add column if not exists reversal_journal_id uuid;

alter table public.admin_supplier_payments
  add column if not exists accounting_journal_id uuid,
  add column if not exists reversal_journal_id uuid;

alter table public.admin_supplier_credit_notes
  add column if not exists accounting_journal_id uuid,
  add column if not exists reversal_journal_id uuid;

alter table public.admin_return_requests
  add column if not exists refund_account_id uuid,
  add column if not exists accounting_journal_id uuid,
  add column if not exists reversal_journal_id uuid;

do $fk$
begin
  if not exists(select 1 from pg_constraint where conname='admin_finance_accounts_ledger_account_id_fkey') then
    alter table public.admin_finance_accounts add constraint admin_finance_accounts_ledger_account_id_fkey
      foreign key (ledger_account_id) references public.admin_finance_chart_of_accounts(id) on delete restrict;
  end if;
  if not exists(select 1 from pg_constraint where conname='admin_finance_accounts_opening_balance_journal_id_fkey') then
    alter table public.admin_finance_accounts add constraint admin_finance_accounts_opening_balance_journal_id_fkey
      foreign key (opening_balance_journal_id) references public.admin_finance_journal_entries(id) on delete restrict;
  end if;
  if not exists(select 1 from pg_constraint where conname='admin_finance_accounts_opening_offset_account_id_fkey') then
    alter table public.admin_finance_accounts add constraint admin_finance_accounts_opening_offset_account_id_fkey
      foreign key (opening_offset_account_id) references public.admin_finance_chart_of_accounts(id) on delete restrict;
  end if;
  if not exists(select 1 from pg_constraint where conname='admin_finance_entries_accounting_journal_id_fkey') then
    alter table public.admin_finance_entries add constraint admin_finance_entries_accounting_journal_id_fkey
      foreign key (accounting_journal_id) references public.admin_finance_journal_entries(id) on delete restrict;
  end if;
  if not exists(select 1 from pg_constraint where conname='admin_finance_entries_reversal_journal_id_fkey') then
    alter table public.admin_finance_entries add constraint admin_finance_entries_reversal_journal_id_fkey
      foreign key (reversal_journal_id) references public.admin_finance_journal_entries(id) on delete restrict;
  end if;
  if not exists(select 1 from pg_constraint where conname='admin_finance_transfers_accounting_journal_id_fkey') then
    alter table public.admin_finance_transfers add constraint admin_finance_transfers_accounting_journal_id_fkey
      foreign key (accounting_journal_id) references public.admin_finance_journal_entries(id) on delete restrict;
  end if;
  if not exists(select 1 from pg_constraint where conname='admin_finance_transfers_reversal_journal_id_fkey') then
    alter table public.admin_finance_transfers add constraint admin_finance_transfers_reversal_journal_id_fkey
      foreign key (reversal_journal_id) references public.admin_finance_journal_entries(id) on delete restrict;
  end if;
  if not exists(select 1 from pg_constraint where conname='admin_cod_settlements_accounting_journal_id_fkey') then
    alter table public.admin_cod_settlements add constraint admin_cod_settlements_accounting_journal_id_fkey
      foreign key (accounting_journal_id) references public.admin_finance_journal_entries(id) on delete restrict;
  end if;
  if not exists(select 1 from pg_constraint where conname='admin_cod_settlements_reversal_journal_id_fkey') then
    alter table public.admin_cod_settlements add constraint admin_cod_settlements_reversal_journal_id_fkey
      foreign key (reversal_journal_id) references public.admin_finance_journal_entries(id) on delete restrict;
  end if;
  if not exists(select 1 from pg_constraint where conname='admin_cod_settlements_order_sale_reversal_journal_id_fkey') then
    alter table public.admin_cod_settlements add constraint admin_cod_settlements_order_sale_reversal_journal_id_fkey
      foreign key (order_sale_reversal_journal_id) references public.admin_finance_journal_entries(id) on delete restrict;
  end if;
  if not exists(select 1 from pg_constraint where conname='admin_cod_settlements_order_cogs_reversal_journal_id_fkey') then
    alter table public.admin_cod_settlements add constraint admin_cod_settlements_order_cogs_reversal_journal_id_fkey
      foreign key (order_cogs_reversal_journal_id) references public.admin_finance_journal_entries(id) on delete restrict;
  end if;
  if not exists(select 1 from pg_constraint where conname='admin_supplier_bills_accounting_journal_id_fkey') then
    alter table public.admin_supplier_bills add constraint admin_supplier_bills_accounting_journal_id_fkey
      foreign key (accounting_journal_id) references public.admin_finance_journal_entries(id) on delete restrict;
  end if;
  if not exists(select 1 from pg_constraint where conname='admin_supplier_bills_reversal_journal_id_fkey') then
    alter table public.admin_supplier_bills add constraint admin_supplier_bills_reversal_journal_id_fkey
      foreign key (reversal_journal_id) references public.admin_finance_journal_entries(id) on delete restrict;
  end if;
  if not exists(select 1 from pg_constraint where conname='admin_supplier_payments_accounting_journal_id_fkey') then
    alter table public.admin_supplier_payments add constraint admin_supplier_payments_accounting_journal_id_fkey
      foreign key (accounting_journal_id) references public.admin_finance_journal_entries(id) on delete restrict;
  end if;
  if not exists(select 1 from pg_constraint where conname='admin_supplier_payments_reversal_journal_id_fkey') then
    alter table public.admin_supplier_payments add constraint admin_supplier_payments_reversal_journal_id_fkey
      foreign key (reversal_journal_id) references public.admin_finance_journal_entries(id) on delete restrict;
  end if;
  if not exists(select 1 from pg_constraint where conname='admin_supplier_credit_notes_accounting_journal_id_fkey') then
    alter table public.admin_supplier_credit_notes add constraint admin_supplier_credit_notes_accounting_journal_id_fkey
      foreign key (accounting_journal_id) references public.admin_finance_journal_entries(id) on delete restrict;
  end if;
  if not exists(select 1 from pg_constraint where conname='admin_supplier_credit_notes_reversal_journal_id_fkey') then
    alter table public.admin_supplier_credit_notes add constraint admin_supplier_credit_notes_reversal_journal_id_fkey
      foreign key (reversal_journal_id) references public.admin_finance_journal_entries(id) on delete restrict;
  end if;
  if not exists(select 1 from pg_constraint where conname='admin_return_requests_refund_account_id_fkey') then
    alter table public.admin_return_requests add constraint admin_return_requests_refund_account_id_fkey
      foreign key (refund_account_id) references public.admin_finance_accounts(id) on delete restrict;
  end if;
  if not exists(select 1 from pg_constraint where conname='admin_return_requests_accounting_journal_id_fkey') then
    alter table public.admin_return_requests add constraint admin_return_requests_accounting_journal_id_fkey
      foreign key (accounting_journal_id) references public.admin_finance_journal_entries(id) on delete restrict;
  end if;
  if not exists(select 1 from pg_constraint where conname='admin_return_requests_reversal_journal_id_fkey') then
    alter table public.admin_return_requests add constraint admin_return_requests_reversal_journal_id_fkey
      foreign key (reversal_journal_id) references public.admin_finance_journal_entries(id) on delete restrict;
  end if;
end
$fk$;

create index if not exists admin_finance_accounts_ledger_account_idx
  on public.admin_finance_accounts(ledger_account_id);
create index if not exists admin_finance_entries_accounting_journal_idx
  on public.admin_finance_entries(accounting_journal_id) where accounting_journal_id is not null;
create index if not exists admin_finance_transfers_accounting_journal_idx
  on public.admin_finance_transfers(accounting_journal_id) where accounting_journal_id is not null;
create index if not exists admin_supplier_credit_notes_accounting_journal_idx
  on public.admin_supplier_credit_notes(accounting_journal_id) where accounting_journal_id is not null;
create index if not exists admin_return_requests_accounting_journal_idx
  on public.admin_return_requests(accounting_journal_id) where accounting_journal_id is not null;

-- New accounts created after this migration can use standard chart mappings. This backfill
-- is intentionally safe and additive; it does not create any opening journals.
update public.admin_finance_accounts a
set ledger_account_id=coa.id
from public.admin_finance_chart_of_accounts coa
where a.ledger_account_id is null
  and coa.account_code=case
    when a.account_type='cash' then '1010'
    when a.account_type='bank' then '1020'
    when a.account_type in ('bkash','nagad','rocket') then '1030'
    when a.account_type='courier_clearing' then '1040'
    else null
  end;

create or replace function public.admin_finance_guard_operations_links()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_email text := lower(coalesce((select auth.jwt()->>'email'),''));
  v_aal text := coalesce((select auth.jwt()->>'aal'),'aal1');
  v_sync boolean := coalesce(current_setting('app.finance_operations_sync',true),'')='on';
  v_account_type text;
begin
  if v_email <> 'halalfoodbd.official@gmail.com' or v_aal <> 'aal2' then
    raise exception 'Finance operations changes require the authorized admin account and MFA.' using errcode='42501';
  end if;

  if tg_table_name='admin_finance_accounts' then
    if tg_op='DELETE' then
      raise exception 'Finance accounts are retained for audit history; archive an account instead.';
    end if;
    if tg_op='INSERT' and (new.opening_balance_journal_id is not null or new.opening_offset_account_id is not null) and not v_sync then
      raise exception 'Opening balance journal links are workflow-managed.';
    end if;
    if new.ledger_account_id is null then
      raise exception 'Choose a General Ledger account mapping before saving this Finance account.';
    end if;
    select account_type into v_account_type
    from public.admin_finance_chart_of_accounts where id=new.ledger_account_id;
    if v_account_type is distinct from 'asset' then
      raise exception 'A cash, bank or wallet must map to an Asset account in the Chart of Accounts.';
    end if;
    if not exists(select 1 from public.admin_finance_chart_of_accounts where id=new.ledger_account_id and is_postable and is_active) then
      raise exception 'The selected General Ledger account must be active and postable.';
    end if;
    if tg_op='UPDATE' and old.opening_balance_journal_id is not null and
       (new.opening_balance is distinct from old.opening_balance
        or new.opening_date is distinct from old.opening_date
        or new.ledger_account_id is distinct from old.ledger_account_id) then
      raise exception 'A journalized opening balance and its account mapping are immutable. Use a correcting journal.';
    end if;
    if tg_op='UPDATE' and (
      new.opening_balance_journal_id is distinct from old.opening_balance_journal_id
      or new.opening_offset_account_id is distinct from old.opening_offset_account_id
    ) and not v_sync then
      raise exception 'Opening balance journal links are workflow-managed.';
    end if;
    new.updated_at:=now();
    return new;
  elsif tg_table_name='admin_finance_entries' then
    if tg_op='INSERT' then
      if (new.accounting_journal_id is not null or new.reversal_journal_id is not null) and not v_sync then
        raise exception 'Accounting journal links are workflow-managed.';
      end if;
    elsif tg_op='UPDATE' then
      if (new.accounting_journal_id is distinct from old.accounting_journal_id
          or new.reversal_journal_id is distinct from old.reversal_journal_id) and not v_sync then
        raise exception 'Accounting journal links are workflow-managed.';
      end if;
      if old.accounting_journal_id is not null and not v_sync and (
        new.entry_type is distinct from old.entry_type or new.category is distinct from old.category
        or new.amount is distinct from old.amount or new.entry_date is distinct from old.entry_date
        or new.account_id is distinct from old.account_id or new.status is distinct from old.status
        or new.related_order_id is distinct from old.related_order_id
      ) then
        raise exception 'This transaction is posted to accounting. Reverse its journal before correcting the source record.';
      end if;
    end if;
    return new;
  elsif tg_table_name='admin_finance_transfers' then
    if tg_op='DELETE' then
      raise exception 'Transfers are retained for audit history; void a transfer instead.';
    end if;
    if tg_op='INSERT' and (new.status<>'draft' or new.accounting_journal_id is not null or new.reversal_journal_id is not null) then
      raise exception 'A new transfer must start as Draft without accounting links.';
    end if;
    if tg_op='UPDATE' then
      if (new.status is distinct from old.status
          or new.accounting_journal_id is distinct from old.accounting_journal_id
          or new.reversal_journal_id is distinct from old.reversal_journal_id) and not v_sync then
        raise exception 'Transfer confirmation, voiding and journal links must use the protected Finance workflow.';
      end if;
      if old.accounting_journal_id is not null and (
        new.source_account_id is distinct from old.source_account_id
        or new.destination_account_id is distinct from old.destination_account_id
        or new.transfer_date is distinct from old.transfer_date
        or new.amount is distinct from old.amount
      ) then
        raise exception 'A journalized transfer cannot be edited. Reverse it and create a new transfer.';
      end if;
    end if;
    new.updated_at:=now();
    return new;
  elsif tg_table_name='admin_cod_settlements' then
    if tg_op='INSERT' then
      if (new.accounting_journal_id is not null or new.reversal_journal_id is not null
          or new.order_sale_reversal_journal_id is not null or new.order_cogs_reversal_journal_id is not null) and not v_sync then
        raise exception 'COD accounting links are workflow-managed.';
      end if;
    else
      if old.accounting_journal_id is not null and not v_sync and (
        new.status is distinct from old.status or new.cod_amount is distinct from old.cod_amount
        or new.collected_amount is distinct from old.collected_amount or new.courier_fee is distinct from old.courier_fee
        or new.adjustment_amount is distinct from old.adjustment_amount or new.remitted_amount is distinct from old.remitted_amount
        or new.remitted_account_id is distinct from old.remitted_account_id or new.remitted_at is distinct from old.remitted_at
      ) then
        raise exception 'This COD settlement is posted to accounting. Reverse its journals before changing settlement values.';
      end if;
      if (new.accounting_journal_id is distinct from old.accounting_journal_id
          or new.reversal_journal_id is distinct from old.reversal_journal_id
          or new.order_sale_reversal_journal_id is distinct from old.order_sale_reversal_journal_id
          or new.order_cogs_reversal_journal_id is distinct from old.order_cogs_reversal_journal_id) and not v_sync then
        raise exception 'COD accounting links are workflow-managed.';
      end if;
    end if;
    return new;
  elsif tg_table_name='admin_supplier_bills' then
    if tg_op='INSERT' then
      if (new.accounting_journal_id is not null or new.reversal_journal_id is not null) and not v_sync then
        raise exception 'Supplier bill accounting links are workflow-managed.';
      end if;
    else
      if old.accounting_journal_id is not null and not v_sync then
        raise exception 'This supplier bill is posted to accounting. Reverse the journal before correcting the bill.';
      end if;
      if (new.accounting_journal_id is distinct from old.accounting_journal_id
          or new.reversal_journal_id is distinct from old.reversal_journal_id) and not v_sync then
        raise exception 'Supplier bill accounting links are workflow-managed.';
      end if;
    end if;
    return new;
  elsif tg_table_name='admin_supplier_payments' then
    if tg_op='INSERT' then
      if (new.accounting_journal_id is not null or new.reversal_journal_id is not null) and not v_sync then
        raise exception 'Supplier payment accounting links are workflow-managed.';
      end if;
    else
      if old.accounting_journal_id is not null and not v_sync then
        raise exception 'This supplier payment is posted to accounting. Reverse the journal before correcting the payment.';
      end if;
      if (new.accounting_journal_id is distinct from old.accounting_journal_id
          or new.reversal_journal_id is distinct from old.reversal_journal_id) and not v_sync then
        raise exception 'Supplier payment accounting links are workflow-managed.';
      end if;
    end if;
    return new;
  elsif tg_table_name='admin_supplier_credit_notes' then
    if tg_op='INSERT' then
      if (new.accounting_journal_id is not null or new.reversal_journal_id is not null) and not v_sync then
        raise exception 'Supplier credit note accounting links are workflow-managed.';
      end if;
    else
      if old.accounting_journal_id is not null and not v_sync and (
        new.amount is distinct from old.amount or new.status is distinct from old.status
        or new.supplier_id is distinct from old.supplier_id or new.supplier_bill_id is distinct from old.supplier_bill_id
      ) then
        raise exception 'This supplier credit note is posted to accounting. Reverse the journal before correcting it.';
      end if;
      if (new.accounting_journal_id is distinct from old.accounting_journal_id
          or new.reversal_journal_id is distinct from old.reversal_journal_id) and not v_sync then
        raise exception 'Supplier credit note accounting links are workflow-managed.';
      end if;
    end if;
    return new;
  elsif tg_table_name='admin_return_requests' then
    if tg_op='INSERT' then
      if (new.refund_account_id is not null or new.accounting_journal_id is not null or new.reversal_journal_id is not null) and not v_sync then
        raise exception 'Customer return accounting links are workflow-managed.';
      end if;
    else
      if old.accounting_journal_id is not null and not v_sync and (
        new.refund_amount is distinct from old.refund_amount or new.status is distinct from old.status
        or new.order_id is distinct from old.order_id or new.refund_account_id is distinct from old.refund_account_id
      ) then
        raise exception 'This customer refund is posted to accounting. Reverse the journal before correcting it.';
      end if;
      if (new.refund_account_id is distinct from old.refund_account_id
          or new.accounting_journal_id is distinct from old.accounting_journal_id
          or new.reversal_journal_id is distinct from old.reversal_journal_id) and not v_sync then
        raise exception 'Customer return accounting links are workflow-managed.';
      end if;
    end if;
    return new;
  end if;
  return new;
end;
$$;
revoke all on function public.admin_finance_guard_operations_links() from public,anon,authenticated;
drop trigger if exists admin_finance_accounts_operations_guard on public.admin_finance_accounts;
create trigger admin_finance_accounts_operations_guard
before insert or update or delete on public.admin_finance_accounts
for each row execute function public.admin_finance_guard_operations_links();
drop trigger if exists admin_finance_entries_operations_guard on public.admin_finance_entries;
create trigger admin_finance_entries_operations_guard
before insert or update on public.admin_finance_entries
for each row execute function public.admin_finance_guard_operations_links();
drop trigger if exists admin_finance_transfers_operations_guard on public.admin_finance_transfers;
create trigger admin_finance_transfers_operations_guard
before insert or update or delete on public.admin_finance_transfers
for each row execute function public.admin_finance_guard_operations_links();
drop trigger if exists admin_cod_settlements_operations_guard on public.admin_cod_settlements;
create trigger admin_cod_settlements_operations_guard
before insert or update on public.admin_cod_settlements
for each row execute function public.admin_finance_guard_operations_links();
drop trigger if exists admin_supplier_bills_operations_guard on public.admin_supplier_bills;
create trigger admin_supplier_bills_operations_guard
before insert or update on public.admin_supplier_bills
for each row execute function public.admin_finance_guard_operations_links();
drop trigger if exists admin_supplier_payments_operations_guard on public.admin_supplier_payments;
create trigger admin_supplier_payments_operations_guard
before insert or update on public.admin_supplier_payments
for each row execute function public.admin_finance_guard_operations_links();
drop trigger if exists admin_supplier_credit_notes_operations_guard on public.admin_supplier_credit_notes;
create trigger admin_supplier_credit_notes_operations_guard
before insert or update on public.admin_supplier_credit_notes
for each row execute function public.admin_finance_guard_operations_links();
drop trigger if exists admin_return_requests_operations_guard on public.admin_return_requests;
create trigger admin_return_requests_operations_guard
before insert or update on public.admin_return_requests
for each row execute function public.admin_finance_guard_operations_links();


create table if not exists public.admin_inventory_cost_layers (
  id uuid primary key default gen_random_uuid(),
  receipt_item_id uuid not null unique references public.admin_purchase_receipt_items(id) on delete restrict,
  receipt_id uuid not null references public.admin_purchase_receipts(id) on delete restrict,
  purchase_order_id uuid not null references public.admin_purchase_orders(id) on delete restrict,
  purchase_order_item_id uuid not null references public.admin_purchase_order_items(id) on delete restrict,
  product_id uuid references public.products(id) on delete restrict,
  product_name_snapshot text not null,
  unit text not null default 'piece',
  accepted_quantity numeric(14,3) not null check (accepted_quantity>0),
  po_item_unit_cost numeric(14,4) not null check (po_item_unit_cost>=0),
  item_discount_allocated numeric(14,2) not null default 0 check (item_discount_allocated>=0),
  order_discount_allocated numeric(14,2) not null default 0 check (order_discount_allocated>=0),
  inbound_charges_allocated numeric(14,2) not null default 0 check (inbound_charges_allocated>=0),
  landed_unit_cost numeric(14,4) not null check (landed_unit_cost>=0),
  created_by text not null,
  created_at timestamptz not null default now()
);
create index if not exists admin_inventory_cost_layers_product_date_idx
  on public.admin_inventory_cost_layers(product_id,created_at desc) where product_id is not null;
create index if not exists admin_inventory_cost_layers_po_idx
  on public.admin_inventory_cost_layers(purchase_order_id,product_id);

revoke all on public.admin_inventory_cost_layers from public,anon,authenticated;
grant select on public.admin_inventory_cost_layers to authenticated;
alter table public.admin_inventory_cost_layers enable row level security;

drop policy if exists "Finance inventory cost layers admin read" on public.admin_inventory_cost_layers;
create policy "Finance inventory cost layers admin read"
on public.admin_inventory_cost_layers as permissive for select to authenticated
using (lower(coalesce((select auth.jwt()->>'email'),''))='halalfoodbd.official@gmail.com');

drop policy if exists "Finance inventory cost layers require MFA" on public.admin_inventory_cost_layers;
create policy "Finance inventory cost layers require MFA"
on public.admin_inventory_cost_layers as restrictive for select to authenticated
using (
  lower(coalesce((select auth.jwt()->>'email'),''))='halalfoodbd.official@gmail.com'
  and coalesce((select auth.jwt()->>'aal'),'aal1')='aal2'
);

create or replace function private.capture_admin_inventory_cost_layer()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_email text:=lower(coalesce((select auth.jwt()->>'email'),''));
  v_aal text:=coalesce((select auth.jwt()->>'aal'),'aal1');
  v_po public.admin_purchase_orders%rowtype;
  v_item public.admin_purchase_order_items%rowtype;
  v_total_qty numeric(14,3);
  v_total_lines numeric(14,2);
  v_weight numeric(14,8);
  v_accept_ratio numeric(14,8);
  v_item_discount numeric(14,2);
  v_order_discount numeric(14,2);
  v_inbound numeric(14,2);
  v_landed_total numeric(14,2);
begin
  if v_email<>'halalfoodbd.official@gmail.com' or v_aal<>'aal2' or auth.uid() is null then
    raise exception 'Verified admin MFA is required to create an inventory cost layer.' using errcode='42501';
  end if;
  if new.quantity_accepted<=0 or new.product_id is null then
    return new;
  end if;

  select * into v_item
  from public.admin_purchase_order_items
  where id=new.purchase_order_item_id
  for share;
  if not found then raise exception 'Purchase order item for GRN cost layer was not found.'; end if;

  select * into v_po
  from public.admin_purchase_orders
  where id=(select purchase_order_id from public.admin_purchase_receipts where id=new.receipt_id)
  for share;
  if not found then raise exception 'Purchase order for GRN cost layer was not found.'; end if;
  if v_item.purchase_order_id<>v_po.id or v_item.product_id is distinct from new.product_id then
    raise exception 'GRN product and Purchase Order item do not match.';
  end if;
  if v_po.subtotal<0 or v_item.quantity<=0 then
    raise exception 'Purchase order quantities or subtotal are invalid for landed-cost allocation.';
  end if;

  select coalesce(sum(quantity),0),coalesce(sum(line_total),0)
    into v_total_qty,v_total_lines
  from public.admin_purchase_order_items where purchase_order_id=v_po.id;

  if v_total_lines>0 then
    v_weight:=v_item.line_total/v_total_lines;
  elsif v_total_qty>0 then
    v_weight:=v_item.quantity/v_total_qty;
  else
    raise exception 'Cannot allocate purchase freight because the purchase order has no allocatable quantity.';
  end if;
  v_accept_ratio:=new.quantity_accepted/v_item.quantity;

  -- Item discount, order-level discount and inbound charges are allocated only to
  -- the accepted quantity on this GRN, so partial receipts do not duplicate costs.
  v_item_discount:=round(coalesce(v_item.discount_amount,0)*v_accept_ratio,2);
  v_order_discount:=round(coalesce(v_po.discount_amount,0)*v_weight*v_accept_ratio,2);
  -- Tax is intentionally excluded until the invoice tax is classified as recoverable or non-recoverable.
  v_inbound:=round((coalesce(v_po.transport_cost,0)+coalesce(v_po.handling_cost,0)+coalesce(v_po.other_charges,0))*v_weight*v_accept_ratio,2);
  v_landed_total:=round(v_item.line_total*v_accept_ratio-v_order_discount+v_inbound,2);
  if v_landed_total<0 then raise exception 'Allocated landed cost cannot be negative.'; end if;

  insert into public.admin_inventory_cost_layers(
    receipt_item_id,receipt_id,purchase_order_id,purchase_order_item_id,product_id,
    product_name_snapshot,unit,accepted_quantity,po_item_unit_cost,item_discount_allocated,
    order_discount_allocated,inbound_charges_allocated,landed_unit_cost,created_by
  ) values (
    new.id,new.receipt_id,v_po.id,v_item.id,new.product_id,new.product_name_snapshot,
    new.unit,new.quantity_accepted,
    round(v_item.unit_cost,4),
    v_item_discount,v_order_discount,v_inbound,
    round(v_landed_total/nullif(new.quantity_accepted,0),4),v_email
  )
  on conflict(receipt_item_id) do nothing;
  return new;
end;
$$;
revoke all on function private.capture_admin_inventory_cost_layer() from public,anon,authenticated;
drop trigger if exists admin_purchase_receipt_item_capture_cost_layer on public.admin_purchase_receipt_items;
create trigger admin_purchase_receipt_item_capture_cost_layer
after insert on public.admin_purchase_receipt_items
for each row execute function private.capture_admin_inventory_cost_layer();

comment on table public.admin_inventory_cost_layers is
'Immutable per-GRN accepted inventory layers with proportional purchase discount, freight, handling and other inbound charges. Tax is excluded pending accountant classification.';

create or replace function public.admin_finance_post_cashbook_entry(
  p_entry_id uuid,
  p_counter_account_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_email text:=lower(coalesce((select auth.jwt()->>'email'),''));
  v_aal text:=coalesce((select auth.jwt()->>'aal'),'aal1');
  v_entry public.admin_finance_entries%rowtype;
  v_cash_account_id uuid;
  v_cash_coa_id uuid;
  v_counter public.admin_finance_chart_of_accounts%rowtype;
  v_journal_id uuid;
  v_lines jsonb;
  v_period_open date;
begin
  if v_email<>'halalfoodbd.official@gmail.com' or v_aal<>'aal2' or auth.uid() is null then
    raise exception 'Authorized admin account and MFA are required.' using errcode='42501';
  end if;
  select * into v_entry from public.admin_finance_entries where id=p_entry_id for update;
  if not found then raise exception 'Finance cashbook record was not found.'; end if;
  if v_entry.accounting_journal_id is not null then return v_entry.accounting_journal_id; end if;
  if v_entry.status<>'confirmed' then raise exception 'Only a Confirmed source record can be posted.'; end if;
  if v_entry.related_cod_settlement_id is not null or v_entry.related_supplier_payment_id is not null then
    raise exception 'COD and supplier payment records must be posted from their source workflows.';
  end if;
  if v_entry.account_id is null then raise exception 'Choose a Finance cash/bank account before posting.'; end if;
  if v_entry.financial_class='adjustment' then
    raise exception 'Adjustment entries may need multiple lines; create a manual Journal Entry instead.';
  end if;
  if v_entry.related_order_id is not null then
    if v_entry.entry_type<>'income' then
      raise exception 'An order-linked cash receipt must be an Income cashbook entry.';
    end if;
    if exists(select 1 from public.orders where id=v_entry.related_order_id and payment_method='cash_on_delivery') then
      raise exception 'COD receipts are recorded only through the courier settlement workflow.';
    end if;
    if not exists(select 1 from public.admin_finance_journal_entries
      where source_type='order_sale' and source_key=v_entry.related_order_id::text and status='posted') then
      raise exception 'Recognize the delivered order sale first. Customer receipts must reduce Accounts Receivable, not create revenue again.';
    end if;
    if p_counter_account_id is distinct from (select id from public.admin_finance_chart_of_accounts where account_code='1100') then
      raise exception 'An order-linked customer payment must credit Accounts Receivable (1100).';
    end if;
  end if;
  select ledger_account_id,id,opening_date into v_cash_coa_id,v_cash_account_id,v_period_open
  from public.admin_finance_accounts where id=v_entry.account_id;
  if v_cash_coa_id is null then raise exception 'Map this Finance account to a Chart of Accounts asset first.'; end if;
  if v_entry.entry_date<v_period_open then raise exception 'Transaction date cannot be earlier than the Finance account opening date.'; end if;
  select * into v_counter from public.admin_finance_chart_of_accounts where id=p_counter_account_id;
  if not found or not v_counter.is_active or not v_counter.is_postable then
    raise exception 'Choose an active, postable General Ledger account.';
  end if;
  if v_counter.id=v_cash_coa_id then
    raise exception 'The cash/bank account cannot also be its own counter-account.';
  end if;
  if v_counter.account_type='asset' and not (
    (v_entry.entry_type='income' and v_counter.account_code in ('1100','1110'))
    or (v_entry.entry_type='expense' and v_counter.account_code in ('1200','1110'))
  ) then
    raise exception 'Do not record asset-to-asset movements as Income or Expense. Use Account Transfer or the appropriate Receivable, Inventory or Supplier Advance account.';
  end if;

  if v_entry.entry_type='income' then
    if v_counter.account_type not in ('revenue','other_income','equity','liability','contra_revenue','expense')
       and not (v_counter.account_type='asset' and v_counter.account_code='1100' and v_entry.related_order_id is not null) then
      raise exception 'The selected counter-account is not appropriate for a money-in transaction.';
    end if;
    if v_counter.account_code='1100' and (
      v_entry.related_order_id is null
      or exists(select 1 from public.orders where id=v_entry.related_order_id and payment_method='cash_on_delivery')
    ) then
      raise exception 'Accounts Receivable receipts must be linked to a non-COD customer order.';
    end if;
    v_lines:=jsonb_build_array(
      jsonb_build_object('account_id',v_cash_coa_id,'description',v_entry.category,'party_name',v_entry.party_name,'debit',v_entry.amount,'credit',0),
      jsonb_build_object('account_id',p_counter_account_id,'description',v_entry.category,'party_name',v_entry.party_name,'debit',0,'credit',v_entry.amount)
    );
  elsif v_entry.entry_type='expense' then
    if v_counter.account_type not in ('expense','cost_of_sales','contra_revenue','equity','liability','asset') then
      raise exception 'The selected counter-account is not appropriate for a money-out transaction.';
    end if;
    v_lines:=jsonb_build_array(
      jsonb_build_object('account_id',p_counter_account_id,'description',v_entry.category,'party_name',v_entry.party_name,'debit',v_entry.amount,'credit',0),
      jsonb_build_object('account_id',v_cash_coa_id,'description',v_entry.category,'party_name',v_entry.party_name,'debit',0,'credit',v_entry.amount)
    );
  else
    raise exception 'Unknown Finance entry type.';
  end if;

  v_journal_id:=public.admin_finance_save_journal_entry(
    null,v_entry.entry_date,
    left(v_entry.category||': '||coalesce(nullif(v_entry.description,''),v_entry.party_name,'Finance transaction'),500),
    v_lines,'cashbook',v_entry.id::text,true
  );
  perform pg_catalog.set_config('app.finance_operations_sync','on',true);
  update public.admin_finance_entries set accounting_journal_id=v_journal_id,updated_at=now()
  where id=p_entry_id;
  return v_journal_id;
end;
$$;
revoke all on function public.admin_finance_post_cashbook_entry(uuid,uuid) from public,anon;
grant execute on function public.admin_finance_post_cashbook_entry(uuid,uuid) to authenticated;

create or replace function public.admin_finance_post_account_opening_balance(
  p_account_id uuid,
  p_offset_account_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare
 v_email text:=lower(coalesce((select auth.jwt()->>'email'),''));
 v_aal text:=coalesce((select auth.jwt()->>'aal'),'aal1');
 v_account public.admin_finance_accounts%rowtype;
 v_offset public.admin_finance_chart_of_accounts%rowtype;
 v_journal_id uuid;
begin
 if v_email<>'halalfoodbd.official@gmail.com' or v_aal<>'aal2' or auth.uid() is null then
  raise exception 'Authorized admin account and MFA are required.' using errcode='42501';
 end if;
 select * into v_account from public.admin_finance_accounts where id=p_account_id for update;
 if not found then raise exception 'Finance account was not found.'; end if;
 if v_account.opening_balance_journal_id is not null then return v_account.opening_balance_journal_id; end if;
 if v_account.opening_balance<=0 then raise exception 'Opening balance is zero; no opening journal is needed.'; end if;
 if v_account.ledger_account_id is null then raise exception 'Map the Finance account to an Asset account first.'; end if;
 select * into v_offset from public.admin_finance_chart_of_accounts where id=p_offset_account_id;
 if not found or not v_offset.is_active or not v_offset.is_postable
   or v_offset.account_type not in ('equity','liability') then
  raise exception 'Choose an active Equity or Liability account as the opening balance offset.';
 end if;
 v_journal_id:=public.admin_finance_save_journal_entry(
  null,v_account.opening_date,'Verified opening balance · '||v_account.name,
  jsonb_build_array(
   jsonb_build_object('account_id',v_account.ledger_account_id,'description','Verified opening balance','party_name',v_account.name,'debit',v_account.opening_balance,'credit',0),
   jsonb_build_object('account_id',p_offset_account_id,'description','Opening balance offset','party_name',v_account.name,'debit',0,'credit',v_account.opening_balance)
  ),
  'account_opening',p_account_id::text,true
 );
 perform pg_catalog.set_config('app.finance_operations_sync','on',true);
 update public.admin_finance_accounts
 set opening_balance_journal_id=v_journal_id,opening_offset_account_id=p_offset_account_id,updated_at=now()
 where id=p_account_id;
 return v_journal_id;
end;
$$;
revoke all on function public.admin_finance_post_account_opening_balance(uuid,uuid) from public,anon;
grant execute on function public.admin_finance_post_account_opening_balance(uuid,uuid) to authenticated;

create or replace function public.admin_finance_confirm_transfer(p_transfer_id uuid)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare
 v_email text:=lower(coalesce((select auth.jwt()->>'email'),''));
 v_aal text:=coalesce((select auth.jwt()->>'aal'),'aal1');
 v_transfer public.admin_finance_transfers%rowtype;
 v_source public.admin_finance_accounts%rowtype;
 v_dest public.admin_finance_accounts%rowtype;
 v_balance numeric(14,2);
 v_journal_id uuid;
begin
 if v_email<>'halalfoodbd.official@gmail.com' or v_aal<>'aal2' or auth.uid() is null then
  raise exception 'Authorized admin account and MFA are required.' using errcode='42501';
 end if;
 select * into v_transfer from public.admin_finance_transfers where id=p_transfer_id for update;
 if not found then raise exception 'Transfer was not found.'; end if;
 if v_transfer.status='confirmed' and v_transfer.accounting_journal_id is not null then return v_transfer.accounting_journal_id; end if;
 if v_transfer.status<>'draft' then raise exception 'Only a Draft transfer can be confirmed.'; end if;
 select * into v_source from public.admin_finance_accounts where id=v_transfer.source_account_id for update;
 select * into v_dest from public.admin_finance_accounts where id=v_transfer.destination_account_id for update;
 if not v_source.is_active or not v_dest.is_active then raise exception 'Both Finance accounts must be active.'; end if;
 if v_source.ledger_account_id is null or v_dest.ledger_account_id is null then raise exception 'Map both Finance accounts to active Asset accounts in the Chart of Accounts.'; end if;
 if v_transfer.transfer_date<v_source.opening_date or v_transfer.transfer_date<v_dest.opening_date then
  raise exception 'Transfer date cannot be earlier than either account opening date.';
 end if;

 select v_source.opening_balance
   +coalesce((select sum(case when entry_type='income' then amount else -amount end)
      from public.admin_finance_entries
      where account_id=v_source.id and status='confirmed' and entry_date>=v_source.opening_date),0)
   +coalesce((select sum(amount) from public.admin_finance_transfers
      where destination_account_id=v_source.id and status='confirmed' and transfer_date>=v_source.opening_date and id<>p_transfer_id),0)
   -coalesce((select sum(amount) from public.admin_finance_transfers
      where source_account_id=v_source.id and status='confirmed' and transfer_date>=v_source.opening_date and id<>p_transfer_id),0)
 into v_balance;
 if v_transfer.amount>v_balance then
  raise exception 'Insufficient recorded balance in %. Available: %.',v_source.name,v_balance;
 end if;

 v_journal_id:=public.admin_finance_save_journal_entry(
  null,v_transfer.transfer_date,'Internal transfer · '||v_source.name||' to '||v_dest.name,
  jsonb_build_array(
   jsonb_build_object('account_id',v_dest.ledger_account_id,'description','Transfer received · '||v_source.name,'party_name',v_dest.name,'debit',v_transfer.amount,'credit',0),
   jsonb_build_object('account_id',v_source.ledger_account_id,'description','Transfer sent · '||v_dest.name,'party_name',v_source.name,'debit',0,'credit',v_transfer.amount)
  ),
  'finance_transfer',p_transfer_id::text,true
 );
 perform pg_catalog.set_config('app.finance_operations_sync','on',true);
 update public.admin_finance_transfers
 set status='confirmed',accounting_journal_id=v_journal_id,updated_at=now()
 where id=p_transfer_id;
 return v_journal_id;
end;
$$;
revoke all on function public.admin_finance_confirm_transfer(uuid) from public,anon;
grant execute on function public.admin_finance_confirm_transfer(uuid) to authenticated;

create or replace function public.admin_finance_void_transfer(p_transfer_id uuid,p_reason text)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare
 v_email text:=lower(coalesce((select auth.jwt()->>'email'),''));
 v_aal text:=coalesce((select auth.jwt()->>'aal'),'aal1');
 v_transfer public.admin_finance_transfers%rowtype;
 v_reversal_id uuid;
begin
 if v_email<>'halalfoodbd.official@gmail.com' or v_aal<>'aal2' or auth.uid() is null then
  raise exception 'Authorized admin account and MFA are required.' using errcode='42501';
 end if;
 if length(btrim(coalesce(p_reason,'')))<5 then raise exception 'Enter a void reason of at least five characters.'; end if;
 select * into v_transfer from public.admin_finance_transfers where id=p_transfer_id for update;
 if not found then raise exception 'Transfer was not found.'; end if;
 if v_transfer.status='void' then return v_transfer.reversal_journal_id; end if;
 if v_transfer.status='draft' then
  perform pg_catalog.set_config('app.finance_operations_sync','on',true);
  update public.admin_finance_transfers set status='void',updated_at=now() where id=p_transfer_id;
  return null;
 end if;
 if v_transfer.status<>'confirmed' or v_transfer.accounting_journal_id is null then
  raise exception 'Only a confirmed, journalized transfer can be reversed.';
 end if;
 v_reversal_id:=public.admin_finance_reverse_journal_entry(v_transfer.accounting_journal_id,current_date,p_reason);
 perform pg_catalog.set_config('app.finance_operations_sync','on',true);
 update public.admin_finance_transfers
 set status='void',reversal_journal_id=v_reversal_id,updated_at=now()
 where id=p_transfer_id;
 return v_reversal_id;
end;
$$;
revoke all on function public.admin_finance_void_transfer(uuid,text) from public,anon;
grant execute on function public.admin_finance_void_transfer(uuid,text) to authenticated;

create or replace function public.admin_finance_recognize_delivered_order_sale(p_order_id uuid)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare
 v_email text:=lower(coalesce((select auth.jwt()->>'email'),''));
 v_aal text:=coalesce((select auth.jwt()->>'aal'),'aal1');
 v_order public.orders%rowtype;
 v_item_subtotal numeric(14,2);
 v_net_sales numeric(14,2);
 v_debit_account_id uuid;
 v_debit_account_code text;
 v_existing uuid;
 v_existing_status text;
 v_lines jsonb;
 v_journal_id uuid;
begin
 if v_email<>'halalfoodbd.official@gmail.com' or v_aal<>'aal2' or auth.uid() is null then
  raise exception 'Authorized admin account and MFA are required.' using errcode='42501';
 end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if not found then raise exception 'Order was not found.'; end if;
 if v_order.status<>'delivered' then raise exception 'Sales can be recognized only after the order is Delivered.'; end if;

 select id,status into v_existing,v_existing_status
 from public.admin_finance_journal_entries
 where source_type='order_sale' and source_key=p_order_id::text;
 if v_existing is not null then
  if v_existing_status='posted' then return v_existing; end if;
  raise exception 'This delivered order sale has already been reversed. Review the order correction before attempting another posting.';
 end if;

 if exists(
   select 1 from public.admin_finance_entries e
   where e.related_order_id=p_order_id and e.entry_type='income'
     and e.status='confirmed' and e.accounting_journal_id is not null
 ) then
  raise exception 'A linked income receipt is already posted to accounting. Review the existing Journal before recognizing this order.';
 end if;

 select coalesce(sum(line_total),0) into v_item_subtotal
 from public.order_items where order_id=p_order_id;
 if v_item_subtotal<=0 or abs(v_item_subtotal-v_order.subtotal)>0.01 then
  raise exception 'Order item totals do not match the saved order subtotal. Review the order before posting.';
 end if;
 v_net_sales:=round(v_order.subtotal-coalesce(v_order.coupon_discount_amount,0),2);
 if v_net_sales<0 or v_order.delivery_charge<0
   or abs(v_net_sales+v_order.delivery_charge-v_order.total)>0.01 then
  raise exception 'Order total, discount and delivery charge do not reconcile. Review the order before posting.';
 end if;

 if v_order.payment_method='cash_on_delivery' then
  select id,account_code into v_debit_account_id,v_debit_account_code
  from public.admin_finance_chart_of_accounts where account_code='1040' and is_active and is_postable;
 else
  select id,account_code into v_debit_account_id,v_debit_account_code
  from public.admin_finance_chart_of_accounts where account_code='1100' and is_active and is_postable;
 end if;
 if v_debit_account_id is null then
  raise exception 'The required Receivable / Courier Clearing account is not configured in the Chart of Accounts.';
 end if;

 v_lines:=jsonb_build_array(
  jsonb_build_object('account_id',v_debit_account_id,
    'description',case when v_order.payment_method='cash_on_delivery' then 'Courier COD receivable · ' else 'Customer receivable · ' end||v_order.order_number,
    'party_name',v_order.customer_name,'debit',v_order.total,'credit',0),
  jsonb_build_object('account_id',(select id from public.admin_finance_chart_of_accounts where account_code='4010'),
    'description','Net product sales · '||v_order.order_number,'party_name',v_order.customer_name,'debit',0,'credit',v_net_sales)
 );
 if v_order.delivery_charge>0 then
  v_lines:=v_lines||jsonb_build_array(jsonb_build_object(
   'account_id',(select id from public.admin_finance_chart_of_accounts where account_code='4020'),
   'description','Delivery income · '||v_order.order_number,'party_name',v_order.customer_name,
   'debit',0,'credit',v_order.delivery_charge
  ));
 end if;
 v_journal_id:=public.admin_finance_save_journal_entry(
  null,(v_order.ordered_at at time zone 'Asia/Dhaka')::date,
  'Recognized delivered sale · '||v_order.order_number,
  v_lines,'order_sale',p_order_id::text,true
 );
 return v_journal_id;
end;
$$;
revoke all on function public.admin_finance_recognize_delivered_order_sale(uuid) from public,anon;
grant execute on function public.admin_finance_recognize_delivered_order_sale(uuid) to authenticated;

create or replace function public.admin_finance_post_cod_settlement(p_settlement_id uuid)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare
 v_email text:=lower(coalesce((select auth.jwt()->>'email'),''));
 v_aal text:=coalesce((select auth.jwt()->>'aal'),'aal1');
 v_settlement public.admin_cod_settlements%rowtype;
 v_fin_account public.admin_finance_accounts%rowtype;
 v_journal_id uuid;
 v_sale_journal_id uuid;
 v_delta numeric(14,2);
 v_lines jsonb;
begin
 if v_email<>'halalfoodbd.official@gmail.com' or v_aal<>'aal2' or auth.uid() is null then
  raise exception 'Authorized admin account and MFA are required.' using errcode='42501';
 end if;
 select * into v_settlement from public.admin_cod_settlements where id=p_settlement_id for update;
 if not found then raise exception 'COD settlement was not found.'; end if;
 if v_settlement.reversal_journal_id is not null then raise exception 'This COD settlement was reversed. Create a new verified settlement record for any corrected remittance.'; end if;
 if v_settlement.accounting_journal_id is not null then return v_settlement.accounting_journal_id; end if;
 if v_settlement.status<>'reconciled' then raise exception 'Only a Reconciled COD settlement can be posted.'; end if;
 if v_settlement.order_id is null then raise exception 'The COD settlement must be linked to its original order.'; end if;
 v_sale_journal_id:=public.admin_finance_recognize_delivered_order_sale(v_settlement.order_id);
 if v_settlement.collected_amount<=0 or v_settlement.collected_amount>v_settlement.cod_amount then
  raise exception 'Collected amount must be positive and cannot exceed the COD order value.';
 end if;
 if abs(v_settlement.cod_amount-(select total from public.orders where id=v_settlement.order_id))>0.01 then
  raise exception 'COD amount does not match the linked order total. Review the courier statement and order before posting.';
 end if;
 if abs((v_settlement.remitted_amount+v_settlement.courier_fee-v_settlement.collected_amount)-v_settlement.adjustment_amount)>0.01 then
  raise exception 'Remitted amount, courier fee, collection and adjustment do not reconcile. Review the courier statement.';
 end if;
 select * into v_fin_account from public.admin_finance_accounts where id=v_settlement.remitted_account_id;
 if not found or not v_fin_account.is_active or v_fin_account.ledger_account_id is null then
  raise exception 'Choose an active remittance account mapped to an Asset account.';
 end if;
 if v_settlement.remitted_at<v_fin_account.opening_date then
  raise exception 'Remittance date cannot be earlier than the Finance account opening date.';
 end if;
 v_delta:=round(v_settlement.remitted_amount+v_settlement.courier_fee-v_settlement.collected_amount,2);
 v_lines:=jsonb_build_array(
  jsonb_build_object('account_id',v_fin_account.ledger_account_id,'description','COD remittance received · '||v_settlement.order_number,'party_name',v_settlement.courier_name,'debit',v_settlement.remitted_amount,'credit',0),
  jsonb_build_object('account_id',(select id from public.admin_finance_chart_of_accounts where account_code='6020'),'description','Courier fee · '||v_settlement.order_number,'party_name',v_settlement.courier_name,'debit',v_settlement.courier_fee,'credit',0),
  jsonb_build_object('account_id',(select id from public.admin_finance_chart_of_accounts where account_code='1040'),'description','Clear courier receivable · '||v_settlement.order_number,'party_name',v_settlement.courier_name,'debit',0,'credit',v_settlement.collected_amount)
 );
 if v_delta>0 then
  v_lines:=v_lines||jsonb_build_array(jsonb_build_object('account_id',(select id from public.admin_finance_chart_of_accounts where account_code='4096'),'description','Positive courier adjustment · '||v_settlement.order_number,'party_name',v_settlement.courier_name,'debit',0,'credit',v_delta));
 elsif v_delta<0 then
  v_lines:=v_lines||jsonb_build_array(jsonb_build_object('account_id',(select id from public.admin_finance_chart_of_accounts where account_code='6096'),'description','Negative courier adjustment · '||v_settlement.order_number,'party_name',v_settlement.courier_name,'debit',abs(v_delta),'credit',0));
 end if;
 v_journal_id:=public.admin_finance_save_journal_entry(
  null,v_settlement.remitted_at,
  'COD remittance reconciliation · '||v_settlement.order_number,
  v_lines,'cod_settlement',p_settlement_id::text,true
 );
 perform pg_catalog.set_config('app.finance_operations_sync','on',true);
 update public.admin_cod_settlements set accounting_journal_id=v_journal_id,updated_at=now()
 where id=p_settlement_id;
 update public.admin_finance_entries set accounting_journal_id=v_journal_id,updated_at=now()
 where related_cod_settlement_id=p_settlement_id and status='confirmed';
 return v_journal_id;
end;
$$;
revoke all on function public.admin_finance_post_cod_settlement(uuid) from public,anon;
grant execute on function public.admin_finance_post_cod_settlement(uuid) to authenticated;

create or replace function public.admin_finance_post_supplier_bill(
 p_bill_id uuid,
 p_debit_account_id uuid,
 p_tax_account_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare
 v_email text:=lower(coalesce((select auth.jwt()->>'email'),''));
 v_aal text:=coalesce((select auth.jwt()->>'aal'),'aal1');
 v_bill public.admin_supplier_bills%rowtype;
 v_cost public.admin_finance_chart_of_accounts%rowtype;
 v_tax public.admin_finance_chart_of_accounts%rowtype;
 v_grn_quantity numeric;
 v_po_quantity numeric;
 v_po_total numeric(14,2);
 v_base_amount numeric(14,2);
 v_lines jsonb:='[]'::jsonb;
 v_journal_id uuid;
begin
 if v_email<>'halalfoodbd.official@gmail.com' or v_aal<>'aal2' or auth.uid() is null then
  raise exception 'Authorized admin account and MFA are required.' using errcode='42501';
 end if;
 select * into v_bill from public.admin_supplier_bills where id=p_bill_id for update;
 if not found then raise exception 'Supplier bill was not found.'; end if;
 if v_bill.reversal_journal_id is not null or v_bill.status='void' then raise exception 'This supplier bill was reversed or voided and cannot be posted again.'; end if;
 if v_bill.accounting_journal_id is not null then return v_bill.accounting_journal_id; end if;
 if v_bill.status<>'confirmed' then raise exception 'Only a Confirmed supplier bill can be posted.'; end if;
 if v_bill.purchase_order_id is null then
  raise exception 'Link the bill to its approved Purchase Order and confirmed Goods Received Note before posting.';
 end if;

 select coalesce(sum(ri.quantity_accepted),0) into v_grn_quantity
 from public.admin_purchase_receipts r
 join public.admin_purchase_receipt_items ri on ri.receipt_id=r.id
 where r.purchase_order_id=v_bill.purchase_order_id and r.supplier_id=v_bill.supplier_id
   and r.status='confirmed';
 select coalesce(sum(quantity),0) into v_po_quantity
 from public.admin_purchase_order_items where purchase_order_id=v_bill.purchase_order_id;
 select round(total_amount,2) into v_po_total
 from public.admin_purchase_orders where id=v_bill.purchase_order_id and supplier_id=v_bill.supplier_id;

 if v_grn_quantity<=0 or v_po_quantity<=0 then
  raise exception 'No accepted GRN quantity or PO item quantity exists. Verify the purchase receipt before posting.';
 end if;
 if v_grn_quantity+0.001<v_po_quantity then
  raise exception 'Supplier bill posting is blocked until the linked Purchase Order is fully received and accepted. Create separate POs for partial invoicing.';
 end if;
 if v_po_total is null or abs(v_bill.total_amount-v_po_total)>0.01 then
  raise exception 'Supplier invoice total does not match the approved Purchase Order total. Reconcile quantities, discounts, freight and tax before posting.';
 end if;

 select * into v_cost from public.admin_finance_chart_of_accounts where id=p_debit_account_id;
 if not found or not v_cost.is_active or not v_cost.is_postable
   or v_cost.account_type not in ('asset','expense','cost_of_sales') then
  raise exception 'Choose an active Asset, Expense or Cost of Sales account for the bill subtotal and additional charges.';
 end if;

 v_base_amount:=round(v_bill.total_amount-v_bill.tax_amount,2);
 if v_bill.tax_amount>0 then
  select * into v_tax from public.admin_finance_chart_of_accounts where id=p_tax_account_id;
  if not found or not v_tax.is_active or not v_tax.is_postable
    or v_tax.account_type not in ('asset','expense') then
   raise exception 'This invoice includes tax. Choose an Asset account only when the tax is verified as recoverable; otherwise choose an Expense account.';
  end if;
 end if;

 if v_base_amount>0 then
  v_lines:=v_lines||jsonb_build_array(jsonb_build_object(
   'account_id',p_debit_account_id,
   'description','Supplier purchase value and inbound charges · '||v_bill.bill_number,
   'party_name',v_bill.supplier_invoice_number,'debit',v_base_amount,'credit',0
  ));
 end if;
 if v_bill.tax_amount>0 then
  v_lines:=v_lines||jsonb_build_array(jsonb_build_object(
   'account_id',p_tax_account_id,
   'description','Invoice tax classification · '||v_bill.bill_number,
   'party_name',v_bill.supplier_invoice_number,'debit',v_bill.tax_amount,'credit',0
  ));
 end if;
 v_lines:=v_lines||jsonb_build_array(jsonb_build_object(
  'account_id',(select id from public.admin_finance_chart_of_accounts where account_code='2010'),
  'description','Accounts payable · '||v_bill.bill_number,
  'party_name',v_bill.supplier_invoice_number,'debit',0,'credit',v_bill.total_amount
 ));

 v_journal_id:=public.admin_finance_save_journal_entry(
  null,v_bill.invoice_date,
  'Supplier bill · '||v_bill.bill_number||' · '||v_bill.supplier_invoice_number,
  v_lines,'supplier_bill',p_bill_id::text,true
 );
 perform pg_catalog.set_config('app.finance_operations_sync','on',true);
 update public.admin_supplier_bills set accounting_journal_id=v_journal_id,updated_at=now()
 where id=p_bill_id;
 return v_journal_id;
end;
$$;
revoke all on function public.admin_finance_post_supplier_bill(uuid,uuid,uuid) from public,anon;
grant execute on function public.admin_finance_post_supplier_bill(uuid,uuid,uuid) to authenticated;

create or replace function public.admin_finance_post_supplier_payment(p_payment_id uuid)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare
 v_email text:=lower(coalesce((select auth.jwt()->>'email'),''));
 v_aal text:=coalesce((select auth.jwt()->>'aal'),'aal1');
 v_payment public.admin_supplier_payments%rowtype;
 v_cash_coa_id uuid;
 v_supplier_name text;
 v_ap_id uuid;
 v_advances_id uuid;
 v_allocated numeric(14,2);
 v_ap_debit numeric(14,2):=0;
 v_advance_debit numeric(14,2):=0;
 v_current_allocation numeric(14,2);
 v_prior_payments numeric(14,2);
 v_prior_credits numeric(14,2);
 v_outstanding numeric(14,2);
 v_apply numeric(14,2);
 v_bill public.admin_supplier_bills%rowtype;
 v_allocation record;
 v_lines jsonb:='[]'::jsonb;
 v_journal_id uuid;
begin
 if v_email<>'halalfoodbd.official@gmail.com' or v_aal<>'aal2' or auth.uid() is null then
  raise exception 'Authorized admin account and MFA are required.' using errcode='42501';
 end if;
 select * into v_payment from public.admin_supplier_payments where id=p_payment_id for update;
 if not found then raise exception 'Supplier payment was not found.'; end if;
 if v_payment.reversal_journal_id is not null or v_payment.status='void' then
  raise exception 'This supplier payment was reversed or voided and cannot be posted again.';
 end if;
 if v_payment.accounting_journal_id is not null then return v_payment.accounting_journal_id; end if;
 if v_payment.status<>'confirmed' then raise exception 'Only a Confirmed supplier payment can be posted.'; end if;

 select ledger_account_id into v_cash_coa_id
 from public.admin_finance_accounts
 where id=(select account_id from public.admin_finance_entries where related_supplier_payment_id=p_payment_id)
   and ledger_account_id is not null and is_active;
 if v_cash_coa_id is null then
  select a.ledger_account_id into v_cash_coa_id
  from public.admin_finance_accounts a
  where a.is_active and a.ledger_account_id is not null
    and (lower(btrim(a.name))=lower(btrim(v_payment.paid_from_account))
      or (length(btrim(coalesce(a.account_reference,'')))>0 and lower(btrim(a.account_reference))=lower(btrim(v_payment.paid_from_account))))
  order by case when lower(btrim(a.name))=lower(btrim(v_payment.paid_from_account)) then 0 else 1 end
  limit 1;
 end if;
 if v_cash_coa_id is null then
  raise exception 'The Supplier Payment account must match an active Finance account with a General Ledger mapping.';
 end if;

 select name into v_supplier_name from public.admin_suppliers where id=v_payment.supplier_id;
 select coalesce(sum(a.allocated_amount),0) into v_allocated
 from public.admin_supplier_payment_allocations a
 where a.payment_id=p_payment_id;
 if v_allocated>v_payment.amount+0.01 then
  raise exception 'Allocated amount cannot exceed the supplier payment amount.';
 end if;
 if exists(
  select 1 from public.admin_supplier_payment_allocations a
  join public.admin_supplier_bills b on b.id=a.supplier_bill_id
  where a.payment_id=p_payment_id and b.supplier_id<>v_payment.supplier_id
 ) then
  raise exception 'A supplier payment allocation references a bill belonging to another supplier.';
 end if;

 v_ap_id:=(select id from public.admin_finance_chart_of_accounts where account_code='2010');
 v_advances_id:=(select id from public.admin_finance_chart_of_accounts where account_code='1110');

 for v_allocation in
   select a.supplier_bill_id,a.allocated_amount
   from public.admin_supplier_payment_allocations a
   where a.payment_id=p_payment_id
   order by a.supplier_bill_id
 loop
  select * into v_bill from public.admin_supplier_bills
  where id=v_allocation.supplier_bill_id and supplier_id=v_payment.supplier_id
  for update;
  if not found or v_bill.status<>'confirmed' then
   raise exception 'Every allocated supplier bill must belong to this supplier and be Confirmed.';
  end if;
  if v_bill.accounting_journal_id is null or v_bill.reversal_journal_id is not null then
   raise exception 'Post the linked supplier bill before applying a payment allocation.';
  end if;

  select coalesce(sum(a.allocated_amount),0) into v_prior_payments
  from public.admin_supplier_payment_allocations a
  join public.admin_supplier_payments p on p.id=a.payment_id
  where a.supplier_bill_id=v_bill.id and a.payment_id<>p_payment_id
    and p.status='confirmed' and p.accounting_journal_id is not null
    and p.reversal_journal_id is null;

  select coalesce(sum(cn.amount),0) into v_prior_credits
  from public.admin_supplier_credit_notes cn
  where cn.supplier_bill_id=v_bill.id and cn.status='confirmed'
    and cn.accounting_journal_id is not null and cn.reversal_journal_id is null;

  v_outstanding:=greatest(0,round(v_bill.total_amount-v_prior_payments-v_prior_credits,2));
  v_apply:=least(round(v_allocation.allocated_amount,2),v_outstanding);
  v_ap_debit:=v_ap_debit+v_apply;
  v_advance_debit:=v_advance_debit+(round(v_allocation.allocated_amount,2)-v_apply);
 end loop;

 v_advance_debit:=v_advance_debit+greatest(0,round(v_payment.amount-v_allocated,2));
 if v_ap_debit>0 then
  v_lines:=v_lines||jsonb_build_array(jsonb_build_object(
   'account_id',v_ap_id,'description','Payment applied to confirmed supplier bill balances',
   'party_name',v_supplier_name,'debit',round(v_ap_debit,2),'credit',0
  ));
 end if;
 if v_advance_debit>0 then
  v_lines:=v_lines||jsonb_build_array(jsonb_build_object(
   'account_id',v_advances_id,'description','Unallocated or overpaid supplier advance',
   'party_name',v_supplier_name,'debit',round(v_advance_debit,2),'credit',0
  ));
 end if;
 v_lines:=v_lines||jsonb_build_array(jsonb_build_object(
  'account_id',v_cash_coa_id,'description','Supplier payment · '||v_payment.payment_number,
  'party_name',v_supplier_name,'debit',0,'credit',v_payment.amount
 ));

 v_journal_id:=public.admin_finance_save_journal_entry(
  null,v_payment.payment_date,'Supplier payment · '||v_payment.payment_number||' · '||v_supplier_name,
  v_lines,'supplier_payment',p_payment_id::text,true
 );
 perform pg_catalog.set_config('app.finance_operations_sync','on',true);
 update public.admin_supplier_payments set accounting_journal_id=v_journal_id,updated_at=now()
 where id=p_payment_id;
 update public.admin_finance_entries set accounting_journal_id=v_journal_id,updated_at=now()
 where related_supplier_payment_id=p_payment_id;
 return v_journal_id;
end;
$$;
revoke all on function public.admin_finance_post_supplier_payment(uuid) from public,anon;
grant execute on function public.admin_finance_post_supplier_payment(uuid) to authenticated;

create or replace function public.admin_finance_reverse_cashbook_entry(
 p_entry_id uuid,p_reversal_date date,p_reason text
)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare
 v_email text:=lower(coalesce((select auth.jwt()->>'email'),''));
 v_aal text:=coalesce((select auth.jwt()->>'aal'),'aal1');
 v_entry public.admin_finance_entries%rowtype;
 v_status text;
 v_reversal uuid;
begin
 if v_email<>'halalfoodbd.official@gmail.com' or v_aal<>'aal2' or auth.uid() is null then
  raise exception 'Authorized admin account and MFA are required.' using errcode='42501';
 end if;
 if p_reversal_date is null or length(btrim(coalesce(p_reason,'')))<5 then
  raise exception 'Enter a reversal date and a reason of at least five characters.';
 end if;
 select * into v_entry from public.admin_finance_entries where id=p_entry_id for update;
 if not found then raise exception 'Cashbook transaction was not found.'; end if;
 if v_entry.related_cod_settlement_id is not null or v_entry.related_supplier_payment_id is not null then
  raise exception 'COD and Supplier Payment cashbook mirrors must be reversed from their source workflow.';
 end if;
 if v_entry.status='void' then return v_entry.reversal_journal_id; end if;
 if v_entry.status not in ('confirmed','draft') then raise exception 'Only Draft or Confirmed cashbook entries can be voided.'; end if;

 if v_entry.accounting_journal_id is not null then
  select status into v_status from public.admin_finance_journal_entries where id=v_entry.accounting_journal_id;
  if v_status='posted' then
   v_reversal:=public.admin_finance_reverse_journal_entry(v_entry.accounting_journal_id,p_reversal_date,p_reason);
  elsif v_status='reversed' then
   select reversed_by into v_reversal from public.admin_finance_journal_entries where id=v_entry.accounting_journal_id;
  else
   raise exception 'The linked Journal is not Posted or Reversed. Review the accounting record.';
  end if;
 end if;
 perform pg_catalog.set_config('app.finance_operations_sync','on',true);
 update public.admin_finance_entries
 set status='void',reversal_journal_id=v_reversal,updated_at=now()
 where id=p_entry_id;
 return v_reversal;
end;
$$;
revoke all on function public.admin_finance_reverse_cashbook_entry(uuid,date,text) from public,anon;
grant execute on function public.admin_finance_reverse_cashbook_entry(uuid,date,text) to authenticated;

create or replace function public.admin_finance_reverse_cod_settlement(
 p_settlement_id uuid,p_reversal_date date,p_reason text
)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare
 v_email text:=lower(coalesce((select auth.jwt()->>'email'),''));
 v_aal text:=coalesce((select auth.jwt()->>'aal'),'aal1');
 v_settlement public.admin_cod_settlements%rowtype;
 v_status text;
 v_reversal uuid;
begin
 if v_email<>'halalfoodbd.official@gmail.com' or v_aal<>'aal2' or auth.uid() is null then
  raise exception 'Authorized admin account and MFA are required.' using errcode='42501';
 end if;
 if p_reversal_date is null or length(btrim(coalesce(p_reason,'')))<5 then
  raise exception 'Enter a reversal date and a reason of at least five characters.';
 end if;
 select * into v_settlement from public.admin_cod_settlements where id=p_settlement_id for update;
 if not found then raise exception 'COD settlement was not found.'; end if;
 if v_settlement.reversal_journal_id is not null then return v_settlement.reversal_journal_id; end if;
 if v_settlement.accounting_journal_id is null then
  raise exception 'This COD settlement has no accounting Journal.';
 end if;
 select status into v_status from public.admin_finance_journal_entries where id=v_settlement.accounting_journal_id;
 if v_status='posted' then
  v_reversal:=public.admin_finance_reverse_journal_entry(v_settlement.accounting_journal_id,p_reversal_date,p_reason);
 elsif v_status='reversed' then
  select reversed_by into v_reversal from public.admin_finance_journal_entries where id=v_settlement.accounting_journal_id;
 else
  raise exception 'The COD remittance Journal is not Posted or Reversed.';
 end if;
 perform pg_catalog.set_config('app.finance_operations_sync','on',true);
 update public.admin_cod_settlements
 set status='exception',
     reversal_journal_id=v_reversal,
     notes=left(concat_ws(E'\n',nullif(notes,''),'COD remittance reversal: '||btrim(p_reason)),1200),
     updated_at=now()
 where id=p_settlement_id;
 update public.admin_finance_entries
 set status='void',reversal_journal_id=v_reversal,updated_at=now()
 where related_cod_settlement_id=p_settlement_id and accounting_journal_id=v_settlement.accounting_journal_id;
 return v_reversal;
end;
$$;
revoke all on function public.admin_finance_reverse_cod_settlement(uuid,date,text) from public,anon;
grant execute on function public.admin_finance_reverse_cod_settlement(uuid,date,text) to authenticated;

create or replace function public.admin_finance_reverse_supplier_bill(
 p_bill_id uuid,p_reversal_date date,p_reason text
)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare
 v_email text:=lower(coalesce((select auth.jwt()->>'email'),''));
 v_aal text:=coalesce((select auth.jwt()->>'aal'),'aal1');
 v_bill public.admin_supplier_bills%rowtype;
 v_status text;
 v_reversal uuid;
 v_allocations numeric(14,2);
 v_credits numeric(14,2);
 v_received numeric(14,3);
begin
 if v_email<>'halalfoodbd.official@gmail.com' or v_aal<>'aal2' or auth.uid() is null then
  raise exception 'Authorized admin account and MFA are required.' using errcode='42501';
 end if;
 if p_reversal_date is null or length(btrim(coalesce(p_reason,'')))<5 then
  raise exception 'Enter a reversal date and a reason of at least five characters.';
 end if;
 select * into v_bill from public.admin_supplier_bills where id=p_bill_id for update;
 if not found then raise exception 'Supplier bill was not found.'; end if;
 if v_bill.reversal_journal_id is not null then return v_bill.reversal_journal_id; end if;
 if v_bill.accounting_journal_id is null then
  if v_bill.status='draft' then
   perform pg_catalog.set_config('app.finance_operations_sync','on',true);
   update public.admin_supplier_bills set status='void',updated_at=now() where id=p_bill_id;
   return null;
  end if;
  raise exception 'The supplier bill has not been posted to accounting.';
 end if;
 select coalesce(sum(a.allocated_amount),0) into v_allocations
 from public.admin_supplier_payment_allocations a
 join public.admin_supplier_payments p on p.id=a.payment_id
 where a.supplier_bill_id=p_bill_id and p.status='confirmed';
 if v_allocations>0 then
  raise exception 'This bill has confirmed payment allocations. Reverse or reallocate those payments before voiding the bill.';
 end if;
 select coalesce(sum(cn.amount),0) into v_credits
 from public.admin_supplier_credit_notes cn
 where cn.supplier_bill_id=p_bill_id and cn.status='confirmed'
   and cn.accounting_journal_id is not null and cn.reversal_journal_id is null;
 if v_credits>0 then
  raise exception 'This bill has posted supplier credit notes. Reverse those credit notes before reversing the bill.';
 end if;
 select coalesce(sum(ri.quantity_accepted),0) into v_received
 from public.admin_purchase_receipts r
 join public.admin_purchase_receipt_items ri on ri.receipt_id=r.id
 where r.purchase_order_id=v_bill.purchase_order_id and r.status='confirmed';
 if v_received>0 then
  raise exception 'Accepted GRN stock and its landed cost layer exist. Process a supplier return/credit note or correct inventory before reversing this bill.';
 end if;
 select status into v_status from public.admin_finance_journal_entries where id=v_bill.accounting_journal_id;
 if v_status='posted' then
  v_reversal:=public.admin_finance_reverse_journal_entry(v_bill.accounting_journal_id,p_reversal_date,p_reason);
 elsif v_status='reversed' then
  select reversed_by into v_reversal from public.admin_finance_journal_entries where id=v_bill.accounting_journal_id;
 else
  raise exception 'Supplier bill Journal is not Posted or Reversed.';
 end if;
 perform pg_catalog.set_config('app.finance_operations_sync','on',true);
 update public.admin_supplier_bills set status='void',reversal_journal_id=v_reversal,updated_at=now()
 where id=p_bill_id;
 return v_reversal;
end;
$$;
revoke all on function public.admin_finance_reverse_supplier_bill(uuid,date,text) from public,anon;
grant execute on function public.admin_finance_reverse_supplier_bill(uuid,date,text) to authenticated;

create or replace function public.admin_finance_reverse_supplier_payment(
 p_payment_id uuid,p_reversal_date date,p_reason text
)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare
 v_email text:=lower(coalesce((select auth.jwt()->>'email'),''));
 v_aal text:=coalesce((select auth.jwt()->>'aal'),'aal1');
 v_payment public.admin_supplier_payments%rowtype;
 v_status text;
 v_reversal uuid;
begin
 if v_email<>'halalfoodbd.official@gmail.com' or v_aal<>'aal2' or auth.uid() is null then
  raise exception 'Authorized admin account and MFA are required.' using errcode='42501';
 end if;
 if p_reversal_date is null or length(btrim(coalesce(p_reason,'')))<5 then
  raise exception 'Enter a reversal date and a reason of at least five characters.';
 end if;
 select * into v_payment from public.admin_supplier_payments where id=p_payment_id for update;
 if not found then raise exception 'Supplier payment was not found.'; end if;
 if v_payment.reversal_journal_id is not null then return v_payment.reversal_journal_id; end if;
 if v_payment.accounting_journal_id is null then
  if v_payment.status='draft' then
   perform pg_catalog.set_config('app.finance_operations_sync','on',true);
   update public.admin_supplier_payments set status='void',updated_at=now() where id=p_payment_id;
   return null;
  end if;
  raise exception 'The supplier payment has not been posted to accounting.';
 end if;
 select status into v_status from public.admin_finance_journal_entries where id=v_payment.accounting_journal_id;
 if v_status='posted' then
  v_reversal:=public.admin_finance_reverse_journal_entry(v_payment.accounting_journal_id,p_reversal_date,p_reason);
 elsif v_status='reversed' then
  select reversed_by into v_reversal from public.admin_finance_journal_entries where id=v_payment.accounting_journal_id;
 else
  raise exception 'Supplier payment Journal is not Posted or Reversed.';
 end if;
 perform pg_catalog.set_config('app.finance_operations_sync','on',true);
 update public.admin_supplier_payments set status='void',reversal_journal_id=v_reversal,updated_at=now()
 where id=p_payment_id;
 return v_reversal;
end;
$$;
revoke all on function public.admin_finance_reverse_supplier_payment(uuid,date,text) from public,anon;
grant execute on function public.admin_finance_reverse_supplier_payment(uuid,date,text) to authenticated;



create or replace function public.admin_finance_post_supplier_credit_note(p_credit_note_id uuid)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare
 v_email text:=lower(coalesce((select auth.jwt()->>'email'),''));
 v_aal text:=coalesce((select auth.jwt()->>'aal'),'aal1');
 v_note public.admin_supplier_credit_notes%rowtype;
 v_bill public.admin_supplier_bills%rowtype;
 v_paid numeric(14,2);
 v_credited numeric(14,2);
 v_outstanding numeric(14,2);
 v_ap_debit numeric(14,2);
 v_advance_debit numeric(14,2);
 v_journal uuid;
 v_lines jsonb:='[]'::jsonb;
begin
 if v_email<>'halalfoodbd.official@gmail.com' or v_aal<>'aal2' or auth.uid() is null then
  raise exception 'Authorized admin account and MFA are required.' using errcode='42501';
 end if;
 select * into v_note from public.admin_supplier_credit_notes where id=p_credit_note_id for update;
 if not found then raise exception 'Supplier credit note was not found.'; end if;
 if v_note.reversal_journal_id is not null or v_note.status='void' then
  raise exception 'This supplier credit note was voided or reversed and cannot be posted again.';
 end if;
 if v_note.accounting_journal_id is not null then return v_note.accounting_journal_id; end if;
 if v_note.status<>'confirmed' then raise exception 'Only a Confirmed supplier credit note can be posted.'; end if;

 v_outstanding:=0;
 if v_note.supplier_bill_id is not null then
  select * into v_bill from public.admin_supplier_bills
  where id=v_note.supplier_bill_id and supplier_id=v_note.supplier_id for update;
  if not found or v_bill.status<>'confirmed' then
   raise exception 'The linked supplier bill must exist, belong to this supplier and be Confirmed.';
  end if;
  if v_bill.accounting_journal_id is null then
   raise exception 'Post the linked supplier bill to accounting before allocating a supplier credit note.';
  end if;

  select coalesce(sum(a.allocated_amount),0) into v_paid
  from public.admin_supplier_payment_allocations a
  join public.admin_supplier_payments p on p.id=a.payment_id
  where a.supplier_bill_id=v_bill.id and p.status='confirmed'
    and p.accounting_journal_id is not null and p.reversal_journal_id is null;
  select coalesce(sum(cn.amount),0) into v_credited
  from public.admin_supplier_credit_notes cn
  where cn.supplier_bill_id=v_bill.id and cn.status='confirmed'
    and cn.id<>p_credit_note_id and cn.accounting_journal_id is not null and cn.reversal_journal_id is null;
  v_outstanding:=greatest(0,round(v_bill.total_amount-v_paid-v_credited,2));
 end if;

 v_ap_debit:=least(v_note.amount,v_outstanding);
 v_advance_debit:=round(v_note.amount-v_ap_debit,2);
 if v_ap_debit>0 then
  v_lines:=v_lines||jsonb_build_array(jsonb_build_object(
    'account_id',(select id from public.admin_finance_chart_of_accounts where account_code='2010'),
    'description','Supplier credit applied against Accounts Payable · '||v_note.credit_note_number,
    'party_name',v_note.supplier_reference,'debit',v_ap_debit,'credit',0
  ));
 end if;
 if v_advance_debit>0 then
  v_lines:=v_lines||jsonb_build_array(jsonb_build_object(
    'account_id',(select id from public.admin_finance_chart_of_accounts where account_code='1110'),
    'description','Supplier credit balance / advance · '||v_note.credit_note_number,
    'party_name',v_note.supplier_reference,'debit',v_advance_debit,'credit',0
  ));
 end if;
 v_lines:=v_lines||jsonb_build_array(jsonb_build_object(
   'account_id',(select id from public.admin_finance_chart_of_accounts where account_code='5030'),
   'description','Supplier purchase return / allowance · '||v_note.credit_note_number,
   'party_name',v_note.supplier_reference,'debit',0,'credit',v_note.amount
 ));
 v_journal:=public.admin_finance_save_journal_entry(
   null,v_note.credit_date,'Supplier credit note · '||v_note.credit_note_number,
   v_lines,'supplier_credit_note',p_credit_note_id::text,true
 );
 perform pg_catalog.set_config('app.finance_operations_sync','on',true);
 update public.admin_supplier_credit_notes
 set accounting_journal_id=v_journal,updated_at=now()
 where id=p_credit_note_id;
 return v_journal;
end;
$$;
revoke all on function public.admin_finance_post_supplier_credit_note(uuid) from public,anon;
grant execute on function public.admin_finance_post_supplier_credit_note(uuid) to authenticated;

create or replace function public.admin_finance_reverse_supplier_credit_note(
 p_credit_note_id uuid,p_reversal_date date,p_reason text
)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare
 v_email text:=lower(coalesce((select auth.jwt()->>'email'),''));
 v_aal text:=coalesce((select auth.jwt()->>'aal'),'aal1');
 v_note public.admin_supplier_credit_notes%rowtype;
 v_status text;
 v_reversal uuid;
begin
 if v_email<>'halalfoodbd.official@gmail.com' or v_aal<>'aal2' or auth.uid() is null then
  raise exception 'Authorized admin account and MFA are required.' using errcode='42501';
 end if;
 if p_reversal_date is null or length(btrim(coalesce(p_reason,'')))<5 then
  raise exception 'Enter a reversal date and a reason of at least five characters.';
 end if;
 select * into v_note from public.admin_supplier_credit_notes where id=p_credit_note_id for update;
 if not found then raise exception 'Supplier credit note was not found.'; end if;
 if v_note.reversal_journal_id is not null then return v_note.reversal_journal_id; end if;
 if v_note.accounting_journal_id is null then
  if v_note.status='draft' then
   perform pg_catalog.set_config('app.finance_operations_sync','on',true);
   update public.admin_supplier_credit_notes set status='void',updated_at=now() where id=p_credit_note_id;
   return null;
  end if;
  raise exception 'The supplier credit note has not been posted to accounting.';
 end if;
 select status into v_status from public.admin_finance_journal_entries where id=v_note.accounting_journal_id;
 if v_status='posted' then
  v_reversal:=public.admin_finance_reverse_journal_entry(v_note.accounting_journal_id,p_reversal_date,p_reason);
 elsif v_status='reversed' then
  select reversed_by into v_reversal from public.admin_finance_journal_entries where id=v_note.accounting_journal_id;
 else
  raise exception 'Supplier credit note Journal is not Posted or Reversed.';
 end if;
 perform pg_catalog.set_config('app.finance_operations_sync','on',true);
 update public.admin_supplier_credit_notes
 set status='void',reversal_journal_id=v_reversal,updated_at=now()
 where id=p_credit_note_id;
 return v_reversal;
end;
$$;
revoke all on function public.admin_finance_reverse_supplier_credit_note(uuid,date,text) from public,anon;
grant execute on function public.admin_finance_reverse_supplier_credit_note(uuid,date,text) to authenticated;

create or replace function public.admin_finance_post_customer_refund(p_return_request_id uuid,p_refund_account_id uuid)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare
 v_email text:=lower(coalesce((select auth.jwt()->>'email'),''));
 v_aal text:=coalesce((select auth.jwt()->>'aal'),'aal1');
 v_return public.admin_return_requests%rowtype;
 v_order public.orders%rowtype;
 v_finance_account public.admin_finance_accounts%rowtype;
 v_previous_refunds numeric(14,2);
 v_journal uuid;
begin
 if v_email<>'halalfoodbd.official@gmail.com' or v_aal<>'aal2' or auth.uid() is null then
  raise exception 'Authorized admin account and MFA are required.' using errcode='42501';
 end if;
 select * into v_return from public.admin_return_requests where id=p_return_request_id for update;
 if not found then raise exception 'Customer return request was not found.'; end if;
 if v_return.reversal_journal_id is not null or v_return.status='closed' then
  raise exception 'This customer refund was already reversed or closed.';
 end if;
 if v_return.accounting_journal_id is not null then return v_return.accounting_journal_id; end if;
 if v_return.status<>'refunded' or v_return.refund_amount<=0 then
  raise exception 'Only a processed return with a positive, actually refunded amount can be posted.';
 end if;
 if p_refund_account_id is null then
  raise exception 'Choose the Finance cash, bank or wallet account from which the refund was actually paid.';
 end if;
 select * into v_order from public.orders where id=v_return.order_id;
 if not found then raise exception 'Original customer order was not found.'; end if;
 if not exists(select 1 from public.admin_finance_journal_entries
   where source_type='order_sale' and source_key=v_return.order_id::text and status='posted') then
  raise exception 'Recognize the delivered sale before posting its refund.';
 end if;
 select coalesce(sum(rr.refund_amount),0) into v_previous_refunds
 from public.admin_return_requests rr
 where rr.order_id=v_return.order_id and rr.status='refunded'
   and rr.id<>p_return_request_id and rr.accounting_journal_id is not null and rr.reversal_journal_id is null;
 if v_previous_refunds+v_return.refund_amount>v_order.total+0.01 then
  raise exception 'Total refunds against this order cannot exceed the original order total.';
 end if;
 select * into v_finance_account from public.admin_finance_accounts
 where id=p_refund_account_id and is_active;
 if not found or v_finance_account.ledger_account_id is null then
  raise exception 'The refund account must be active and mapped to an Asset account in the General Ledger.';
 end if;
 if current_date<v_finance_account.opening_date then
  raise exception 'Refund date cannot be earlier than the selected Finance account opening date.';
 end if;

 v_journal:=public.admin_finance_save_journal_entry(
  null,current_date,'Customer refund · '||v_return.return_number,
  jsonb_build_array(
   jsonb_build_object('account_id',(select id from public.admin_finance_chart_of_accounts where account_code='4095'),
     'description','Sales return / customer refund · '||v_return.return_number,
     'party_name',v_order.customer_name,'debit',v_return.refund_amount,'credit',0),
   jsonb_build_object('account_id',v_finance_account.ledger_account_id,
     'description','Actual refund paid · '||v_return.return_number,
     'party_name',v_order.customer_name,'debit',0,'credit',v_return.refund_amount)
  ),
  'customer_refund',p_return_request_id::text,true
 );
 perform pg_catalog.set_config('app.finance_operations_sync','on',true);
 update public.admin_return_requests
 set refund_account_id=p_refund_account_id,accounting_journal_id=v_journal,updated_at=now()
 where id=p_return_request_id;
 return v_journal;
end;
$$;
revoke all on function public.admin_finance_post_customer_refund(uuid,uuid) from public,anon;
grant execute on function public.admin_finance_post_customer_refund(uuid,uuid) to authenticated;

create or replace function public.admin_finance_reverse_customer_refund(
 p_return_request_id uuid,p_reversal_date date,p_reason text
)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare
 v_email text:=lower(coalesce((select auth.jwt()->>'email'),''));
 v_aal text:=coalesce((select auth.jwt()->>'aal'),'aal1');
 v_return public.admin_return_requests%rowtype;
 v_status text;
 v_reversal uuid;
begin
 if v_email<>'halalfoodbd.official@gmail.com' or v_aal<>'aal2' or auth.uid() is null then
  raise exception 'Authorized admin account and MFA are required.' using errcode='42501';
 end if;
 if p_reversal_date is null or length(btrim(coalesce(p_reason,'')))<5 then
  raise exception 'Enter a reversal date and a reason of at least five characters.';
 end if;
 select * into v_return from public.admin_return_requests where id=p_return_request_id for update;
 if not found then raise exception 'Customer refund request was not found.'; end if;
 if v_return.reversal_journal_id is not null then return v_return.reversal_journal_id; end if;
 if v_return.accounting_journal_id is null then
  raise exception 'The customer refund has not been posted to accounting.';
 end if;
 select status into v_status from public.admin_finance_journal_entries where id=v_return.accounting_journal_id;
 if v_status='posted' then
  v_reversal:=public.admin_finance_reverse_journal_entry(v_return.accounting_journal_id,p_reversal_date,p_reason);
 elsif v_status='reversed' then
  select reversed_by into v_reversal from public.admin_finance_journal_entries where id=v_return.accounting_journal_id;
 else
  raise exception 'Customer refund Journal is not Posted or Reversed.';
 end if;
 perform pg_catalog.set_config('app.finance_operations_sync','on',true);
 update public.admin_return_requests
 set status='closed',reversal_journal_id=v_reversal,updated_at=now()
 where id=p_return_request_id;
 return v_reversal;
end;
$$;
revoke all on function public.admin_finance_reverse_customer_refund(uuid,date,text) from public,anon;
grant execute on function public.admin_finance_reverse_customer_refund(uuid,date,text) to authenticated;

create or replace function public.admin_finance_post_order_cogs(p_order_id uuid)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare
 v_email text:=lower(coalesce((select auth.jwt()->>'email'),''));
 v_aal text:=coalesce((select auth.jwt()->>'aal'),'aal1');
 v_order public.orders%rowtype;
 v_total numeric(14,2);
 v_line_count bigint;
 v_missing bigint;
 v_journal_id uuid;
 v_existing uuid;
begin
 if v_email<>'halalfoodbd.official@gmail.com' or v_aal<>'aal2' or auth.uid() is null then
  raise exception 'Authorized admin account and MFA are required.' using errcode='42501';
 end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if not found or v_order.status<>'delivered' then raise exception 'COGS can be posted only for a Delivered order.'; end if;
 if not exists(select 1 from public.admin_finance_journal_entries where source_type='order_sale' and source_key=p_order_id::text and status='posted') then
  raise exception 'Recognize the delivered sale before posting its COGS.';
 end if;
 select id into v_existing from public.admin_finance_journal_entries
 where source_type='order_cogs' and source_key=p_order_id::text;
 if v_existing is not null then
  if (select status from public.admin_finance_journal_entries where id=v_existing)='posted' then return v_existing; end if;
  raise exception 'This order COGS journal has already been reversed. Review the inventory correction before reposting.';
 end if;
 select count(*),
        count(*) filter(where oi.product_id is null or coalesce(pc.cost_price,layer.weighted_cost) is null),
        coalesce(sum(oi.quantity*(coalesce(pc.cost_price,layer.weighted_cost,0)+coalesce(pc.packaging_cost,0))),0)
 into v_line_count,v_missing,v_total
 from public.order_items oi
 left join public.admin_product_costs pc on pc.product_id=oi.product_id
 left join lateral (
   select sum(cl.accepted_quantity*cl.landed_unit_cost)/nullif(sum(cl.accepted_quantity),0) as weighted_cost
   from public.admin_inventory_cost_layers cl
   where cl.product_id=oi.product_id
 ) layer on true
 where oi.order_id=p_order_id;
 if v_line_count=0 or v_missing>0 then
  raise exception 'COGS cannot be posted: % order line(s) have no linked product or verified unit cost.',v_missing;
 end if;
 if v_total<=0 then raise exception 'Calculated COGS is zero. Verify product cost records before posting.'; end if;
 v_journal_id:=public.admin_finance_save_journal_entry(
  null,(v_order.ordered_at at time zone 'Asia/Dhaka')::date,
  'Cost of goods sold · '||v_order.order_number,
  jsonb_build_array(
   jsonb_build_object('account_id',(select id from public.admin_finance_chart_of_accounts where account_code='5010'),'description','COGS for delivered order','party_name',v_order.order_number,'debit',v_total,'credit',0),
   jsonb_build_object('account_id',(select id from public.admin_finance_chart_of_accounts where account_code='1200'),'description','Inventory relieved for delivered order','party_name',v_order.order_number,'debit',0,'credit',v_total)
  ),
  'order_cogs',p_order_id::text,true
 );
 return v_journal_id;
end;
$$;
revoke all on function public.admin_finance_post_order_cogs(uuid) from public,anon;
grant execute on function public.admin_finance_post_order_cogs(uuid) to authenticated;

create or replace view public.admin_finance_product_profitability
with (security_invoker=true)
as
with item_rows as (
 select
  coalesce(oi.product_id::text,'name:'||lower(btrim(oi.product_name))) as product_key,
  oi.product_id,
  oi.product_name,
  oi.unit,
  oi.quantity,
  oi.line_total,
  o.subtotal,
  coalesce(o.coupon_discount_amount,0) as coupon_discount_amount,
  pc.cost_price,
  coalesce(pc.packaging_cost,0) as packaging_cost,
  layer.weighted_cost
 from public.order_items oi
 join public.orders o on o.id=oi.order_id
 left join public.admin_product_costs pc on pc.product_id=oi.product_id
 left join lateral (
   select sum(cl.accepted_quantity*cl.landed_unit_cost)/nullif(sum(cl.accepted_quantity),0) as weighted_cost
   from public.admin_inventory_cost_layers cl
   where cl.product_id=oi.product_id
 ) layer on true
 where o.status='delivered'
),
aggregated as (
 select
  product_key,product_id,max(product_name) as product_name,max(unit) as unit,
  sum(quantity)::numeric(14,3) as delivered_quantity,
  sum(line_total)::numeric(14,2) as gross_product_sales,
  sum(case when subtotal>0 then coupon_discount_amount*(line_total/subtotal) else 0 end)::numeric(14,2) as allocated_discount,
  sum(case when coalesce(cost_price,weighted_cost) is not null
      then quantity*(coalesce(cost_price,weighted_cost)+packaging_cost) else 0 end)::numeric(14,2) as known_cogs,
  count(*)::bigint as order_lines,
  count(*) filter(where product_id is null or coalesce(cost_price,weighted_cost) is null)::bigint as missing_cost_lines,
  case when bool_or(cost_price is not null) then 'manual'
       when bool_or(weighted_cost is not null) then 'weighted_average'
       else 'cost_missing' end as cost_method
 from item_rows
 group by product_key,product_id
)
select
 product_key,product_id,product_name,unit,delivered_quantity,order_lines,
 gross_product_sales,allocated_discount,
 (gross_product_sales-allocated_discount)::numeric(14,2) as net_product_sales,
 known_cogs,
 case when missing_cost_lines=0 then known_cogs else null end as verified_cogs,
 case when missing_cost_lines=0 then (gross_product_sales-allocated_discount)-known_cogs else null end as gross_profit,
 case when missing_cost_lines=0 and (gross_product_sales-allocated_discount)>0
   then round(((gross_product_sales-allocated_discount)-known_cogs)/(gross_product_sales-allocated_discount)*100,2)
   else null end as gross_margin_percent,
 missing_cost_lines,cost_method,
 case when missing_cost_lines=0 then 'complete' else 'cost_missing' end as cost_coverage
from aggregated;

revoke all on public.admin_finance_product_profitability from public,anon,authenticated;
grant select on public.admin_finance_product_profitability to authenticated;

comment on table public.admin_inventory_cost_layers is 'Private-trigger-created GRN landed-cost layers. Accessible only to the verified admin through MFA.';
comment on column public.admin_finance_entries.reversal_journal_id is 'Reversal journal for a manual cashbook entry that was previously posted.';
comment on column public.admin_cod_settlements.reversal_journal_id is 'Reversal journal for the reconciled COD remittance.';
comment on column public.admin_cod_settlements.order_sale_reversal_journal_id is 'Reversal journal for recognized sales associated with a voided or corrected COD settlement.';
comment on column public.admin_cod_settlements.order_cogs_reversal_journal_id is 'Reversal journal for COGS associated with a voided or corrected COD settlement.';
comment on column public.admin_supplier_bills.reversal_journal_id is 'Reversal journal for a posted supplier bill.';
comment on column public.admin_supplier_payments.reversal_journal_id is 'Reversal journal for a posted supplier payment.';

comment on column public.admin_supplier_credit_notes.accounting_journal_id is 'General Ledger entry for a confirmed supplier credit note.';
comment on column public.admin_supplier_credit_notes.reversal_journal_id is 'Reversal Journal for a posted supplier credit note.';
comment on column public.admin_return_requests.refund_account_id is 'Finance cash, bank or wallet account from which the actual customer refund was paid.';
comment on column public.admin_return_requests.accounting_journal_id is 'General Ledger journal for a processed customer refund; stock/COGS is not automatically adjusted because the existing return request has no verified item quantities. ';
comment on column public.admin_return_requests.reversal_journal_id is 'Reversal Journal for a posted customer refund.';

comment on column public.admin_finance_accounts.ledger_account_id is 'Required Chart of Accounts Asset mapping. Several bank/wallet subaccounts may share one GL control account.';
comment on column public.admin_finance_accounts.opening_balance_journal_id is 'Journal created only after the owner verifies the real opening balance and chooses an equity/liability offset.';
comment on column public.admin_finance_entries.accounting_journal_id is 'Canonical Journal linked to this operational cashbook record; source-linked COD and supplier records are posted through their own workflow.';
comment on column public.admin_cod_settlements.accounting_journal_id is 'Journal for the verified cash remittance and courier fee; COD sale revenue is recognized separately from Courier Clearing.';
comment on view public.admin_finance_product_profitability is 'Delivered product sales and margin using verified admin_product_costs. Gross profit is withheld when any item cost is missing.';
