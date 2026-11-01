# Reusable Store Catalog

This repository contains a reusable catalog management interface and storefront bridge. Each website supplies its own public deployment configuration in \`js/store-config.js\`; the shared code reads categories and products from Supabase and renders the website navigation, category cards, category pages and product lists from that data.

## Configure another website

1. Copy these shared assets into the new website:
   - \`admin/categories.html\`
   - \`admin/categories.js\` and \`admin/categories.css\`
   - \`admin/shared.js\` and the shared admin shell assets it depends on
   - \`js/store-config.js\`, \`js/live-catalog.js\` and the current \`js/main.js\`
2. Apply the catalog migrations to the new Supabase project. The categories table must support \`parent_id\`, \`sort_order\`, visibility, image and SEO fields. The products table must support \`category_slug\`, \`sort_order\` and \`home_sort_order\`.
3. Ensure the three atomic ordering functions exist: \`admin_reorder_categories\`, \`admin_reorder_products\` and \`admin_reorder_home_products\`. Keep them SECURITY INVOKER and restricted to authenticated administrators through the project's existing RLS/MFA design.
4. Create/configure the public content storage bucket and its upload policies for category and product images.
5. Copy and edit \`js/store-config.js\` for the new website. Use the public publishable/anon key only. Never place a service-role or secret key in browser code.
6. Load \`store-config.js\` before the admin shared script and before \`main.js\`. The current main/catalog bridge also includes a compatibility loader for older pages that load the bridge directly.
7. Set the same catalog asset version on the homepage, category pages and product pages when releasing a new catalog engine.

## Store configuration

- \`storeId\`: human-readable deployment identifier.
- \`storeName\`: brand name used by generated category/product page titles.
- \`siteRoot\`: absolute website root URL ending with a slash.
- \`adminEmail\`: the admin identity used by the existing admin audit workflow.
- \`contact.whatsappNumber\`: international digits only, without a plus sign.
- \`supabase.url\` and \`supabase.publishableKey\`: the new site's Supabase project URL and public key.
- \`catalog.categoriesTable\` and \`catalog.productsTable\`: catalog table names.
- \`catalog.categoryPage\` and \`catalog.legacyCategoryPage\`: page URL templates; \`{slug}\` is replaced by the category slug.
- \`catalog.maxCategories\` and \`catalog.maxProducts\`: bounded paginated fetch limits.
- \`catalog.reorder*Rpc\`: names of the three atomic ordering functions.
- \`storage.publicContentBucket\`: the public bucket used for category/product images.

## Data ownership and multi-site boundary

This configuration makes the **same catalog code reusable across multiple independent websites**. The safe current deployment model is one Supabase project/database per website, with each website using its own \`store-config.js\`. That keeps catalog records and RLS boundaries isolated.

Pointing several websites at one shared Supabase project is a different multi-tenant architecture. Do not do that by changing only \`storeId\`: the current catalog tables and ordering RPCs do not apply a tenant filter. A shared database would first need a \`store_id\` on every catalog row, tenant-aware RLS policies, and tenant-scoped ordering RPCs. Those changes are intentionally not included in this reusable single-store configuration.

## Storefront synchronization contract

The catalog bridge uses the same ordered category tree for:
- desktop header category links;
- mobile drawer category links;
- footer category links;
- homepage Featured Category cards (name, URL, image and order);
- dynamic category landing-page child links and descendant product lists.

Category reordering is scoped to siblings with the same \`parent_id\`. Product reordering is scoped to the selected category; homepage product order is independent. All ordering saves use the configured atomic Supabase RPCs.
