-- Supplier procurement query-path and RLS policy hardening.
create index if not exists admin_purchase_receipts_purchase_order_idx
 on public.admin_purchase_receipts(purchase_order_id);
create index if not exists admin_purchase_receipts_supplier_idx
 on public.admin_purchase_receipts(supplier_id,receipt_date desc);
create index if not exists admin_purchase_receipt_items_receipt_idx
 on public.admin_purchase_receipt_items(receipt_id);
create index if not exists admin_purchase_receipt_items_po_item_idx
 on public.admin_purchase_receipt_items(purchase_order_item_id);
create index if not exists admin_purchase_receipt_items_product_idx
 on public.admin_purchase_receipt_items(product_id);
create index if not exists admin_supplier_bills_purchase_order_idx
 on public.admin_supplier_bills(purchase_order_id);
create index if not exists admin_supplier_credit_notes_supplier_idx
 on public.admin_supplier_credit_notes(supplier_id,credit_date desc);
create index if not exists admin_supplier_credit_notes_bill_idx
 on public.admin_supplier_credit_notes(supplier_bill_id);
create index if not exists admin_supplier_credit_notes_po_idx
 on public.admin_supplier_credit_notes(purchase_order_id);

do $$
declare t text;
new_tables text[]:=array[
 'admin_purchase_receipts','admin_purchase_receipt_items','admin_supplier_bills',
 'admin_supplier_payments','admin_supplier_payment_allocations','admin_supplier_credit_notes',
 'admin_supplier_ledger_adjustments'
];
begin
 foreach t in array new_tables loop
  execute format('drop policy if exists "Admin supplier module access with MFA" on public.%I',t);
  execute format(
   'create policy "Admin supplier module access with MFA" on public.%I for all to authenticated using (lower(coalesce(((select auth.jwt())->>''email''),''''))=''halalfoodbd.official@gmail.com'' and coalesce(((select auth.jwt())->>''aal''),''aal1'')=''aal2'') with check (lower(coalesce(((select auth.jwt())->>''email''),''''))=''halalfoodbd.official@gmail.com'' and coalesce(((select auth.jwt())->>''aal''),''aal1'')=''aal2'')',
   t
  );
 end loop;
end $$;
