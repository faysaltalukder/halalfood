alter table public.incomplete_checkouts
  add column if not exists consent_method text not null default 'legacy_checkbox';

alter table public.incomplete_checkouts
  add constraint incomplete_checkouts_consent_method_check
  check (consent_method in ('legacy_checkbox', 'checkout_form_entry_after_notice'));

comment on column public.incomplete_checkouts.consent_method is
  'How recovery permission was recorded: legacy explicit checkbox or active checkout form entry after the privacy notice.';
