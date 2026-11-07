# Halal Food

Official website: https://faysaltalukder.github.io/halalfood/

Halal Food is an independent static HTML/CSS/JavaScript storefront with its own Supabase-backed admin and operational systems.

## Project boundaries

- **Source repository:** `faysaltalukder/halalfood`
- **Production website:** `https://faysaltalukder.github.io/halalfood/`
- **Primary backend:** Halal Food's Supabase project in `ap-southeast-1`
- **Order intake/backup:** the existing Google Apps Script / Google Sheets integration remains a secondary order-intake and backup path. Do not treat the spreadsheet as the authoritative admin database.
- **Admin:** Halal Food products, customers, orders, finance, POS, AI customer care, marketing and reports remain in this project.

## WordPress Studio is separate

The independent WordPress/Grocery Studio is maintained in `faysaltalukder/grocery-storefronts`, hosted at:

- Admin: https://wordpress-studio.shipstatic.com/admin/
- Central commerce: https://wordpress-studio.shipstatic.com/admin/commerce.html

It uses its own Neon database/authentication and deployment. It is not a Halal Food Supabase backend or a replacement for Halal Food. The old WordPress routes in this repository are compatibility redirects only.

## Safety rules

- Keep Halal Food Supabase, WordPress Studio Neon, hosting, authentication, secrets and deployments separate.
- Never copy database passwords, service-role keys, access tokens or private credentials into browser code or GitHub.
- Do not delete or rewrite production data, migrations, storage objects or order history without a verified backup and explicit approval.
- Prefer additive, reviewed migrations and feature branches with passing checks.
- Treat sample/demo data as non-fulfillable. Verify real product details, prices, stock and fulfilment configuration before accepting real sales.

## Development

The site is built with static HTML, CSS and vanilla JavaScript. There is no frontend build step. Before changing order intake, inspect both the Supabase-backed server workflow and the legacy Apps Script integration so that backup behavior is not accidentally removed.
