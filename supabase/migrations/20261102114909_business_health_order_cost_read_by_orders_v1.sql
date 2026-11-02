create or replace function public.get_business_health_order_cost_snapshots(p_order_ids uuid[])
returns table(order_item_id uuid,order_id uuid,cost_price numeric,packaging_cost numeric,snapshot_status text,captured_at timestamptz)
language plpgsql stable security invoker set search_path = ''
as $$
begin
  if auth.uid() is null
     or lower(coalesce(auth.jwt() ->> 'email','')) <> 'halalfoodbd.official@gmail.com'
     or coalesce(auth.jwt() ->> 'aal','aal1') <> 'aal2' then
    raise exception 'Business Health cost details require the authorized admin account and MFA.' using errcode='42501';
  end if;
  if coalesce(array_length(p_order_ids,1),0)>5000 then
    raise exception 'The reporting selection is too large. Narrow the reporting period.' using errcode='22023';
  end if;
  return query
  select s.order_item_id,oi.order_id,s.cost_price,s.packaging_cost,s.snapshot_status,s.captured_at
    from private.business_health_order_cost_snapshots s
    join public.order_items oi on oi.id=s.order_item_id
   where oi.order_id=any(coalesce(p_order_ids,array[]::uuid[]))
   order by s.captured_at desc;
end;
$$;
revoke all on function public.get_business_health_order_cost_snapshots(uuid[]) from public,anon,authenticated;
grant execute on function public.get_business_health_order_cost_snapshots(uuid[]) to authenticated;
comment on function public.get_business_health_order_cost_snapshots(uuid[]) is
  'MFA-gated SECURITY INVOKER read path for immutable item cost snapshots belonging only to selected delivered order IDs.';
