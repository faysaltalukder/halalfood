-- When a Finance account is created or renamed, map existing Supplier Payment mirror rows
-- only when the supplier workflow's free-text paid_from_account exactly matches its name/reference.
create or replace function public.assign_existing_supplier_payment_finance_account()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.is_active then
  perform pg_catalog.set_config('app.supplier_payment_sync','on',true);
  update public.admin_finance_entries fe
   set account_id=new.id,payment_method=sp.payment_method,
       party_name=coalesce(s.name,'Supplier'),updated_at=now()
  from public.admin_supplier_payments sp
  join public.admin_suppliers s on s.id=sp.supplier_id
  where fe.related_supplier_payment_id=sp.id
    and (
      lower(btrim(new.name))=lower(btrim(coalesce(sp.paid_from_account,'')))
      or (length(btrim(coalesce(new.account_reference,'')))>0
          and lower(btrim(new.account_reference))=lower(btrim(coalesce(sp.paid_from_account,''))))
    );
 end if;
 return new;
end $$;
revoke all on function public.assign_existing_supplier_payment_finance_account() from public,anon,authenticated;
drop trigger if exists assign_existing_supplier_payment_finance_account on public.admin_finance_accounts;
create trigger assign_existing_supplier_payment_finance_account
 after insert or update of name,account_reference,is_active
 on public.admin_finance_accounts
 for each row execute function public.assign_existing_supplier_payment_finance_account();
