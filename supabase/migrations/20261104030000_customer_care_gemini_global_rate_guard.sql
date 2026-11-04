-- Shared, database-backed Gemini request throttle for customer-care-chat.
-- The service role reserves at most 4 provider-call slots in any rolling 60-second window.
-- No customer content, API keys, or prompts are stored here.

create table if not exists public.ai_customer_care_gemini_rate_slots (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default clock_timestamp()
);

alter table public.ai_customer_care_gemini_rate_slots enable row level security;

revoke all on table public.ai_customer_care_gemini_rate_slots from public, anon, authenticated;
grant select, insert, delete on table public.ai_customer_care_gemini_rate_slots to service_role;

create or replace function public.reserve_customer_care_gemini_slot(p_limit integer default 4)
returns boolean
language plpgsql
volatile
security invoker
set search_path = pg_catalog, public
as $function$
declare
  v_count integer;
  v_limit integer := least(greatest(coalesce(p_limit, 4), 1), 4);
begin
  perform pg_advisory_xact_lock(918273, 445566);

  delete from public.ai_customer_care_gemini_rate_slots
  where created_at < clock_timestamp() - interval '2 minutes';

  select count(*)::integer
    into v_count
  from public.ai_customer_care_gemini_rate_slots
  where created_at >= clock_timestamp() - interval '60 seconds';

  if v_count >= v_limit then
    return false;
  end if;

  insert into public.ai_customer_care_gemini_rate_slots default values;
  return true;
end;
$function$;

revoke all on function public.reserve_customer_care_gemini_slot(integer) from public, anon, authenticated;
grant execute on function public.reserve_customer_care_gemini_slot(integer) to service_role;
