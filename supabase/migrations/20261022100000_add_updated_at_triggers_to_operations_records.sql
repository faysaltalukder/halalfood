-- Keep operational list ordering reliable after edits.
drop trigger if exists admin_shipments_set_updated_at on public.admin_shipments;
create trigger admin_shipments_set_updated_at before update on public.admin_shipments
for each row execute function public.set_admin_finance_updated_at();

drop trigger if exists admin_operational_tasks_set_updated_at on public.admin_operational_tasks;
create trigger admin_operational_tasks_set_updated_at before update on public.admin_operational_tasks
for each row execute function public.set_admin_finance_updated_at();

drop trigger if exists admin_suppliers_set_updated_at on public.admin_suppliers;
create trigger admin_suppliers_set_updated_at before update on public.admin_suppliers
for each row execute function public.set_admin_finance_updated_at();

drop trigger if exists admin_purchase_orders_set_updated_at on public.admin_purchase_orders;
create trigger admin_purchase_orders_set_updated_at before update on public.admin_purchase_orders
for each row execute function public.set_admin_finance_updated_at();

drop trigger if exists admin_return_requests_set_updated_at on public.admin_return_requests;
create trigger admin_return_requests_set_updated_at before update on public.admin_return_requests
for each row execute function public.set_admin_finance_updated_at();
