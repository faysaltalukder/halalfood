# Architecture Map

## Product constraint

This document describes the current architecture and the safe target direction. Refactoring is internal: the storefront, admin UI, business rules, endpoint contracts, and operational workflows must remain behaviourally unchanged.

## Runtime topology

~~~text
Customer browser
  |
  +-- GitHub Pages: static storefront pages
  |     +-- HTML route shells (home, category, product, cart, checkout, account, help)
  |     +-- public JavaScript (navigation, live catalog, cart, checkout, tracking)
  |
  +-- Admin browser
        +-- Admin HTML pages and feature scripts
        +-- Supabase publishable key + authenticated admin session
                 |
                 v
           Supabase Data API / Realtime
                 |
                 +-- PostgreSQL (authoritative data)
                 +-- Storage (media and site content)
                 +-- Edge Functions (privileged workflows)
                           |
                           +-- Courier providers
                           +-- Meta / Facebook
                           +-- YouTube / Google OAuth
                           +-- WhatsApp / Messenger
                           +-- GitHub Pages publishing

Google Sheets: secondary backup/order intake integration; never the primary order source.
~~~

## Source-of-truth rules

| Domain | Authoritative source | Secondary representation |
|---|---|---|
| Products and categories | Supabase `products`, `categories` | Static product data and product index are compatibility/fallback data until their consumers are removed safely |
| Orders and order items | Supabase `orders`, `order_items` | Google Sheets backup |
| Stock and stock history | Supabase product stock and inventory ledger | Admin display/cache |
| Customer identity | Supabase Auth + `customers` / `customer_profiles` | Browser profile state |
| Analytics | Supabase `analytics_events` | GA4 and Meta events |
| Meta event delivery | Server-side event pipeline and delivery log | Browser Pixel events, deduplicated by event ID |
| Publishing queue | Supabase `post_queue` | Provider publish history |
| Provider credentials | Supabase/Edge Function secrets and encrypted server-side records | Never browser storage or Git |
| Website content publishing | Site Publisher workflow and GitHub repository | Deployment log |

## Architectural boundaries

### 1. Presentation
HTML and CSS define the current visual experience. Keep visual changes out of refactoring-only commits. Reusable presentation fragments may be extracted only when rendered output is verified unchanged.

### 2. Feature logic
A feature owns its state transitions and rendering decisions. Current feature areas include catalog, product details, cart, checkout, orders, customer account, tracking, analytics, admin operations, publishing, and messaging.

### 3. Data access
Database query definitions, pagination, payload normalization, and error conversion should live in feature-scoped repositories/services rather than being duplicated across page scripts.

### 4. Server workflows
Each Edge Function remains a separately deployable endpoint. Common HTTP, CORS, Supabase-client, validation, auth, logging, and idempotency helpers belong in `supabase/functions/_shared/`; business/provider logic stays within the owning function or a domain-specific module.

### 5. Database
Schema changes are additive and versioned. Production migration history and repository migrations must be reconciled before using Git migrations to reproduce or modify production.

## Current implementation facts

- The public storefront uses static HTML, CSS, and browser JavaScript.
- The public website includes `js/main.js`, `js/cart.js`, `js/live-catalog.js`, and product support scripts.
- Catalog data currently has a live Supabase path plus legacy/static compatibility sources. Do not delete the compatibility sources until all consumers are identified and tested.
- The admin has a large central `admin/app.js` plus `admin/shared.js`, feature pages, and feature-specific scripts.
- The Supabase project currently has 48 public tables, 16 active Edge Functions, and PostgreSQL 17.
- Three active Edge Function sources were recovered from the deployed project into this refactoring branch: `order-track`, `youtube-publishing`, and `meta-ads-review`. Their recovered deployed versions are documented in the codebase map.

## Target dependency direction

~~~text
HTML page
  -> page bootstrap
  -> feature module
  -> feature service/repository
  -> shared platform adapter
  -> Supabase / Edge Function

Admin page
  -> admin page bootstrap
  -> admin feature module
  -> admin service
  -> shared auth/query/format/telemetry utilities
  -> Supabase / Edge Function
~~~

Dependencies should flow inward to stable services. A low-level catalog repository must not import page markup; a courier provider adapter must not depend on admin DOM elements.

## Architecture decisions

- Retain GitHub Pages and the existing static website. No framework migration is required to get modularity.
- Prefer native ES modules for new modular code. Migrate existing IIFEs incrementally, only with parity tests.
- Keep one owner for each business rule. Avoid copying validation, price calculations, order status mapping, and auth checks into multiple pages.
- Keep database access behind named service/repository functions to make the data flow discoverable.
- Keep API contracts stable and document them before changing request/response fields.
- Do not create microservices for the sake of architecture. The current modular-monolith model with separate Edge Function endpoints is sufficient.

## Required invariants

1. Existing customer-facing pages remain visually and behaviourally equivalent.
2. Admin facilities and permissions remain available.
3. Order submission continues to save to Supabase first; Sheets remains secondary.
4. Stock reservation/release and financial ledger guarantees are preserved.
5. Tracking event IDs and Meta deduplication remain stable.
6. All privileged secrets remain server-side.
7. No production database change occurs without backup, migration, and post-change verification.
