-- Supplier & Procurement Management v1
-- Additive schema: preserves existing supplier, purchase and inventory data.
create sequence if not exists public.admin_supplier_code_seq;
create sequence if not exists public.admin_supplier_receipt_number_seq;
create sequence if not exists public.admin_supplier_bill_number_seq;
create sequence if not exists public.admin_supplier_payment_number_seq;
create sequence if not exists public.admin_supplier_credit_note_number_seq;

alter table public.admin_suppliers
 add column if not exists supplier_code text,
 add column if not exists whatsapp text not null default '',
 add column if not exists supplier_type text not null default 'wholesaler',
 add column if not exists district text not null default '',
 add column if not exists city text not null default '',
 add column if not exists postal_code text not null default '',
 add column if not exists product_categories text[] not null default '{}',
 add column if not exists payment_terms_days smallint not null default 0,
 add column if not exists preferred_payment_method text not null default 'cash',
 add column if not exists tax_id text not null default '',
 add column if not exists bank_name text not null default '',
 add column if not exists bank_account_name text not null default '',
 add column if not exists bank_account_number text not null default '';

update public.admin_suppliers
set supplier_code='SUP-'||lpad(nextval('public.admin_supplier_code_seq')::text,5,'0')
where supplier_code is null or btrim(supplier_code)='';
alter table public.admin_suppliers
 alter column supplier_code set default ('SUP-'||lpad(nextval('public.admin_supplier_code_seq')::text,5,'0')),
 alter column supplier_code set not null;
create unique index if not exists admin_suppliers_supplier_code_uidx on public.admin_suppliers(supplier_code);

do $$
begin
 if not exists(select 1 from pg_constraint where conname='admin_suppliers_supplier_type_check') then
  alter table public.admin_suppliers add constraint admin_suppliers_supplier_type_check
   check(supplier_type in ('manufacturer','distributor','wholesaler','retailer','farmer','other'));
 end if;
 if not exists(select 1 from pg_constraint where conname='admin_suppliers_payment_terms_days_check') then
  alter table public.admin_suppliers add constraint admin_suppliers_payment_terms_days_check
   check(payment_terms_days between 0 and 365);
 end if;
 if not exists(select 1 from pg_constraint where conname='admin_suppliers_preferred_payment_method_check') then
  alter table public.admin_suppliers add constraint admin_suppliers_preferred_payment_method_check
   check(preferred_payment_method in ('cash','bank_transfer','bkash','nagad','rocket','cheque','other'));
 end if;
end $$;

alter table public.admin_purchase_orders
 add column if not exists subtotal numeric(12,2) not null default 0 check(subtotal>=0),
 add column if not exists discount_amount numeric(12,2) not null default 0 check(discount_amount>=0),
 add column if not exists transport_cost numeric(12,2) not null default 0 check(transport_cost>=0),
 add column if not exists handling_cost numeric(12,2) not null default 0 check(handling_cost>=0),
 add column if not exists tax_amount numeric(12,2) not null default 0 check(tax_amount>=0),
 add column if not exists other_charges numeric(12,2) not null default 0 check(other_charges>=0),
 add column if not exists currency text not null default 'BDT',
 add column if not exists approved_by text not null default '',
 add column if not exists approved_at timestamptz;

alter table public.admin_purchase_order_items
 add column if not exists sku_snapshot text not null default '',
 add column if not exists unit text not null default 'piece',
 add column if not exists discount_amount numeric(12,2) not null default 0 check(discount_amount>=0),
 add column if not exists is_catalog_item boolean not null default true,
 add column if not exists item_notes text not null default '';

