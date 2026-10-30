# Behaviour-Preserving Refactoring Plan

## Goal

Make future changes local, discoverable and testable while preserving every current customer/admin experience and operational capability.

This is not a redesign, framework migration, database redesign, or feature reduction.

## Phase 0 — Establish the trustworthy baseline

- [x] Create a separate refactoring branch.
- [x] Inventory repository files and high-change hotspots.
- [x] Inventory active Edge Functions and production migration history.
- [x] Recover the three active function sources missing from GitHub.
- [ ] Reconcile production migrations with repository history.
- [ ] Capture a restorable production schema/data backup before schema changes.
- [ ] Run customer and admin visual/functional smoke tests and record screenshots/baselines.

## Phase 1 — Make the codebase easy to navigate

- [x] Add an architecture map.
- [x] Add a codebase ownership map.
- [x] Add data ownership and server contract notes.
- [x] Add a focused developer workflow.
- [ ] Add links from each major feature page to its owner module and tests.
- [ ] Add explicit module ownership for the admin monolith.

## Phase 2 — Create repeatable quality gates

- [x] Add a repository health script.
- [ ] Validate all existing JS/TS functions in CI.
- [ ] Add route/static-asset checks.
- [ ] Add integration tests for product save -> live catalog.
- [ ] Add order submit/idempotency/inventory tests.
- [ ] Add security allow/deny tests for every privileged endpoint.

## Phase 3 — Frontend modularization, one feature at a time

Order of work:
1. Catalog repository/service and live renderer.
2. Product detail and route lookup.
3. Cart state and persistence.
4. Checkout/order submission.
5. Account/customer profile.
6. Analytics/tracking.
7. Admin shared utilities.
8. Admin Orders, Catalog, Customers, Finance, Operations, Publishing, Messaging as independent feature modules.

For each extraction:
- Move one bounded responsibility.
- Preserve the current public interface or add a small compatibility adapter.
- Add tests before deleting the old implementation.
- Compare rendered output, event payloads and API requests.
- Remove duplicate code only after all callers have migrated.

## Phase 4 — Backend modularization

- Add tested shared server utilities for Supabase clients, CORS/HTTP responses, validation, logging and authorization.
- Migrate one Edge Function at a time.
- Keep each endpoint URL, method, auth requirement, request body, response body and provider semantics stable.
- Use a shared domain adapter only when at least two real functions need the same behaviour.
- Add deployment/version inventory and source checksum checks.

## Phase 5 — Database drift and security remediation

- Reconcile the 77 applied production migrations with repository source.
- Generate and review schema snapshots from the actual production database.
- Restore a clean-room database from the reconciled source before declaring reproducibility.
- Review all SECURITY DEFINER functions, grants, RLS policies, storage policies and secrets.
- Resolve advisor warnings one at a time with regression tests.
- Review indexes against query plans and production statistics; do not bulk-delete unused indexes.

## Phase 6 — Performance and scale

- Record page performance baselines before and after each extraction.
- Add query pagination to all unbounded admin lists.
- Confirm indexes for primary filters, joins and ordering.
- Add caching only with an explicit invalidation/refresh strategy.
- Keep Realtime subscriptions narrow and scoped.
- Run realistic load tests against a safe environment.

## Completion criteria

Refactoring is complete only when all of the following are true:

1. Customer-facing HTML/CSS/layouts and all current flows remain equivalent.
2. Admin sections and actions remain available with the same access controls.
3. All 16 active Edge Function sources are versioned in GitHub.
4. The production schema can be rebuilt from reviewed, reconciled migration history.
5. Feature ownership is explicit and a small task can be routed to a bounded module.
6. JavaScript syntax, server type checks, critical workflow tests and security checks run automatically.
7. No high-severity unresolved security finding remains without an accepted, documented reason.
8. Deployment and rollback steps are documented and tested.

## Current completion status

This branch has established the initial documentation and source-recovery foundation. It has not yet completed the full runtime modularization, production migration reconciliation, browser visual regression testing, or all security remediations. Those require controlled, feature-by-feature work and test evidence.
