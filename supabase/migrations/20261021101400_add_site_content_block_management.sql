create table if not exists public.site_content_blocks (
  id uuid primary key default gen_random_uuid(),
  block_key text not null unique check (block_key in ('hero_slide_1','hero_slide_2','hero_slide_3','side_banner','first_order_popup')),
  block_type text not null check (block_type in ('hero_slide','side_banner','popup')),
  title text not null default '',
  image_url text not null default '',
  link_url text not null default '',
  alt_text text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_by text not null default lower(coalesce(auth.jwt() ->> 'email','')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists site_content_blocks_active_order_idx on public.site_content_blocks(is_active,sort_order);

alter table public.site_content_blocks enable row level security;
grant select on public.site_content_blocks to anon, authenticated;
grant insert, update, delete on public.site_content_blocks to authenticated;

drop policy if exists "Public can read site content blocks" on public.site_content_blocks;
create policy "Public can read site content blocks"
on public.site_content_blocks for select
to anon, authenticated
using (true);

drop policy if exists "Admin can insert site content blocks with MFA" on public.site_content_blocks;
create policy "Admin can insert site content blocks with MFA"
on public.site_content_blocks for insert
to authenticated
with check (
  lower(coalesce(auth.jwt() ->> 'email','')) = 'halalfoodbd.official@gmail.com'
  and coalesce(auth.jwt() ->> 'aal','aal1') = 'aal2'
  and lower(coalesce(updated_by,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
);

drop policy if exists "Admin can update site content blocks with MFA" on public.site_content_blocks;
create policy "Admin can update site content blocks with MFA"
on public.site_content_blocks for update
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email','')) = 'halalfoodbd.official@gmail.com'
  and coalesce(auth.jwt() ->> 'aal','aal1') = 'aal2'
)
with check (
  lower(coalesce(auth.jwt() ->> 'email','')) = 'halalfoodbd.official@gmail.com'
  and coalesce(auth.jwt() ->> 'aal','aal1') = 'aal2'
  and lower(coalesce(updated_by,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
);

drop policy if exists "Admin can delete site content blocks with MFA" on public.site_content_blocks;
create policy "Admin can delete site content blocks with MFA"
on public.site_content_blocks for delete
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email','')) = 'halalfoodbd.official@gmail.com'
  and coalesce(auth.jwt() ->> 'aal','aal1') = 'aal2'
);

create or replace function public.set_site_content_blocks_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists set_site_content_blocks_updated_at on public.site_content_blocks;
create trigger set_site_content_blocks_updated_at
before update on public.site_content_blocks
for each row execute function public.set_site_content_blocks_updated_at();

insert into public.site_content_blocks(block_key,block_type,title,image_url,link_url,alt_text,is_active,sort_order)
values
 ('hero_slide_1','hero_slide','Founder banner','images/hero/founder-banner.webp','https://faysaltalukder.github.io/faysaldigital/','Faysal — Founder of Halal Food',true,10),
 ('hero_slide_2','hero_slide','Organic grocery banner','images/hero/organic-banner.webp','categories/ghee.html','Organic grocery banner',true,20),
 ('hero_slide_3','hero_slide','Cooking oil banner','images/hero/oil-banner.webp','categories/oil.html','Cooking oil banner',true,30),
 ('side_banner','side_banner','Honey collection banner','images/hero/honey-banner-desktop.webp','categories/honey.html','Honey collection',true,40),
 ('first_order_popup','popup','First order announcement','https://storage.orshot.com/cloud/w-10217/renders/brand_assets/first-order-free-delivery-enhancedwebp-Hi28aMvUC6y.webp','categories/ghee.html','Special announcement: first order promotion. Shop Ghee.',true,50)
on conflict(block_key) do nothing;
