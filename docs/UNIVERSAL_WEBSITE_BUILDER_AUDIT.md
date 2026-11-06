# WordPress Builder Separation Record

<badge>Superseded</badge>

This file is retained as a historical audit record only. Its earlier implementation notes describe a previous state in which WordPress/Grocery Builder code was embedded in the Halal Food repository. That implementation has been moved to the independent WordPress project.

## Current authoritative project

- **WordPress source:** https://github.com/faysaltalukder/grocery-storefronts/tree/main/wordpress-app
- **Independent WordPress application:** https://wordpress-studio.shipstatic.com/admin/
- **WordPress backend/auth:** dedicated Neon project, Neon Data API and Neon Managed Auth.
- **Halal Food:** remains in https://github.com/faysaltalukder/halalfood and uses only its own Supabase infrastructure for its own business operations.

## What remains in this repository

Only the small WordPress navigation link in `admin/shared.js`, the redirect adapter `admin/wordpress.html`, and this integration record. There is no WordPress renderer, editor, Neon API client, Neon migration, commerce runtime, customer/order data or WordPress deployment workflow here.

## Non-negotiable boundary

- Do not reintroduce WordPress business logic, assets, data-access code, Neon migrations or workflows into Halal Food.
- Do not pass Halal Food Supabase credentials, JWTs, sessions, cookies or user data to WordPress.
- Do not use the WordPress Neon project as a Halal Food backend or fallback.
- Do not disconnect Halal Food-owned APIs or its Neon Storage bridge as part of WordPress separation.
- WordPress and Halal Food must deploy, authenticate, store data and roll back independently. The Admin Panel link is the only allowed integration.

For current implementation details, tests and release rules, read the WordPress repository's `wordpress-app/WORDPRESS-BUILDER-ARCHITECTURE.md`.
