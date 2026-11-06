# Filebase Secondary Storage Architecture

Status: Phase 1 implementation on the Website Studio feature branch (not production deployed).

## Responsibility boundaries

- Supabase remains the primary application backend: authentication, authorization, database, Edge Functions and business logic.
- Filebase is the private S3-compatible object store for heavy binary/static assets: images, video, audio, PDFs, fonts, CSS/JS/JSON bundles, ZIP archives and design exports.
- GitHub remains the canonical source-control and source-code history location. Executable application code must remain in its appropriate runtime/hosting deployment (GitHub Pages static app, Supabase Edge Functions, or a future compute host). Filebase is not a code execution environment.

## Upload path

1. The authenticated admin page uses the existing MFA-protected `HFAdminReady` session.
2. The browser invokes the `filebase-storage` Supabase Edge Function with its current user session.
3. The function validates the admin identity and `aal2`, enforces site/category/type/size constraints, and returns a short-lived pre-signed POST.
4. The browser sends file bytes directly to Filebase. Supabase does not proxy the bytes and Supabase Storage is not used.
5. Listing and download use the same function; private downloads use short-lived signed GET URLs. Delete is explicit and site-prefix scoped.

## Current API policy

- Site prefix: `sites/{siteSlug}/`; current Website Studio site: `halalfood`.
- Categories: `media`, `products`, `site-assets`, `documents`, `backups`.
- Single-request browser POST limit: 20 MiB. Larger files use multipart uploads up to 1 GiB, with 8 MiB parts and at most four concurrent part transfers in the first Media Library.
- MIME types are allowlisted by the deployed Edge Function. The Media Library UI must not widen that list independently.
- Signed upload/download and multipart-part URLs expire after 300 seconds.
- Multipart upload is used for files larger than 20 MiB; incomplete uploads are aborted on client-side failure where possible.
- Bucket stays private. No public bucket or permanent public file URLs are assumed.
- The authenticated admin Media Library can apply a bucket CORS rule restricted to `https://faysaltalukder.github.io` for `GET`, `POST`, `PUT` and `HEAD`; existing unrelated CORS rules are preserved. CORS only enables browser cross-origin requests and does not make the bucket public.

## Current limitations / follow-up

- Current bucket free-tier capacity must be checked in Filebase billing/usage; do not assume the quota remains unchanged.
- The first Media Library is site-scoped to `halalfood`; future sites need an authorized site registry and server-side membership checks before adding site slugs.
- The current Edge Function lists up to 100 objects per page. The first UI loads up to 50 and does not yet expose cursor pagination.
- File metadata is currently derived from object keys and S3 listing metadata; a durable database asset catalogue, deduplication, retention and orphan cleanup are later tasks.
- Website Builder image nodes still need a follow-up asset-key adapter so documents store stable object keys (not expiring signed URLs) and request fresh signed preview URLs when rendering.
- Keep source code and deployment manifests in GitHub. Use Filebase for bulky static assets and release bundles only; never dynamically execute uploaded scripts from the private bucket.
- Do not move existing live storefront images or rewrite existing URLs until an inventory, migration and rollback plan is reviewed.

## Acceptance checks

- Health check uses HeadBucket only.
- Uploads are direct browser-to-Filebase after the Edge Function signs a constrained POST.
- Admin operations require the authorized admin session and MFA assurance level 2.
- The client never receives Filebase access/secret keys.
- The client never calls Supabase Storage for these files.
- Existing production storefront, order flows and database schema remain unchanged.
