# Grocery Template Builder backend

This workspace is isolated from the existing Halal Food Supabase operations.

- Database schema: `builder`
- Neon Object Storage bucket: `grocery-builder-assets` (private)
- Neon Function slug: `groceryapi`
- Runtime: Node.js 24
- Admin identity: existing Supabase session, verified server-side through the project's JWKS endpoint; AAL2 is required.
- Frontend source: `../admin/wordpress-templates.html`, `../admin/wordpress-templates.css`, `../admin/wordpress-templates.js`

## Deploy from this folder

1. Install dependencies with `npm install`.
2. Link the Neon project and the intended branch using the Neon CLI.
3. Confirm the target branch before applying changes.
4. Apply the additive SQL in `migrations/001_grocery_builder.sql` if the schema is not already present.
5. Run `npm run deploy`.

The `neon.ts` declaration provisions the private bucket and deploys the function. Neon injects the branch database URL and bucket-scoped S3 credentials at runtime; do not put credentials in GitHub.

The current function is a protected admin API and does not yet publish public storefront domains. Publishing, customer checkout/payment integrations, and a general public multi-user sign-up flow are later milestones.