create table if not exists public.admin_purchase_receipts(
 id uuid primary key default gen_random_uuid(),
 receipt_number text not null unique default ('GRN-'||lpad(nextval('public.admin_supplier_receipt_number_seq')::text,6,'0')),
 idempotency_key uuid not null unique,
 purchase_order_id uuid not null references public.admin_purchase_orders(id) on delete restrict,
 supplier_id uuid not null references public.admin_suppliers(id) on delete restrict,
 receipt_date date not null default current_date,
 challan_number text not null default '',
 received_by text not null default lower(coalesce(auth.jwt()->>'email','')),
 status text not null default 'confirmed' check(status in ('confirmed','void')),
 notes text not null default '',
 created_by text not null default lower(coalesce(auth.jwt()->>'email','')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.admin_purchase_receipt_items(
 id uuid primary key default gen_random_uuid(),
 receipt_id uuid not null references public.admin_purchase_receipts(id) on delete restrict,
 purchase_order_item_id uuid not null references public.admin_purchase_order_items(id) on delete restrict,
 product_id uuid references public.products(id) on delete set null,
 product_name_snapshot text not null,
 sku_snapshot text not null default '',
 unit text not null default 'piece',
 quantity_received numeric(12,3) not null check(quantity_received>0),
 quantity_accepted numeric(12,3) not null check(quantity_accepted>=0),
 quantity_rejected numeric(12,3) not null default 0 check(quantity_rejected>=0),
 rejection_reason text not null default '',
 created_at timestamptz not null default now(),
 check(quantity_accepted+quantity_rejected=quantity_received)
);

create table if not exists public.admin_supplier_bills(
 id uuid primary key default gen_random_uuid(),
 bill_number text not null unique default ('BILL-'||lpad(nextval('public.admin_supplier_bill_number_seq')::text,6,'0')),
 supplier_id uuid not null references public.admin_suppliers(id) on delete restrict,
 purchase_order_id uuid references public.admin_purchase_orders(id) on delete set null,
 supplier_invoice_number text not null default '',
 invoice_date date not null default current_date,
 due_date date not null default current_date,
 subtotal numeric(12,2) not null default 0 check(subtotal>=0),
 discount_amount numeric(12,2) not null default 0 check(discount_amount>=0),
 additional_charges numeric(12,2) not null default 0 check(additional_charges>=0),
 tax_amount numeric(12,2) not null default 0 check(tax_amount>=0),
 total_amount numeric(12,2) not null check(total_amount>0),
 status text not null default 'draft' check(status in ('draft','confirmed','void')),
 attachment_path text not null default '',
 notes text not null default '',
 created_by text not null default lower(coalesce(auth.jwt()->>'email','')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(due_date>=invoice_date)
);
create unique index if not exists admin_supplier_bills_supplier_invoice_uidx
 on public.admin_supplier_bills(supplier_id,supplier_invoice_number)
 where nullif(btrim(supplier_invoice_number),'') is not null;
create index if not exists admin_supplier_bills_due_status_idx on public.admin_supplier_bills(status,due_date);
create index if not exists admin_supplier_bills_supplier_date_idx on public.admin_supplier_bills(supplier_id,invoice_date desc);

create table if not exists public.admin_supplier_payments(
 id uuid primary key default gen_random_uuid(),
 payment_number text not null unique default ('PAY-'||lpad(nextval('public.admin_supplier_payment_number_seq')::text,6,'0')),
 idempotency_key uuid not null unique,
 supplier_id uuid not null references public.admin_suppliers(id) on delete restrict,
 payment_date date not null default current_date,
 amount numeric(12,2) not null check(amount>0),
 payment_method text not null check(payment_method in ('cash','bank_transfer','bkash','nagad','rocket','cheque','other')),
 paid_from_account text not null default '',
 transaction_reference text not null default '',
 receipt_path text not null default '',
 status text not null default 'confirmed' check(status in ('draft','confirmed','void')),
 notes text not null default '',
 created_by text not null default lower(coalesce(auth.jwt()->>'email','')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists admin_supplier_payments_supplier_date_idx on public.admin_supplier_payments(supplier_id,payment_date desc);
create index if not exists admin_supplier_payments_status_date_idx on public.admin_supplier_payments(status,payment_date desc);

create table if not exists public.admin_supplier_payment_allocations(
 id uuid primary key default gen_random_uuid(),
 payment_id uuid not null references public.admin_supplier_payments(id) on delete restrict,
 supplier_bill_id uuid not null references public.admin_supplier_bills(id) on delete restrict,
 allocated_amount numeric(12,2) not null check(allocated_amount>0),
 created_at timestamptz not null default now(),
 unique(payment_id,supplier_bill_id)
);
create index if not exists admin_supplier_payment_allocations_bill_idx on public.admin_supplier_payment_allocations(supplier_bill_id);

create table if not exists public.admin_supplier_credit_notes(
 id uuid primary key default gen_random_uuid(),
 credit_note_number text not null unique default ('SCN-'||lpad(nextval('public.admin_supplier_credit_note_number_seq')::text,6,'0')),
 supplier_id uuid not null references public.admin_suppliers(id) on delete restrict,
 supplier_bill_id uuid references public.admin_supplier_bills(id) on delete set null,
 purchase_order_id uuid references public.admin_purchase_orders(id) on delete set null,
 credit_date date not null default current_date,
 amount numeric(12,2) not null check(amount>0),
 reason text not null check(length(trim(reason)) between 2 and 500),
 supplier_reference text not null default '',
 status text not null default 'draft' check(status in ('draft','confirmed','void')),
 notes text not null default '',
 created_by text not null default lower(coalesce(auth.jwt()->>'email','')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.admin_supplier_ledger_adjustments(
 id uuid primary key default gen_random_uuid(),
 supplier_id uuid not null references public.admin_suppliers(id) on delete restrict,
 adjustment_date date not null default current_date,
 entry_type text not null check(entry_type in ('opening_balance','debit_adjustment','credit_adjustment')),
 amount_delta numeric(12,2) not null check(amount_delta<>0),
 reference text not null default '',
 reason text not null check(length(trim(reason)) between 2 and 500),
 status text not null default 'confirmed' check(status in ('confirmed','void')),
 created_by text not null default lower(coalesce(auth.jwt()->>'email','')),
 created_at timestamptz not null default now()
);
create index if not exists admin_supplier_ledger_adjustments_supplier_date_idx
 on public.admin_supplier_ledger_adjustments(supplier_id,adjustment_date desc);

alter table public.admin_finance_entries
 add column if not exists related_supplier_payment_id uuid references public.admin_supplier_payments(id) on delete restrict;
create unique index if not exists admin_finance_entries_supplier_payment_uidx
 on public.admin_finance_entries(related_supplier_payment_id)
 where related_supplier_payment_id is not null;

do $$
declare t text;
begin
 foreach t in array array[
  'admin_purchase_receipts','admin_purchase_receipt_items','admin_supplier_bills',
  'admin_supplier_payments','admin_supplier_payment_allocations','admin_supplier_credit_notes',
  'admin_supplier_ledger_adjustments'
 ] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('drop policy if exists "Admin supplier module access with MFA" on public.%I',t);
  execute format(
   'create policy "Admin supplier module access with MFA" on public.%I for all to authenticated using (lower(coalesce((select auth.jwt()->>''email''),''''))=''halalfoodbd.official@gmail.com'' and coalesce((select auth.jwt()->>''aal''),''aal1'')=''aal2'') with check (lower(coalesce((select auth.jwt()->>''email''),''''))=''halalfoodbd.official@gmail.com'' and coalesce((select auth.jwt()->>''aal''),''aal1'')=''aal2'')',
   t
  );
 end loop;
end $$;

grant select,insert,update on public.admin_suppliers to authenticated;
grant select,insert,update on public.admin_purchase_orders to authenticated;
grant select,insert,update on public.admin_purchase_order_items to authenticated;
revoke all on table public.admin_purchase_receipts,public.admin_purchase_receipt_items,public.admin_supplier_bills,
 public.admin_supplier_payments,public.admin_supplier_payment_allocations,public.admin_supplier_credit_notes,
 public.admin_supplier_ledger_adjustments from public,anon,authenticated;
grant select,insert on public.admin_purchase_receipts,public.admin_purchase_receipt_items to authenticated;
grant select,insert,update on public.admin_supplier_bills,public.admin_supplier_payments,public.admin_supplier_credit_notes to authenticated;
grant select,insert on public.admin_supplier_payment_allocations to authenticated;
grant select,insert,update on public.admin_supplier_ledger_adjustments to authenticated;
grant usage,select on sequence public.admin_supplier_code_seq,public.admin_supplier_receipt_number_seq,
 public.admin_supplier_bill_number_seq,public.admin_supplier_payment_number_seq,public.admin_supplier_credit_note_number_seq to authenticated;

create or replace function public.create_supplier_with_opening_balance(
 p_supplier jsonb,p_opening_balance numeric default 0,p_opening_balance_date date default current_date,p_opening_balance_note text default ''
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_supplier_id uuid;v_supplier_code text;v_name text;
begin
 if lower(coalesce((select auth.jwt()->>'email'),''))<>'halalfoodbd.official@gmail.com' or coalesce((select auth.jwt()->>'aal'),'aal1')<>'aal2' then
  raise exception 'Admin MFA verification is required.' using errcode='42501';
 end if;
 v_name:=btrim(coalesce(p_supplier->>'name',''));
 if length(v_name)<2 or length(v_name)>180 then raise exception 'Enter a supplier name between 2 and 180 characters.';end if;
 if coalesce(p_opening_balance,0)<0 then raise exception 'Opening balance cannot be negative.';end if;
 insert into public.admin_suppliers(name,contact_name,phone,email,address,notes,whatsapp,supplier_type,district,city,postal_code,
  product_categories,payment_terms_days,preferred_payment_method,tax_id,bank_name,bank_account_name,bank_account_number,created_by)
 values(v_name,left(btrim(coalesce(p_supplier->>'contact_name','')),180),left(btrim(coalesce(p_supplier->>'phone','')),60),
  left(btrim(coalesce(p_supplier->>'email','')),180),left(btrim(coalesce(p_supplier->>'address','')),500),
  left(btrim(coalesce(p_supplier->>'notes','')),1200),left(btrim(coalesce(p_supplier->>'whatsapp','')),60),
  coalesce(nullif(p_supplier->>'supplier_type',''),'wholesaler'),left(btrim(coalesce(p_supplier->>'district','')),120),
  left(btrim(coalesce(p_supplier->>'city','')),120),left(btrim(coalesce(p_supplier->>'postal_code','')),30),
  array(select jsonb_array_elements_text(coalesce(p_supplier->'product_categories','[]'::jsonb))),
  greatest(0,least(365,coalesce(nullif(p_supplier->>'payment_terms_days','')::smallint,0))),
  coalesce(nullif(p_supplier->>'preferred_payment_method',''),'cash'),left(btrim(coalesce(p_supplier->>'tax_id','')),100),
  left(btrim(coalesce(p_supplier->>'bank_name','')),180),left(btrim(coalesce(p_supplier->>'bank_account_name','')),180),
  left(btrim(coalesce(p_supplier->>'bank_account_number','')),180),lower(coalesce((select auth.jwt()->>'email'),'')))
 returning id,supplier_code into v_supplier_id,v_supplier_code;
 if coalesce(p_opening_balance,0)>0 then
  insert into public.admin_supplier_ledger_adjustments(supplier_id,adjustment_date,entry_type,amount_delta,reference,reason,created_by)
  values(v_supplier_id,coalesce(p_opening_balance_date,current_date),'opening_balance',p_opening_balance,
   'OPENING-'||v_supplier_code,coalesce(nullif(btrim(p_opening_balance_note),''),'Opening payable balance at system setup'),
   lower(coalesce((select auth.jwt()->>'email'),'')));
 end if;
 return jsonb_build_object('id',v_supplier_id,'supplier_code',v_supplier_code,'name',v_name);
end $$;

create or replace function public.create_supplier_purchase_order(
 p_supplier_id uuid,p_order_date date,p_expected_date date,p_status text,p_reference text,p_notes text,
 p_discount_amount numeric,p_transport_cost numeric,p_handling_cost numeric,p_tax_amount numeric,p_other_charges numeric,p_items jsonb
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 v_order_id uuid;v_purchase_number text;v_item jsonb;v_product_id uuid;v_product_name text;v_sku text;v_unit text;
 v_quantity numeric;v_unit_cost numeric;v_item_discount numeric;v_subtotal numeric:=0;v_item_discounts numeric:=0;
 v_total numeric:=0;v_transport numeric:=coalesce(p_transport_cost,0);v_handling numeric:=coalesce(p_handling_cost,0);
 v_tax numeric:=coalesce(p_tax_amount,0);v_other numeric:=coalesce(p_other_charges,0);v_discount numeric:=coalesce(p_discount_amount,0);
 v_status text:=coalesce(p_status,'draft');v_is_catalog boolean;
begin
 if lower(coalesce((select auth.jwt()->>'email'),''))<>'halalfoodbd.official@gmail.com' or coalesce((select auth.jwt()->>'aal'),'aal1')<>'aal2' then
  raise exception 'Admin MFA verification is required.' using errcode='42501';
 end if;
 if p_supplier_id is null or not exists(select 1 from public.admin_suppliers where id=p_supplier_id and is_active=true) then
  raise exception 'Choose an active supplier.';
 end if;
 if p_expected_date is not null and p_expected_date<p_order_date then raise exception 'Expected delivery date cannot be before the purchase date.';end if;
 if v_status not in('draft','ordered') then raise exception 'New purchase orders can only start as draft or ordered.';end if;
 if jsonb_typeof(coalesce(p_items,'null'::jsonb))<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Add at least one purchase item.';end if;
 if least(v_transport,v_handling,v_tax,v_other,v_discount)<0 then raise exception 'Purchase costs and discounts cannot be negative.';end if;
 insert into public.admin_purchase_orders(supplier_id,status,order_date,expected_date,total_amount,reference,notes,subtotal,
  discount_amount,transport_cost,handling_cost,tax_amount,other_charges,currency,created_by)
 values(p_supplier_id,v_status,coalesce(p_order_date,current_date),p_expected_date,0,left(btrim(coalesce(p_reference,'')),180),
  left(btrim(coalesce(p_notes,'')),1200),0,v_discount,v_transport,v_handling,v_tax,v_other,'BDT',
  lower(coalesce((select auth.jwt()->>'email'),'')))
 returning id,purchase_number into v_order_id,v_purchase_number;
 for v_item in select value from jsonb_array_elements(p_items) as x(value) loop
  v_product_id:=nullif(v_item->>'product_id','')::uuid;
  v_quantity:=nullif(v_item->>'quantity','')::numeric;
  v_unit_cost:=nullif(v_item->>'unit_cost','')::numeric;
  v_item_discount:=coalesce(nullif(v_item->>'discount_amount','')::numeric,0);
  if v_quantity is null or v_quantity<=0 or v_quantity>1000000 then raise exception 'Each item quantity must be greater than zero.';end if;
  if v_unit_cost is null or v_unit_cost<0 or v_unit_cost>100000000 then raise exception 'Each item needs a valid unit cost.';end if;
  if v_item_discount<0 or v_item_discount>(v_quantity*v_unit_cost) then raise exception 'An item discount cannot exceed that item gross value.';end if;
  v_is_catalog:=v_product_id is not null;
  if v_is_catalog then
   select name,coalesce(sku,''),coalesce(unit_type,'piece') into v_product_name,v_sku,v_unit from public.products where id=v_product_id;
   if not found then raise exception 'A selected catalogue product no longer exists. Refresh and try again.';end if;
  else
   v_product_name:=btrim(coalesce(v_item->>'product_name',''));v_sku:=left(btrim(coalesce(v_item->>'sku_snapshot','')),100);
   v_unit:=coalesce(nullif(v_item->>'unit',''),'piece');
   if length(v_product_name)<2 then raise exception 'A non-catalogue item needs a product name.';end if;
  end if;
  v_subtotal:=v_subtotal+round(v_quantity*v_unit_cost,2);v_item_discounts:=v_item_discounts+v_item_discount;
  insert into public.admin_purchase_order_items(purchase_order_id,product_id,product_name,quantity,received_quantity,
   unit_cost,line_total,sku_snapshot,unit,discount_amount,is_catalog_item,item_notes)
  values(v_order_id,v_product_id,v_product_name,v_quantity,0,v_unit_cost,round(v_quantity*v_unit_cost-v_item_discount,2),
   v_sku,v_unit,v_item_discount,v_is_catalog,left(btrim(coalesce(v_item->>'item_notes','')),500));
 end loop;
 if v_discount+v_item_discounts>v_subtotal then raise exception 'Total discounts cannot exceed the purchase subtotal.';end if;
 v_total:=round(v_subtotal-v_item_discounts-v_discount+v_transport+v_handling+v_tax+v_other,2);
 if v_total<0 then raise exception 'Purchase total cannot be negative.';end if;
 update public.admin_purchase_orders set subtotal=v_subtotal,total_amount=v_total where id=v_order_id;
 return jsonb_build_object('id',v_order_id,'purchase_number',v_purchase_number,'subtotal',v_subtotal,
  'item_discount',v_item_discounts,'discount_amount',v_discount,'total_amount',v_total);
end $$;

create or replace function public.record_supplier_purchase_receipt(
 p_purchase_order_id uuid,p_receipt_date date,p_challan_number text,p_received_by text,p_notes text,p_idempotency_key uuid,p_items jsonb
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 v_existing_id uuid;v_receipt_id uuid;v_receipt_number text;v_supplier_id uuid;v_po_status text;v_item jsonb;
 v_po_item_id uuid;v_product_id uuid;v_product_name text;v_sku text;v_unit text;v_ordered numeric;v_already_received numeric;
 v_received numeric;v_rejected numeric;v_accepted numeric;v_stock_before numeric;v_stock_after numeric;v_all_received boolean;v_any_received boolean;
begin
 if lower(coalesce((select auth.jwt()->>'email'),''))<>'halalfoodbd.official@gmail.com' or coalesce((select auth.jwt()->>'aal'),'aal1')<>'aal2' then
  raise exception 'Admin MFA verification is required.' using errcode='42501';
 end if;
 if p_idempotency_key is null then raise exception 'A receipt request key is required.';end if;
 select id,receipt_number into v_existing_id,v_receipt_number from public.admin_purchase_receipts where idempotency_key=p_idempotency_key;
 if found then return jsonb_build_object('id',v_existing_id,'receipt_number',v_receipt_number,'duplicate',true);end if;
 select supplier_id,status into v_supplier_id,v_po_status from public.admin_purchase_orders where id=p_purchase_order_id for update;
 if not found then raise exception 'Purchase order not found.';end if;
 if v_po_status in('cancelled','received') then raise exception 'This purchase order cannot receive more stock.';end if;
 if jsonb_typeof(coalesce(p_items,'null'::jsonb))<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Add at least one received purchase item.';end if;
 insert into public.admin_purchase_receipts(idempotency_key,purchase_order_id,supplier_id,receipt_date,challan_number,received_by,notes,created_by)
 values(p_idempotency_key,p_purchase_order_id,v_supplier_id,coalesce(p_receipt_date,current_date),
  left(btrim(coalesce(p_challan_number,'')),180),left(btrim(coalesce(p_received_by,'')),180),
  left(btrim(coalesce(p_notes,'')),1200),lower(coalesce((select auth.jwt()->>'email'),'')))
 returning id,receipt_number into v_receipt_id,v_receipt_number;
 for v_item in select value from jsonb_array_elements(p_items) as x(value) loop
  v_po_item_id:=nullif(v_item->>'purchase_order_item_id','')::uuid;
  v_received:=nullif(v_item->>'quantity_received','')::numeric;v_rejected:=coalesce(nullif(v_item->>'quantity_rejected','')::numeric,0);
  if v_po_item_id is null or v_received is null or v_received<=0 or v_rejected<0 or v_rejected>v_received then
   raise exception 'Each receipt line needs a valid received quantity and rejected quantity.';
  end if;
  select product_id,product_name,sku_snapshot,unit,quantity,received_quantity
  into v_product_id,v_product_name,v_sku,v_unit,v_ordered,v_already_received
  from public.admin_purchase_order_items where id=v_po_item_id and purchase_order_id=p_purchase_order_id for update;
  if not found then raise exception 'A receipt item does not belong to the selected purchase order.';end if;
  if v_received>v_ordered-v_already_received then raise exception 'Received quantity exceeds the remaining ordered quantity for %.',v_product_name;end if;
  v_accepted:=v_received-v_rejected;
  insert into public.admin_purchase_receipt_items(receipt_id,purchase_order_item_id,product_id,product_name_snapshot,sku_snapshot,unit,
   quantity_received,quantity_accepted,quantity_rejected,rejection_reason)
  values(v_receipt_id,v_po_item_id,v_product_id,v_product_name,coalesce(v_sku,''),coalesce(v_unit,'piece'),
   v_received,v_accepted,v_rejected,left(btrim(coalesce(v_item->>'rejection_reason','')),500));
  update public.admin_purchase_order_items set received_quantity=received_quantity+v_received where id=v_po_item_id;
  if v_product_id is not null and v_accepted>0 then
   select coalesce(stock_quantity,0) into v_stock_before from public.products where id=v_product_id for update;
   if not found then raise exception 'A catalogue product was removed before receiving. Refresh the purchase order.';end if;
   v_stock_after:=v_stock_before+v_accepted;
   perform pg_catalog.set_config('app.inventory_system_update','on',true);
   update public.products set stock_quantity=v_stock_after,updated_at=now() where id=v_product_id;
   insert into public.inventory_movements(product_id,movement_type,quantity_delta,stock_before,stock_after,reason,created_by)
   values(v_product_id,'receipt',v_accepted,v_stock_before,v_stock_after,'Supplier GRN '||v_receipt_number,
    lower(coalesce((select auth.jwt()->>'email'),'')));
  end if;
 end loop;
 select bool_and(received_quantity>=quantity),bool_or(received_quantity>0) into v_all_received,v_any_received
 from public.admin_purchase_order_items where purchase_order_id=p_purchase_order_id;
 update public.admin_purchase_orders set status=case when coalesce(v_all_received,false) then 'received'
  when coalesce(v_any_received,false) then 'partially_received' else status end where id=p_purchase_order_id;
 return jsonb_build_object('id',v_receipt_id,'receipt_number',v_receipt_number,'duplicate',false);
end $$;

create or replace function public.create_supplier_bill(
 p_supplier_id uuid,p_purchase_order_id uuid,p_supplier_invoice_number text,p_invoice_date date,p_due_date date,
 p_subtotal numeric,p_discount_amount numeric,p_additional_charges numeric,p_tax_amount numeric,p_total_amount numeric,
 p_attachment_path text,p_notes text,p_status text default 'confirmed'
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_id uuid;v_number text;v_calculated numeric;
begin
 if lower(coalesce((select auth.jwt()->>'email'),''))<>'halalfoodbd.official@gmail.com' or coalesce((select auth.jwt()->>'aal'),'aal1')<>'aal2' then
  raise exception 'Admin MFA verification is required.' using errcode='42501';
 end if;
 if not exists(select 1 from public.admin_suppliers where id=p_supplier_id) then raise exception 'Choose a supplier.';end if;
 if p_purchase_order_id is not null and not exists(select 1 from public.admin_purchase_orders where id=p_purchase_order_id and supplier_id=p_supplier_id) then
  raise exception 'The selected purchase order does not belong to this supplier.';
 end if;
 if coalesce(p_status,'confirmed') not in('draft','confirmed') then raise exception 'A new supplier bill must be draft or confirmed.';end if;
 if coalesce(p_subtotal,0)<0 or coalesce(p_discount_amount,0)<0 or coalesce(p_additional_charges,0)<0 or coalesce(p_tax_amount,0)<0 then
  raise exception 'Bill amounts cannot be negative.';
 end if;
 if p_due_date<p_invoice_date then raise exception 'Due date cannot be earlier than invoice date.';end if;
 v_calculated:=round(coalesce(p_subtotal,0)-coalesce(p_discount_amount,0)+coalesce(p_additional_charges,0)+coalesce(p_tax_amount,0),2);
 if p_total_amount is null or p_total_amount<=0 or abs(v_calculated-p_total_amount)>0.01 then
  raise exception 'Supplier bill total does not match its subtotal, discount, charges and tax.';
 end if;
 insert into public.admin_supplier_bills(supplier_id,purchase_order_id,supplier_invoice_number,invoice_date,due_date,subtotal,
  discount_amount,additional_charges,tax_amount,total_amount,attachment_path,notes,status,created_by)
 values(p_supplier_id,p_purchase_order_id,left(btrim(coalesce(p_supplier_invoice_number,'')),180),p_invoice_date,p_due_date,
  p_subtotal,p_discount_amount,p_additional_charges,p_tax_amount,p_total_amount,left(btrim(coalesce(p_attachment_path,'')),500),
  left(btrim(coalesce(p_notes,'')),1200),coalesce(p_status,'confirmed'),lower(coalesce((select auth.jwt()->>'email'),'')))
 returning id,bill_number into v_id,v_number;
 return jsonb_build_object('id',v_id,'bill_number',v_number,'total_amount',p_total_amount);
end $$;

create or replace function public.record_supplier_payment(
 p_supplier_id uuid,p_payment_date date,p_amount numeric,p_payment_method text,p_paid_from_account text,p_transaction_reference text,
 p_receipt_path text,p_notes text,p_idempotency_key uuid,p_allocations jsonb
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 v_existing_id uuid;v_payment_id uuid;v_payment_number text;v_bill_id uuid;v_allocation numeric;v_existing_paid numeric;
 v_credit_total numeric;v_bill_total numeric;v_bill_supplier uuid;v_bill_status text;v_due numeric;v_allocated numeric:=0;v_item jsonb;
begin
 if lower(coalesce((select auth.jwt()->>'email'),''))<>'halalfoodbd.official@gmail.com' or coalesce((select auth.jwt()->>'aal'),'aal1')<>'aal2' then
  raise exception 'Admin MFA verification is required.' using errcode='42501';
 end if;
 if p_idempotency_key is null then raise exception 'A payment request key is required.';end if;
 select id,payment_number into v_existing_id,v_payment_number from public.admin_supplier_payments where idempotency_key=p_idempotency_key;
 if found then return jsonb_build_object('id',v_existing_id,'payment_number',v_payment_number,'duplicate',true);end if;
 if not exists(select 1 from public.admin_suppliers where id=p_supplier_id) then raise exception 'Choose a supplier.';end if;
 if p_amount is null or p_amount<=0 then raise exception 'Payment amount must be greater than zero.';end if;
 if p_payment_method not in('cash','bank_transfer','bkash','nagad','rocket','cheque','other') then raise exception 'Choose a valid payment channel.';end if;
 if p_payment_method<>'cash' and length(btrim(coalesce(p_transaction_reference,'')))<2 then
  raise exception 'Enter the transaction or cheque reference for non-cash payments.';
 end if;
 if jsonb_typeof(coalesce(p_allocations,'[]'::jsonb))<>'array' then raise exception 'Payment allocation data is invalid.';end if;
 insert into public.admin_supplier_payments(idempotency_key,supplier_id,payment_date,amount,payment_method,paid_from_account,
  transaction_reference,receipt_path,status,notes,created_by)
 values(p_idempotency_key,p_supplier_id,coalesce(p_payment_date,current_date),p_amount,p_payment_method,
  left(btrim(coalesce(p_paid_from_account,'')),180),left(btrim(coalesce(p_transaction_reference,'')),180),
  left(btrim(coalesce(p_receipt_path,'')),500),'confirmed',left(btrim(coalesce(p_notes,'')),1200),
  lower(coalesce((select auth.jwt()->>'email'),'')))
 returning id,payment_number into v_payment_id,v_payment_number;
 for v_item in select value from jsonb_array_elements(coalesce(p_allocations,'[]'::jsonb)) as x(value) loop
  v_bill_id:=nullif(v_item->>'supplier_bill_id','')::uuid;v_allocation:=nullif(v_item->>'allocated_amount','')::numeric;
  if v_bill_id is null or v_allocation is null or v_allocation<=0 then raise exception 'Every payment allocation needs a bill and a positive amount.';end if;
  select supplier_id,status,total_amount into v_bill_supplier,v_bill_status,v_bill_total
  from public.admin_supplier_bills where id=v_bill_id for update;
  if not found or v_bill_supplier<>p_supplier_id or v_bill_status<>'confirmed' then
   raise exception 'A payment can only be allocated to a confirmed bill for the selected supplier.';
  end if;
  select coalesce(sum(a.allocated_amount),0) into v_existing_paid
  from public.admin_supplier_payment_allocations a join public.admin_supplier_payments p on p.id=a.payment_id
  where a.supplier_bill_id=v_bill_id and p.status='confirmed';
  select coalesce(sum(c.amount),0) into v_credit_total from public.admin_supplier_credit_notes c
  where c.supplier_bill_id=v_bill_id and c.status='confirmed';
  v_due:=greatest(0,v_bill_total-v_existing_paid-v_credit_total);
  if v_allocation>v_due then raise exception 'Payment allocation exceeds the remaining due on bill %.',v_bill_id;end if;
  insert into public.admin_supplier_payment_allocations(payment_id,supplier_bill_id,allocated_amount) values(v_payment_id,v_bill_id,v_allocation);
  v_allocated:=v_allocated+v_allocation;
 end loop;
 if v_allocated>p_amount then raise exception 'Allocated amount cannot exceed the payment amount.';end if;
 return jsonb_build_object('id',v_payment_id,'payment_number',v_payment_number,'amount',p_amount,
  'allocated_amount',v_allocated,'supplier_advance',round(p_amount-v_allocated,2),'duplicate',false);
end $$;

create or replace function public.sync_supplier_payment_finance_entry()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_supplier_name text;
begin
 select name into v_supplier_name from public.admin_suppliers where id=new.supplier_id;
 insert into public.admin_finance_entries(entry_type,category,amount,entry_date,description,reference,status,related_supplier_payment_id,created_by)
 values('expense','Supplier payment',new.amount,new.payment_date,'Payment to '||coalesce(v_supplier_name,'supplier')||' · '||new.payment_number,
  new.payment_number,case when new.status='void' then 'void' else new.status end,new.id,lower(coalesce(new.created_by,'')))
 on conflict(related_supplier_payment_id) where related_supplier_payment_id is not null
 do update set amount=excluded.amount,entry_date=excluded.entry_date,description=excluded.description,
  reference=excluded.reference,status=excluded.status,updated_at=now();
 return new;
end $$;

revoke all on function public.sync_supplier_payment_finance_entry() from public,anon,authenticated;
drop trigger if exists admin_supplier_payment_sync_finance on public.admin_supplier_payments;
create trigger admin_supplier_payment_sync_finance after insert or update of status,amount,payment_date
on public.admin_supplier_payments for each row execute function public.sync_supplier_payment_finance_entry();

revoke all on function public.create_supplier_with_opening_balance(jsonb,numeric,date,text) from public,anon,authenticated;
revoke all on function public.create_supplier_purchase_order(uuid,date,date,text,text,text,numeric,numeric,numeric,numeric,numeric,jsonb) from public,anon,authenticated;
revoke all on function public.record_supplier_purchase_receipt(uuid,date,text,text,text,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.create_supplier_bill(uuid,uuid,text,date,date,numeric,numeric,numeric,numeric,numeric,text,text,text) from public,anon,authenticated;
revoke all on function public.record_supplier_payment(uuid,date,numeric,text,text,text,text,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.create_supplier_with_opening_balance(jsonb,numeric,date,text) to authenticated;
grant execute on function public.create_supplier_purchase_order(uuid,date,date,text,text,text,numeric,numeric,numeric,numeric,numeric,jsonb) to authenticated;
grant execute on function public.record_supplier_purchase_receipt(uuid,date,text,text,text,uuid,jsonb) to authenticated;
grant execute on function public.create_supplier_bill(uuid,uuid,text,date,date,numeric,numeric,numeric,numeric,numeric,text,text,text) to authenticated;
grant execute on function public.record_supplier_payment(uuid,date,numeric,text,text,text,text,text,uuid,jsonb) to authenticated;

create or replace view public.admin_supplier_ledger with(security_invoker=true) as
select a.id::text transaction_id,a.supplier_id,a.adjustment_date transaction_date,a.entry_type transaction_type,
 coalesce(a.reference,'') reference,a.reason description,a.amount_delta balance_delta,a.created_at recorded_at
from public.admin_supplier_ledger_adjustments a where a.status='confirmed'
union all
select b.id::text,b.supplier_id,b.invoice_date,'supplier_bill'::text,
 coalesce(nullif(b.supplier_invoice_number,''),b.bill_number),'Supplier invoice '||b.bill_number,b.total_amount,b.created_at
from public.admin_supplier_bills b where b.status='confirmed'
union all
select p.id::text,p.supplier_id,p.payment_date,'supplier_payment'::text,
 coalesce(nullif(p.transaction_reference,''),p.payment_number),'Supplier payment '||p.payment_number,-p.amount,p.created_at
from public.admin_supplier_payments p where p.status='confirmed'
union all
select c.id::text,c.supplier_id,c.credit_date,'credit_note'::text,
 coalesce(nullif(c.supplier_reference,''),c.credit_note_number),c.reason,-c.amount,c.created_at
from public.admin_supplier_credit_notes c where c.status='confirmed';

create or replace view public.admin_supplier_balances with(security_invoker=true) as
select s.id supplier_id,s.supplier_code,s.name supplier_name,s.is_active,
 coalesce(sum(case when l.transaction_type='supplier_bill' then l.balance_delta else 0 end),0)::numeric(14,2) total_bills,
 coalesce(sum(case when l.transaction_type='supplier_payment' then -l.balance_delta else 0 end),0)::numeric(14,2) total_paid,
 coalesce(sum(case when l.transaction_type='credit_note' then -l.balance_delta else 0 end),0)::numeric(14,2) total_credits,
 coalesce(sum(case when l.transaction_type='opening_balance' then l.balance_delta else 0 end),0)::numeric(14,2) opening_balance,
 coalesce(sum(l.balance_delta),0)::numeric(14,2) outstanding_balance,
 max(case when l.transaction_type='supplier_bill' then l.transaction_date end) last_purchase_date,
 max(case when l.transaction_type='supplier_payment' then l.transaction_date end) last_payment_date
from public.admin_suppliers s left join public.admin_supplier_ledger l on l.supplier_id=s.id
group by s.id,s.supplier_code,s.name,s.is_active;

revoke all on public.admin_supplier_ledger from public,anon;
revoke all on public.admin_supplier_balances from public,anon;
grant select on public.admin_supplier_ledger to authenticated;
grant select on public.admin_supplier_balances to authenticated;

comment on table public.admin_suppliers is 'Supplier master records for the Halal Food procurement and accounts payable workspace.';
comment on table public.admin_purchase_receipts is 'Goods Received Notes; confirmed receipts increase inventory only for accepted quantities.';
comment on table public.admin_supplier_bills is 'Supplier invoices and accounts payable. Only confirmed bills contribute to the supplier ledger.';
comment on table public.admin_supplier_payments is 'Confirmed supplier cash outflows. Each payment is mirrored once into Finance & Cash Flow.';
comment on table public.admin_supplier_payment_allocations is 'Allocates a supplier payment across one or more supplier bills. Unallocated value is supplier advance.';
comment on table public.admin_supplier_ledger_adjustments is 'Opening balances and controlled supplier ledger adjustments.';
comment on view public.admin_supplier_ledger is 'Read-only supplier statement view combining confirmed bills, payments, credit notes and ledger adjustments.';
