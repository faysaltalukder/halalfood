alter table public.incomplete_checkouts
  alter column consent_method drop default,
  alter column consent_version drop default;

comment on column public.incomplete_checkouts.consent_method is
  'Processing notice path / collection method. New write paths must set this explicitly; legacy checkbox records remain labeled separately.';
