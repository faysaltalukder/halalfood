# Developer Guide — Focused Changes

## Golden rule

Start from the feature owner, not from the entire repository. Expand the inspection scope only when a direct dependency, API contract, database policy, or test proves it is necessary.

## Before changing code

1. Classify the task: presentation, feature logic, data access, server workflow, schema, security, or deployment.
2. Open the relevant row in [CODEBASE_MAP.md](CODEBASE_MAP.md).
3. Inspect the target function and its direct callers/callees.
4. Record the current behaviour and the user-visible invariants.
5. Decide the smallest set of files and tests required.

Do not re-read unrelated pages or Edge Functions unless a dependency is identified.

## Change-scope matrix

| Change | Normal scope | Expand scope when |
|---|---|---|
| Text or visual styling | One page + its stylesheet | Shared component or responsive rule is affected |
| Product rendering | Catalog service + affected renderer | Product link/SEO route, category filter, or search depends on it |
| Product save/edit | Admin catalog feature + data service | Schema, RLS, Storage or live catalog contract changes |
| Cart | Cart module | Product detail, checkout payload or persistence contract changes |
| Order submission | Checkout service + `order-sync` contract | Inventory, idempotency, fraud checks or Sheets backup changes |
| Order status | Order feature + server transition | Stock release, shipping, finance, tracking or status history changes |
| Provider integration | One provider adapter + its Edge Function | Shared auth, token storage, webhook or retry contract changes |
| Analytics event | Event registry + emitter + ingest | Consent, event ID, Meta/GA4 deduplication or privacy policy changes |
| Database schema | One migration + affected query/policy/tests | Foreign keys, triggers, RLS, views or downstream integrations depend on it |

## Stable coding conventions

- Use named modules and explicit exports for new code.
- Keep one source of truth for each business rule.
- Avoid creating globals; expose a small, documented compatibility bridge only when legacy pages require it.
- Keep DOM selection and event binding in the page/controller layer.
- Keep database queries in feature-scoped repositories/services.
- Keep input validation close to the boundary and repeat security-critical validation server-side.
- Use explicit return shapes and errors; do not silently swallow failed writes.
- Use stable, namespaced event names and idempotency keys.
- Prefer pagination and narrow `select(...)` lists; never fetch every column by default.
- Do not add an index without identifying the query it supports.
- Use comments to explain why a non-obvious decision exists, not to narrate each line.

## Server conventions

- Each function must validate method, origin where applicable, input shape, auth/authorization, and expected external provider response.
- Privileged actions must verify the user with Supabase Auth and enforce the required role/MFA claim server-side.
- Do not rely only on decoded, unverified JWT claims for identity. Verify the token with `auth.getUser(token)` for sensitive actions.
- Use a service-role client only inside server runtime; disable persistent session/refresh behaviour.
- Never return provider access tokens, encryption material, stack traces, or internal secrets.
- Use idempotency for orders, event delivery, provider sends, and publish operations where retry is possible.
- Keep webhook signature verification and replay protection separate from CORS. CORS is not authentication.

## Database change workflow

1. Inspect the exact current table, columns, constraints, triggers, policies, grants, and dependent functions.
2. Confirm whether the production schema has drifted from repository migrations.
3. Back up affected data and record a rollback/recovery plan.
4. Write a forward-only, descriptive migration with the narrowest change.
5. Verify RLS and grants for `anon`, `authenticated`, and server roles separately.
6. Test expected reads/writes and denied access paths.
7. Run Supabase advisors and verify query plans where relevant.
8. Update docs and generated DB types if the contract changed.

Never use a migration to perform a speculative cleanup. Never drop columns/tables/indexes/policies/functions/triggers without dependency and data review.

## Verification checklist

- [ ] Relevant JavaScript syntax checks pass.
- [ ] Relevant Edge Function type checks pass.
- [ ] Relevant feature tests pass.
- [ ] Existing HTML routes and static assets resolve.
- [ ] User-visible layout and responsive behaviour remain unchanged for internal refactors.
- [ ] Admin functions and permissions still work.
- [ ] API request/response contracts are unchanged.
- [ ] Security-sensitive requests are tested as allowed and denied.
- [ ] No secrets or customer information are committed.
- [ ] Git diff contains only scoped changes.
- [ ] Deployment is observed and smoke-tested before reporting completion.

## Git workflow

- Work on a dedicated branch.
- Make small commits with one purpose.
- Keep generated output and unrelated formatting out of the diff.
- Run checks before opening a PR.
- Merge only when checks pass and the diff is reviewed.
- Keep production deployments reversible.

## Useful commands

~~~bash
node scripts/repo-health.mjs
node --check js/cart.js
deno check supabase/functions/order-sync/index.ts
git diff --stat
git diff --check
~~~
