-- Cover every newly-added Phase 2 foreign key with an index.
-- Nullable source links use partial indexes to keep empty operational tables small.

create index if not exists idx_cod_accounting_journal
  on public.admin_cod_settlements(accounting_journal_id)
  where accounting_journal_id is not null;
create index if not exists idx_cod_cogs_reversal_journal
  on public.admin_cod_settlements(order_cogs_reversal_journal_id)
  where order_cogs_reversal_journal_id is not null;
create index if not exists idx_cod_sale_reversal_journal
  on public.admin_cod_settlements(order_sale_reversal_journal_id)
  where order_sale_reversal_journal_id is not null;
create index if not exists idx_cod_remitted_finance_account
  on public.admin_cod_settlements(remitted_account_id)
  where remitted_account_id is not null;
create index if not exists idx_cod_reversal_journal
  on public.admin_cod_settlements(reversal_journal_id)
  where reversal_journal_id is not null;

create index if not exists idx_finance_account_opening_journal
  on public.admin_finance_accounts(opening_balance_journal_id)
  where opening_balance_journal_id is not null;
create index if not exists idx_finance_account_opening_offset
  on public.admin_finance_accounts(opening_offset_account_id)
  where opening_offset_account_id is not null;
create index if not exists idx_finance_entry_reversal_journal
  on public.admin_finance_entries(reversal_journal_id)
  where reversal_journal_id is not null;
create index if not exists idx_finance_journal_reversed_by
  on public.admin_finance_journal_entries(reversed_by)
  where reversed_by is not null;
create index if not exists idx_finance_transfer_reversal_journal
  on public.admin_finance_transfers(reversal_journal_id)
  where reversal_journal_id is not null;

create index if not exists idx_inventory_cost_layer_po_item
  on public.admin_inventory_cost_layers(purchase_order_item_id);
create index if not exists idx_inventory_cost_layer_receipt
  on public.admin_inventory_cost_layers(receipt_id);

create index if not exists idx_return_refund_finance_account
  on public.admin_return_requests(refund_account_id)
  where refund_account_id is not null;
create index if not exists idx_return_reversal_journal
  on public.admin_return_requests(reversal_journal_id)
  where reversal_journal_id is not null;

create index if not exists idx_supplier_bill_accounting_journal
  on public.admin_supplier_bills(accounting_journal_id)
  where accounting_journal_id is not null;
create index if not exists idx_supplier_bill_reversal_journal
  on public.admin_supplier_bills(reversal_journal_id)
  where reversal_journal_id is not null;

create index if not exists idx_supplier_credit_reversal_journal
  on public.admin_supplier_credit_notes(reversal_journal_id)
  where reversal_journal_id is not null;

create index if not exists idx_supplier_payment_accounting_journal
  on public.admin_supplier_payments(accounting_journal_id)
  where accounting_journal_id is not null;
create index if not exists idx_supplier_payment_reversal_journal
  on public.admin_supplier_payments(reversal_journal_id)
  where reversal_journal_id is not null;
