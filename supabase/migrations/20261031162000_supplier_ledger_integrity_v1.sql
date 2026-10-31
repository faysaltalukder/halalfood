-- Supplier accounting integrity controls.
-- Finance rows linked to supplier payments can only be updated/reversed through Supplier Payment History.
create or replace function public.sync_supplier_payment_finance_entry()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_supplier_name text;
begin
 perform pg_catalog.set_config('app.supplier_payment_sync','on',true);
 select name into v_supplier_name from public.admin_suppliers where id=new.supplier_id;
 insert into public.admin_finance_entries(entry_type,category,amount,entry_date,description,reference,status,related_supplier_payment_id,created_by)
 values('expense','Supplier payment',new.amount,new.payment_date,
  'Payment to '||coalesce(v_supplier_name,'supplier')||' · '||new.payment_number,new.payment_number,
  case when new.status='void' then 'void' else new.status end,new.id,lower(coalesce(new.created_by,'')))
 on conflict(related_supplier_payment_id) where related_supplier_payment_id is not null
 do update set amount=excluded.amount,entry_date=excluded.entry_date,description=excluded.description,
  reference=excluded.reference,status=excluded.status,updated_at=now();
 return new;
end $$;

create or replace function public.guard_supplier_linked_finance_entries()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if current_setting('app.supplier_payment_sync',true)='on' then
  if tg_op='DELETE' then return old;end if;
  return new;
 end if;
 if tg_op='INSERT' then
  if new.related_supplier_payment_id is not null then
   raise exception 'Supplier payment expense entries are created by the Supplier Payment workflow only.';
  end if;
  return new;
 elsif tg_op='UPDATE' then
  if old.related_supplier_payment_id is not null or new.related_supplier_payment_id is not null then
   raise exception 'Update or reverse this expense from Supplier Payment History, not from the general Finance ledger.';
  end if;
  return new;
 elsif tg_op='DELETE' then
  if old.related_supplier_payment_id is not null then
   raise exception 'Void or reverse this expense from Supplier Payment History; linked finance records cannot be deleted.';
  end if;
  return old;
 end if;
 return null;
end $$;

drop trigger if exists guard_supplier_linked_finance_entries on public.admin_finance_entries;
create trigger guard_supplier_linked_finance_entries
before insert or update or delete on public.admin_finance_entries
for each row execute function public.guard_supplier_linked_finance_entries();
revoke all on function public.guard_supplier_linked_finance_entries() from public,anon,authenticated;

create or replace function public.validate_supplier_credit_note_links()
returns trigger language plpgsql security invoker set search_path='' as $$
declare v_bill_supplier uuid;v_bill_total numeric;v_confirmed_credit numeric;
begin
 if new.supplier_bill_id is not null then
  select supplier_id,total_amount into v_bill_supplier,v_bill_total from public.admin_supplier_bills
  where id=new.supplier_bill_id for update;
  if not found then raise exception 'The linked supplier bill does not exist.';end if;
  if v_bill_supplier<>new.supplier_id then raise exception 'The linked bill belongs to a different supplier.';end if;
  if new.status='confirmed' then
   select coalesce(sum(amount),0) into v_confirmed_credit from public.admin_supplier_credit_notes
   where supplier_bill_id=new.supplier_bill_id and status='confirmed' and id is distinct from new.id;
   if v_confirmed_credit+new.amount>v_bill_total then raise exception 'Confirmed supplier credits cannot exceed the linked bill total.';end if;
  end if;
 end if;
 if new.purchase_order_id is not null and not exists(
  select 1 from public.admin_purchase_orders where id=new.purchase_order_id and supplier_id=new.supplier_id
 ) then raise exception 'The linked purchase order belongs to a different supplier.';end if;
 return new;
end $$;

drop trigger if exists validate_supplier_credit_note_links on public.admin_supplier_credit_notes;
create trigger validate_supplier_credit_note_links
before insert or update of supplier_id,supplier_bill_id,purchase_order_id,amount,status
on public.admin_supplier_credit_notes
for each row execute function public.validate_supplier_credit_note_links();
revoke all on function public.validate_supplier_credit_note_links() from public,anon,authenticated;
