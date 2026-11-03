begin;

-- Additive, owner-managed search metadata. Existing product knowledge rows and
-- verified customer-facing facts remain unchanged.
alter table public.ai_product_knowledge
  add column if not exists search_synonyms text[] not null default '{}',
  add column if not exists product_form text,
  add column if not exists derived_from text[] not null default '{}',
  add column if not exists related_terms text[] not null default '{}',
  add column if not exists brand text,
  add column if not exists packaging_type text,
  add column if not exists visual_description text,
  add column if not exists size_label text,
  add column if not exists search_attributes jsonb not null default '{}'::jsonb;

alter table public.ai_product_knowledge
  add constraint ai_product_knowledge_search_attributes_object_check
    check (jsonb_typeof(search_attributes) = 'object'),
  add constraint ai_product_knowledge_search_synonyms_limit_check
    check (cardinality(search_synonyms) <= 50),
  add constraint ai_product_knowledge_derived_from_limit_check
    check (cardinality(derived_from) <= 30),
  add constraint ai_product_knowledge_related_terms_limit_check
    check (cardinality(related_terms) <= 50);

comment on column public.ai_product_knowledge.search_synonyms is
  'Admin-verified Bangla, English and Banglish search aliases; search expansion only, never presented as the product name.';
comment on column public.ai_product_knowledge.search_attributes is
  'Admin-verified structured product attributes for hybrid search; missing keys mean unknown, not negative.';
comment on column public.ai_product_knowledge.derived_from is
  'Admin-verified source materials or ingredients related to this product.';
comment on column public.ai_product_knowledge.visual_description is
  'Admin-verified visible product identity cues; do not infer brand or packaging from unclear images.';

-- Extend the existing first-party analytics event allowlist without changing
-- or deleting any existing analytics rows.
alter table public.analytics_events
  drop constraint if exists analytics_events_event_name_check;

alter table public.analytics_events
  add constraint analytics_events_event_name_check check (
    event_name = any (array[
      'page_view','page_engagement','view_item','view_item_list','select_item',
      'search','add_to_cart','remove_from_cart','view_cart','begin_checkout',
      'add_shipping_info','add_payment_info','order_submit','order_success',
      'purchase','track_order','whatsapp_click','phone_click','sign_up','login',
      'generate_lead','refund',
      'ai_intent_detected','ai_recommendation_allowed','ai_recommendation_suppressed',
      'ai_product_card_shown','ai_exact_product_match','ai_product_match_failed',
      'ai_image_search_started','ai_image_search_completed','ai_clarification_requested',
      'ai_customer_corrected','ai_recommendation_rejected','ai_product_clicked','ai_search_resolved'
    ]::text[])
  );

comment on constraint analytics_events_event_name_check on public.analytics_events is
  'Allows existing website analytics plus privacy-safe Halal Food AI customer-care intelligence events.';

commit;