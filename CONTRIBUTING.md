# Contributing to Halal Food

## Non-negotiable compatibility rule

Code organization may change; customer experience and operational behavior must not change unintentionally. Preserve public routes, UI, admin capabilities, API contracts, order and inventory semantics, tracking event names and integration endpoints.

## Before a change

1. Read `docs/ARCHITECTURE.md` and `docs/AI_WORKFLOW.md`.
2. Identify the owning feature and direct dependencies.
3. Inspect current production function source if changing an Edge Function.
4. Inspect relevant database schema, RLS and migrations if changing data access.
5. Write down expected behavior and regression checks.

## While changing code

- Keep changes small and scoped.
- Do not commit secrets, access tokens, customer information or production data.
- Do not change production database history manually.
- Do not change RLS, SECURITY DEFINER grants, Auth configuration or Edge Function JWT verification without reviewing every caller.
- Do not deploy a function from a local draft if its current Production source has not been compared.
- Prefer backwards-compatible additive changes.

## Before merge/deploy

- Run repository quality checks and relevant feature tests.
- Review the full diff for unrelated changes and accidental UI changes.
- Confirm the deployed environment and rollback commit.
- Verify the real customer/admin journey after deployment.
- Update the architecture/feature map if ownership or contracts changed.

## Pull request checklist

- [ ] User-visible behavior is intentionally unchanged (or explicitly described).
- [ ] Related API and database contracts are preserved.
- [ ] Security and authorization paths have been reviewed.
- [ ] Tests and checks pass.
- [ ] No secrets or production data are included.
- [ ] Rollback path is known.
