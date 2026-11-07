# WordPress Studio isolation contract

This document lives in the Halal Food repository to prevent future work from accidentally merging the two systems. **The WordPress/Grocery Studio is not part of Halal Food.**

## System ownership

### Halal Food
- Source: `faysaltalukder/halalfood`
- Website: https://faysaltalukder.github.io/halalfood/
- Backend: Halal Food's Supabase project (`qfwvrcfkrsydycbfjsxf`, `ap-southeast-1`).
- Halal Food retains its own storefront, orders, customers, finance, POS, AI customer care, marketing and admin functions.

### Independent WordPress/Grocery Studio
- Source: `faysaltalukder/grocery-storefronts/wordpress-app/`
- Admin: https://wordpress-studio.shipstatic.com/admin/
- Central commerce: https://wordpress-studio.shipstatic.com/admin/commerce.html
- Hosting: ShipStatic.
- Database/API/auth: the dedicated Neon project `super-glade-83751859`, database `halal_food_db`, schema `builder`, region `ap-southeast-1`.
- The Neon project currently carries the historical display name **Halal Food Auxiliary**. That label does not make it a Halal Food backend; this project belongs to the independent Studio.
- Production branch: `grocery-template-builder-v1` (`br-muddy-lake-a1tcb0n1`).
- Acceptance branch: `grocery-acceptance-qa-20261107` (`br-divine-bar-a197956w`).

## Strict separation rules

- Do not connect WordPress Studio to Halal Food's Supabase database, storage, Edge Functions, orders, customer records or admin credentials.
- Do not pass Halal Food Supabase sessions, JWTs, service keys or secrets to WordPress Studio.
- Do not use the WordPress Neon database as a Halal Food backend or fallback.
- Each system must retain independent authentication, authorization, secrets, source control, hosting and release lifecycle.
- A failure or deployment of one project must not prevent the other project's storefront, admin or order processing from working.
- The only permitted cross-project relationship is a user-facing link/redirect where explicitly present; it must not exchange credentials, cookies or session state.

## Halal Food repository boundary

The Halal Food admin no longer contains an active WordPress sidebar section or embedded builder. The old routes are compatibility redirects to the independent Studio:

- `admin/wordpress.html`
- `admin/wordpress-live.html`
- `admin/wordpress-templates.html`
- `admin/website-builder.html`

Do not reintroduce WordPress renderer/editor code, template data, Neon clients, Neon migrations, WordPress customer/order data, WordPress credentials or WordPress deployment workflows into this repository. Keep this contract and its regression check current whenever the integration boundary changes.

## Studio storefront contracts

The independent Studio currently contains four reusable grocery storefronts:

| Key | Experience |
|---|---|
| `general-supermarket` | General Supermarket |
| `fresh-produce` | Fresh & Farm |
| `express-grocery` | Express Grocery |
| `wholesale-bulk` | Wholesale & Bulk |

The four stores share the Studio's commerce model; do not fork order/product persistence per template.

## Current operating state (2026-11-08)

- The Studio central admin and order desk are deployed on the verified ShipStatic domain.
- Four grocery website records are published in Neon; each currently contains 60 active sample products with stock values.
- The catalogue is still sample/demo content. It is not a verified merchant catalogue and must not be represented as real inventory.
- Checkout is available for demonstration and test orders are explicitly marked `[DEMO ORDER — TEST ONLY; DO NOT FULFIL]`.
- Demo payment collection is blocked by the database RPC. Do not pack, dispatch or collect payment for demo orders.
- Cash on delivery is the only configured checkout method in this release. No online payment gateway or automatic courier booking/synchronization is included.
- The Studio's production branch is the default branch. Protect it from accidental resets/deletion where the current Neon plan permits; do not upgrade a plan or change branch settings without approval.

## Safe change workflow

1. Confirm which project owns the requested change before editing.
2. Inspect the correct repository, branch, deployment and database branch.
3. Make source changes on a feature branch and keep the change set narrowly scoped.
4. Use additive, versioned migrations; verify them on QA before production.
5. Keep all tenant reads/writes owner-scoped and server-authorized.
6. Never expose database credentials or privileged API keys in browser code.
7. Run syntax checks, architecture contracts, storefront/order regression checks and the relevant CI workflows.
8. Do not merge, publish real merchant content, change authentication, delete backups or alter production data without explicit authorization.

## Release acceptance

A Studio release is not a real merchant launch until the owner has replaced sample products, images and prices; verified inventory and delivery settings; reviewed customer-facing policies; and separately approved live payment/courier integrations. Demo checkout success alone is not proof of production fulfilment readiness.
