# WordPress Admin Launch Adapter

The WordPress/Grocery Builder is a separate application. Its source of truth is the `faysaltalukder/grocery-storefronts` repository under `wordpress-app/`.

- **Standalone application:** https://wordpress-studio.shipstatic.com/admin/
- **Standalone source:** https://github.com/faysaltalukder/grocery-storefronts/tree/main/wordpress-app
- **WordPress backend/auth:** its dedicated Neon project, Neon Data API and Neon Managed Auth.
- **Halal Food backend:** the existing Halal Food Supabase project. It is not used by WordPress.

## What is allowed in this repository

Only:
1. The WordPress navigation entry in `admin/shared.js`.
2. This minimal external-launch adapter page (`admin/wordpress.html`) for old bookmarks.

The navigation opens WordPress in a new tab. The adapter does not embed the WordPress runtime, call its API, exchange tokens or share cookies/session state.

## Strict boundary

Do not add WordPress renderer/editor code, template data, Neon clients, Neon migrations, WordPress customer/order data, WordPress credentials, or WordPress deployment workflows to this repository.

Do not pass Halal Food Supabase sessions/JWTs or credentials to WordPress. Do not use WordPress Neon as a Halal Food backend or fallback.

Do not disconnect Halal Food's existing APIs or its Neon Storage bridge as part of WordPress work; they remain Halal Food-owned services and are unrelated to the standalone WordPress application.

## Release rule

A WordPress release must not require a Halal Food commit, build, GitHub Pages deployment, Supabase migration or secret change. A Halal Food release must not require a WordPress build, Neon migration or deployment. If the external WordPress app is unavailable, only the WordPress section may show an unavailable state; all Halal Food site, checkout, admin and Supabase functions must continue.
