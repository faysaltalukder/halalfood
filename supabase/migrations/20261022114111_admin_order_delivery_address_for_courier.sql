create or replace function public.admin_update_order_delivery_address(
  p_order_id uuid,
  p_delivery_address text
)
returns table(order_id uuid, delivery_address text, updated_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_aal text := coalesce(auth.jwt() ->> 'aal', 'aal1');
  v_address text := trim(coalesce(p_delivery_address, ''));
  v_status text;
  v_updated_at timestamptz;
begin
  if v_email <> 'halalfoodbd.official@gmail.com' or v_aal <> 'aal2' then
    raise exception 'Admin access with completed MFA is required.' using errcode = '42501';
  end if;

  if length(v_address) < 10 then
    raise exception 'Enter a complete delivery address of at least 10 characters, including area/upazila and district.' using errcode = '22023';
  end if;
  if length(v_address) > 250 then
    raise exception 'Delivery address must be 250 characters or fewer.' using errcode = '22023';
  end if;

  select o.status into v_status
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found.' using errcode = 'P0002';
  end if;
  if v_status not in ('pending', 'processing') then
    raise exception 'Only pending or processing orders can have their delivery address corrected for courier booking.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.admin_shipments s
    where s.order_id = p_order_id
      and (
        s.integration_mode = 'live_api'
        or s.booking_state in ('in_progress', 'succeeded', 'unknown')
        or s.shipment_status in ('booked', 'picked_up', 'in_transit', 'delivered', 'returned')
        or nullif(trim(coalesce(s.provider_order_id, '')), '') is not null
        or nullif(trim(coalesce(s.tracking_id, '')), '') is not null
      )
  ) then
    raise exception 'Delivery address cannot be changed while the courier booking is successful or uncertain. Verify the provider first.' using errcode = '22023';
  end if;

  update public.orders
  set delivery_address = v_address,
      updated_at = now()
  where id = p_order_id
  returning public.orders.updated_at into v_updated_at;

  return query select p_order_id, v_address, v_updated_at;
end;
$$;

revoke all on function public.admin_update_order_delivery_address(uuid, text) from public;
revoke all on function public.admin_update_order_delivery_address(uuid, text) from anon;
grant execute on function public.admin_update_order_delivery_address(uuid, text) to authenticated;

comment on function public.admin_update_order_delivery_address(uuid, text) is
  'Allows the MFA-verified Halal Food admin to correct a delivery address before courier booking; rejects edits after a live or uncertain courier booking.';
