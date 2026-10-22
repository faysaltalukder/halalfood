-- WhatsApp messaging inbox schema.
-- Safe to run when the initial tables are already present.
-- Admin access is restricted to the authorized email with MFA (AAL2).

create table if not exists public.messaging_contacts (
  id uuid primary key default gen_random_uuid(),
  channel text not null default 'whatsapp'
    check (channel in ('whatsapp','messenger','instagram','website')),
  external_contact_id text not null,
  display_name text,
  phone_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel, external_contact_id)
);

create table if not exists public.messaging_conversations (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.messaging_contacts(id) on delete cascade,
  channel text not null default 'whatsapp'
    check (channel in ('whatsapp','messenger','instagram','website')),
  status text not null default 'open' check (status in ('open','closed')),
  unread_count integer not null default 0 check (unread_count >= 0),
  last_message_at timestamptz,
  last_message_preview text,
  last_message_direction text check (last_message_direction is null or last_message_direction in ('inbound','outbound')),
  last_inbound_at timestamptz,
  assigned_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel, contact_id)
);

create table if not exists public.messaging_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.messaging_conversations(id) on delete cascade,
  channel text not null default 'whatsapp'
    check (channel in ('whatsapp','messenger','instagram','website')),
  provider_message_id text,
  direction text not null check (direction in ('inbound','outbound')),
  message_type text not null default 'text',
  body text not null default '',
  media_id text,
  media_mime_type text,
  status text not null default 'received'
    check (status in ('received','queued','sent','delivered','read','failed')),
  provider_timestamp timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  error_code text,
  error_title text,
  created_at timestamptz not null default now(),
  constraint messaging_messages_provider_id_unique unique (channel, provider_message_id)
);

create index if not exists messaging_conversations_inbox_idx
  on public.messaging_conversations (channel, status, last_message_at desc);
create index if not exists messaging_messages_conversation_time_idx
  on public.messaging_messages (conversation_id, created_at);
create index if not exists messaging_contacts_lookup_idx
  on public.messaging_contacts (channel, external_contact_id);

alter table public.messaging_contacts enable row level security;
alter table public.messaging_conversations enable row level security;
alter table public.messaging_messages enable row level security;

drop policy if exists "HF admin with MFA can access messaging contacts" on public.messaging_contacts;
create policy "HF admin with MFA can access messaging contacts"
  on public.messaging_contacts for all to authenticated
  using (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'halalfoodbd.official@gmail.com'
    and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
  )
  with check (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'halalfoodbd.official@gmail.com'
    and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
  );

drop policy if exists "HF admin with MFA can access messaging conversations" on public.messaging_conversations;
create policy "HF admin with MFA can access messaging conversations"
  on public.messaging_conversations for all to authenticated
  using (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'halalfoodbd.official@gmail.com'
    and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
  )
  with check (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'halalfoodbd.official@gmail.com'
    and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
  );

drop policy if exists "HF admin with MFA can access messaging messages" on public.messaging_messages;
create policy "HF admin with MFA can access messaging messages"
  on public.messaging_messages for all to authenticated
  using (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'halalfoodbd.official@gmail.com'
    and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
  )
  with check (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'halalfoodbd.official@gmail.com'
    and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
  );

revoke all on public.messaging_contacts, public.messaging_conversations, public.messaging_messages from anon;
grant select, insert, update on public.messaging_contacts, public.messaging_conversations, public.messaging_messages to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messaging_contacts') then
      alter publication supabase_realtime add table public.messaging_contacts;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messaging_conversations') then
      alter publication supabase_realtime add table public.messaging_conversations;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messaging_messages') then
      alter publication supabase_realtime add table public.messaging_messages;
    end if;
  end if;
end $$;
