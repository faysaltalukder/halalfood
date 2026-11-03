begin;

-- Allow only the explicitly configured Halal Food admin account with an AAL2 session
-- to manage the AI knowledge editor. Public/anonymous access remains revoked.
grant select, insert, update, delete on table public.ai_knowledge_documents to authenticated;
grant select, insert, update, delete on table public.ai_product_knowledge to authenticated;

drop policy if exists "AAL2 Halal Food admin manages AI knowledge documents" on public.ai_knowledge_documents;
create policy "AAL2 Halal Food admin manages AI knowledge documents"
  on public.ai_knowledge_documents
  for all
  to authenticated
  using (
    lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'halalfoodbd.official@gmail.com'
    and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
  )
  with check (
    lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'halalfoodbd.official@gmail.com'
    and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
  );

drop policy if exists "AAL2 Halal Food admin manages AI product knowledge" on public.ai_product_knowledge;
create policy "AAL2 Halal Food admin manages AI product knowledge"
  on public.ai_product_knowledge
  for all
  to authenticated
  using (
    lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'halalfoodbd.official@gmail.com'
    and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
  )
  with check (
    lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'halalfoodbd.official@gmail.com'
    and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
  );

comment on policy "AAL2 Halal Food admin manages AI knowledge documents" on public.ai_knowledge_documents is
  'Only halalfoodbd.official@gmail.com with a verified AAL2 session can manage customer-facing AI knowledge.';
comment on policy "AAL2 Halal Food admin manages AI product knowledge" on public.ai_product_knowledge is
  'Only halalfoodbd.official@gmail.com with a verified AAL2 session can manage product profiles; service_role remains available to the AI Edge Function.';

commit;