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

## Production source reconciliation

The Production source for `courier-integration` contained an additional REDX preflight check that was absent from GitHub. The deployed version validates the configured pickup store and delivery area against REDX Production lists before a live booking. That exact deployed entrypoint was recovered into Git; it was not redeployed.

| Function | Production version at review | Source SHA-256 |
|---|---:|---|
| order-track | 54 | `a1d23e319b851f25685a6342cefa3fc011c69029a7a7d8947c33d8e04bc4eb8d` |
| courier-integration | 76 | `1506cc9f88917c7e51df48770e4896283f912e1adfc5034d813b10a7371f9586` |
| youtube-publishing | 20 | `2bd736c1d57e54d05c38614d7d4da690752e5f75ee36ddf65b13c0818d1ef0f3` |
| meta-ads-review | 12 | `d80505293d747c6ecb9ca7efa84c05af399fc60bf3393f5980f06ee09cee2804` |

At the 2026-10-31 reconciliation check, the deployed `index.ts` source for all 16 active Edge Functions matched the corresponding `main` branch source exactly after recovering `courier-integration`. This is a content comparison of entrypoints; it does not compare environment secrets, remote dependencies or database state. Re-run the comparison after every production function change.

## Rules

- A Production function update must first be retrieved and compared with Git.
- Deployments must use repository source, not an untracked dashboard-only edit.
- Keep function names and public URLs stable.
- Verify the deployed version and smoke-test the exact action after deployment.
- Keep service-role keys, OAuth secrets and encryption keys out of Git.
