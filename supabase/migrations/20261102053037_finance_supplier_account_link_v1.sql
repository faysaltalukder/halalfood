-- Link supplier payment mirror entries to Finance accounts by exact account name/reference.
-- Supplier payment remains the only write path for supplier-linked ledger records.

create or replace function public.sync_supplier_payment_finance_entry()
returns trigger language plpgsql security definer set search_path='' as $$
declare
 v_supplier_name text;
 v_account_id uuid;
begin
 perform pg_catalog.set_config('app.supplier_payment_sync','on',true);
 select name into v_supplier_name from public.admin_suppliers where id=new.supplier_id;
 select id into v_account_id
 from public.admin_finance_accounts
 where is_active and (
  lower(btrim(name))=lower(btrim(coalesce(new.paid_from_account,'')))
  or (length(btrim(coalesce(account_reference,'')))>0 and lower(btrim(account_reference))=lower(btrim(coalesce(new.paid_from_account,''))))
 )
 order by case when lower(btrim(name))=lower(btrim(coalesce(new.paid_from_account,''))) then 0 else 1 end
 limit 1;

 insert into public.admin_finance_entries(
  entry_type,category,amount,entry_date,description,reference,status,
  related_supplier_payment_id,account_id,payment_method,party_name,financial_class,created_by
 ) values (
  'expense','Supplier payment',new.amount,new.payment_date,
  'Payment to '||coalesce(v_supplier_name,'supplier')||' · '||new.payment_number,
  coalesce(nullif(new.transaction_reference,''),new.payment_number),
  case when new.status='void' then 'void' else new.status end,
  new.id,v_account_id,new.payment_method,coalesce(v_supplier_name,'Supplier'),'operating',
  lower(coalesce(new.created_by,''))
 )
 on conflict(related_supplier_payment_id) where related_supplier_payment_id is not null
 do update set amount=excluded.amount,entry_date=excluded.entry_date,description=excluded.description,
  reference=excluded.reference,status=excluded.status,account_id=excluded.account_id,
  payment_method=excluded.payment_method,party_name=excluded.party_name,updated_at=now();
 return new;
end $$;
revoke all on function public.sync_supplier_payment_finance_entry() from public,anon,authenticated;

drop trigger if exists admin_supplier_payment_sync_finance on public.admin_supplier_payments;
create trigger admin_supplier_payment_sync_finance
 after insert or update of status,amount,payment_date,paid_from_account,payment_method,transaction_reference,supplier_id
 on public.admin_supplier_payments for each row execute function public.sync_supplier_payment_finance_entry();

-- Backfill existing supplier payment mirrors where the free-text account exactly matches a configured Finance account.
update public.admin_finance_entries fe
 set account_id=a.id,payment_method=sp.payment_method,
  party_name=coalesce(s.name,'Supplier'),updated_at=now()
 from public.admin_supplier_payments sp
 join public.admin_suppliers s on s.id=sp.supplier_id
 join public.admin_finance_accounts a on a.is_active and (
  lower(btrim(a.name))=lower(btrim(coalesce(sp.paid_from_account,'')))
  or (length(btrim(coalesce(a.account_reference,'')))>0 and lower(btrim(a.account_reference))=lower(btrim(coalesce(sp.paid_from_account,''))))
 )
 where fe.related_supplier_payment_id=sp.id;

-- Keep recency fields accurate on the new Finance workspace tables.
drop trigger if exists set_admin_finance_accounts_updated_at on public.admin_finance_accounts;
create trigger set_admin_finance_accounts_updated_at before update on public.admin_finance_accounts
 for each row execute function public.set_admin_finance_updated_at();
drop trigger if exists set_admin_finance_transfers_updated_at on public.admin_finance_transfers;
create trigger set_admin_finance_transfers_updated_at before update on public.admin_finance_transfers
 for each row execute function public.set_admin_finance_updated_at();
drop trigger if exists set_admin_finance_budgets_updated_at on public.admin_finance_budgets;
create trigger set_admin_finance_budgets_updated_at before update on public.admin_finance_budgets
 for each row execute function public.set_admin_finance_updated_at();
drop trigger if exists set_admin_cod_settlements_updated_at on public.admin_cod_settlements;
create trigger set_admin_cod_settlements_updated_at before update on public.admin_cod_settlements
 for each row execute function public.set_admin_finance_updated_at();
