alter table public.incomplete_checkouts
  alter column recovery_consent set default false,
  alter column recovery_consent_at drop not null;

alter table public.incomplete_checkouts
  drop constraint if exists incomplete_checkouts_recovery_consent_check;

comment on column public.incomplete_checkouts.recovery_consent is
  'Legacy explicit checkbox consent only. False for new notice-based checkout-entry records; see consent_method for the processing notice path.';
