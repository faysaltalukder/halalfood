# Supabase Edge Function Inventory

Production snapshot: 2026-10-31  
Project ref: `qfwvrcfkrsydycbfjsxf`

All 16 active Production functions now have a corresponding repository folder after this recovery branch restores three deployed entrypoints.

| Function | Production version | Repository path |
|---|---:|---|
| order-sync | 69 | `supabase/functions/order-sync/index.ts` |
| order-track | 54 | `supabase/functions/order-track/index.ts` |
| analytics-ingest | 66 | `supabase/functions/analytics-ingest/index.ts` |
| courier-integration | 76 | `supabase/functions/courier-integration/index.ts` |
| whatsapp-webhook | 37 | `supabase/functions/whatsapp-webhook/index.ts` |
| whatsapp-send | 38 | `supabase/functions/whatsapp-send/index.ts` |
| messenger-webhook | 29 | `supabase/functions/messenger-webhook/index.ts` |
| messenger-send | 28 | `supabase/functions/messenger-send/index.ts` |
| facebook-publishing | 22 | `supabase/functions/facebook-publishing/index.ts` |
| youtube-publishing | 20 | `supabase/functions/youtube-publishing/index.ts` |
| meta-ads-review | 12 | `supabase/functions/meta-ads-review/index.ts` |
| post-dispatcher | 11 | `supabase/functions/post-dispatcher/index.ts` |
| site-publisher | 19 | `supabase/functions/site-publisher/index.ts` |
| order-security-admin | 3 | `supabase/functions/order-security-admin/index.ts` |
| courier-fraud-check | 11 | `supabase/functions/courier-fraud-check/index.ts` |
| incomplete-checkout | 3 | `supabase/functions/incomplete-checkout/index.ts` |

## Recovery provenance

The following three files were copied from the currently deployed Supabase function source, without intentional logic edits:

| Function | Production version | Source SHA-256 |
|---|---:|---|
| order-track | 54 | `a1d23e319b851f25685a6342cefa3fc011c69029a7a7d8947c33d8e04bc4eb8d` |
| youtube-publishing | 19 | `ea8373629311540fff4baf7025b031969d378dcd728e42c0cb12af67001bb7cd` |
| meta-ads-review | 12 | `d80505293d747c6ecb9ca7efa84c05af399fc60bf3393f5980f06ee09cee2804` |

These hashes are the source digests reported by Supabase for the deployed entrypoint at retrieval time. Preserve this provenance when later refactoring.

## Rules

- A Production function update must first be retrieved and compared with Git.
- Deployments must use repository source, not an untracked dashboard-only edit.
- Keep function names and public URLs stable.
- Verify the deployed version and smoke-test the exact action after deployment.
- Keep service-role keys, OAuth secrets and encryption keys out of Git.
