# Universal Website Builder — Phase 0 Repository Audit

Audit date: 2026-11-05  
Repository: `faysaltalukder/halalfood`  
Audit branch: `feature/universal-website-builder-foundation`  
Scope: source-code and architecture inspection only. No production storefront, database, secrets, or deployment changes were made.

## 1. Executive decision

Build a **site-agnostic, schema-driven visual website builder** as a separate product surface inside the existing admin workspace. Do not turn the current Halal Food storefront into the editor's data model, and do not rewrite the current static website or admin in a new framework as a first step.

The first implementation should be an isolated editor shell and a local, versioned page-document model. The live storefront remains unchanged until a later, separately approved integration milestone.

## 2. Verified current-state findings

### Existing application architecture
- The repository architecture map identifies the public site as static HTML, CSS and Vanilla JavaScript hosted on GitHub Pages.
- Supabase is the authoritative operational database. The existing architecture explicitly requires preserving current order, catalog, checkout, tracking, integrations, admin roles and data contracts.
- Admin pages use the existing shared admin shell, authentication readiness signal and MFA-verified session flow.
- The repository already has a CMS/content management module at `js/admin-cms.js`. It loads and manages products, categories and blog posts from existing tables. This is a catalog/content manager, not a general page-layout builder.
- The existing WordPress Studio route is `admin/wordpress-live.html`, with behavior in `admin/wordpress.js` and styling in `admin/wordpress.css`.
- The current WordPress Studio is a live-site preview workspace. It fetches same-site HTML, injects a preview bridge and renders it in an iframe using `srcdoc`. It has desktop/mobile preview controls, internal navigation history and diagnostics.
- Current Studio copy explicitly says that a Visual Builder will be added later. There is no verified general-purpose page schema, component registry, editable canvas, drag-and-drop layout engine, page revision system or publish pipeline in this route today.
- Existing admin navigation already contains a WordPress entry under the system/workspace navigation.

### Existing safety and quality constraints
- `docs/ARCHITECTURE.md` requires preserving existing public URLs, customer journeys, admin permissions, bilingual behavior, operational flows and integration contracts.
- `docs/SUPABASE_DRIFT_REGISTER.md` records a 2026-10-31 reconciliation warning: the repository migration files and remote production migration history do not align exactly. Its counts are a dated snapshot, not a current verified schema baseline.
- The architecture rules prohibit destructive database changes without a verified backup, row-count checks and rollback plan. Existing applied migrations must not be edited.
- The current admin has broad regression checks in `scripts/admin-phase12-check.mjs`; the WordPress Studio route is already included in those checks.
- The repository has no root `package.json` at the audited revision (GitHub returned 404). Therefore the initial editor should not assume an existing frontend bundler or component framework.

## 3. Main gaps between current Studio and the target platform

| Capability | Current verified state | Required platform capability |
|---|---|---|
| Live website preview | Present | Keep, but add isolated draft canvas |
| Desktop/mobile viewport | Present | Add tablet and independent responsive overrides |
| Click-to-select editing | Not verified | Selection, hover outline, keyboard navigation |
| Text/style/image inspector | Not present in current Studio | Typed property panels with validation |
| Drag-and-drop sections | Not present | Controlled component tree and legal drop zones |
| Page/document schema | Not verified | Versioned, framework-neutral JSON document |
| Reusable components | Not verified | Extensible component registry and block library |
| Site identity / multi-site scope | Current route is hardcoded to Halal Food URL | Site/workspace-scoped documents, assets, themes and permissions |
| Draft autosave | Not verified | Debounced save, dirty state, conflict handling |
| Revision history / rollback | Not verified | Immutable revisions and restore flow |
| Publish / preview isolation | Current preview reads live storefront HTML | Draft preview must never mutate live pages; explicit publish gate |
| Media library | Existing product/category image management only | Site-scoped asset library and safe metadata |
| Arbitrary external-site editing | Not supported | Import/adapter workflow only for sites the operator owns or is authorized to edit |

## 4. Architectural direction

### 4.1 Platform layers
1. **Builder shell** — editor layout, toolbars, navigation, panels and device controls.
2. **Document model** — versioned JSON page tree, page metadata and responsive/style tokens.
3. **Component registry** — approved, typed components with schemas, defaults, renderers, allowed children and editor controls.
4. **Canvas runtime** — renders the document, supports selection, overlays and controlled interactions.
5. **Inspector** — edits typed properties; does not directly mutate arbitrary HTML or inject unrestricted scripts.
6. **Asset service** — site-scoped media metadata and storage adapter.
7. **Persistence service** — drafts, autosave, revisions, optimistic concurrency and audit trail.
8. **Preview/publish service** — isolated draft preview and explicit, versioned publishing.
9. **Site adapter layer** — maps a site to its rendering/runtime integration, asset storage, routes and optional business-data bindings.

### 4.2 Canonical document model
Persist a framework-neutral JSON document rather than the generated HTML as the source of truth. Initial nodes should support:
- stable node ID and component type;
- typed props and content;
- ordered child nodes;
- style tokens and allowlisted style values;
- responsive overrides by breakpoint;
- optional data bindings to site-owned data;
- schema/document version and migration metadata.

The renderer may generate HTML/CSS for preview and publishing, but generated output is not the editable source of truth.

### 4.3 Multi-site boundaries
Every persisted builder resource must be scoped to a site/workspace, including pages, revisions, themes, media, component configuration and publish records. Site identity must not be inferred from a hardcoded Halal Food URL. A future site registry should own domains, route base, locale, renderer adapter and publishing target.

### 4.4 Protected business components
Cart, checkout, product availability, order submission, customer authentication, order tracking, payments, reviews, analytics and third-party integrations must be treated as protected functional components or adapters. The builder may control approved presentation properties, but must not silently replace their business logic.

### 4.5 Publishing safety
- Draft and published documents must be separate.
- Preview reads a draft revision and must not write to the live storefront.
- Publishing requires authorization, validation, a revision snapshot and an explicit confirmation.
- Publish should be atomic at the active-version pointer or equivalent release boundary.
- A previous published revision must be restorable.
- No live storefront integration is included in Phase 0 or the first editor-shell milestone.

## 5. Initial component model

Start with a small, general-purpose registry:
- Layout: Section, Container, Columns, Grid, Stack, Spacer, Divider.
- Content: Heading, Paragraph, Rich Text (restricted), Image, Video Embed (allowlisted), Icon, Button, Link.
- Commerce (later adapter-backed): Product Card, Product Grid, Category List, Cart Summary, Checkout Entry.
- Site chrome (later): Header, Navigation, Footer.

Each component definition must declare its property schema, default values, allowed child types, responsive properties, editor controls and renderer. Unknown component types must fail safely with a visible fallback, not execute arbitrary content.

## 6. Phase 1 implementation scope

Build only an isolated editor foundation:
- a new Universal Builder route/module, leaving the current preview route available;
- a polished three-panel editor shell (component/layer panel, canvas, inspector);
- desktop/tablet/mobile viewport controls;
- a local in-memory starter page document with Section, Container, Heading, Paragraph, Image and Button;
- click-to-select and property editing for text, background, width, padding, alignment and image source/fit;
- undo/redo for editor-session changes;
- a clear unsaved/draft indicator;
- a deterministic renderer and automated schema/component tests.

The first visual demonstration can use a neutral sample landing page, not the live Halal Food homepage. Do not connect publishing or production database writes in this phase.

## 7. Deferred until after Phase 1 proof

- Supabase schema changes and RLS policies;
- multi-tenant site registry and site provisioning;
- media upload/storage integration;
- drag-and-drop nesting and full layout constraints;
- real storefront page migration or dynamic rendering;
- custom domains, export, deployment adapters and third-party platform import;
- unrestricted custom CSS/JS or arbitrary HTML execution.

These require dedicated design, threat modeling, compatibility tests and approval. Before any database migration, refresh the production schema/migration reconciliation and verify backup/restore readiness.

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Editing breaks live commerce | Draft-only canvas; protected commerce adapters; no live writes |
| Builder becomes Halal Food-specific | Generic site/document/component contracts; site adapters |
| Arbitrary HTML/CSS creates XSS or layout instability | Typed schemas, allowlists, sanitization, CSP and no arbitrary script execution |
| Multi-site data leakage | Site-scoped authorization, RLS and server-side access checks |
| Large editor bundle slows admin | Lazy-load editor modules; no framework migration until measured |
| Responsive overrides become inconsistent | Explicit breakpoint model, inheritance rules and validation |
| Concurrent edits overwrite work | Revision IDs, optimistic concurrency and conflict UI |
| Publish cannot be rolled back | Immutable releases and atomic active-version switch |

## 9. Acceptance criteria for Phase 1

- Existing admin authentication and MFA gate remain intact.
- Existing WordPress preview route and storefront behavior remain unchanged.
- New editor route is isolated from live storefront data and does not publish.
- Selecting a component highlights exactly one node and exposes only that component's valid properties.
- Editing text, image presentation, container width, background and spacing updates the canvas predictably.
- Desktop/tablet/mobile viewport changes do not overwrite one another's breakpoint-specific values.
- Undo/redo restores the exact previous document state.
- Invalid document nodes/properties are rejected or safely normalized.
- Automated tests cover document validation, component registration, selection, property updates, responsive inheritance and undo/redo.
- No production database migration or live deployment is required for the first proof.

## 10. Audit conclusion

The repository has a useful starting point: a secure admin shell, a live preview workspace, existing CMS conventions and regression checks. It does **not** yet contain a universal visual builder. The safest route is to evolve the current WordPress Studio area into a separate, generic builder application while retaining the current live preview as a distinct tool.

## 11. Phase 1 foundation implementation status

Implemented on the isolated feature branch:
- `admin/website-builder.html`, `admin/website-builder.css` and `admin/website-builder.js` add a dedicated three-panel builder workspace.
- The builder waits for the existing MFA-protected `HFAdminReady` signal and reuses the current admin shell.
- A version-1 sample JSON document and controlled starter registry support Section, Container, Heading, Paragraph, Image and Button nodes.
- Canvas selection, layer selection, typed inspector fields, desktop/tablet/mobile viewport controls, undo/redo, browser-local draft autosave and JSON export are implemented.
- A dedicated entry link was added to the existing WordPress Studio preview. The existing live preview route remains separate.
- Local draft restoration validates node types, shape, nesting depth and child counts before rendering.
- `scripts/universal-builder-check.mjs` is wired into Architecture Quality Gate.

### Validation status at this audit revision
- JavaScript syntax and architecture guard: passed.
- Storefront checkout regression checks: passed.
- Customer Care chat regression checks: passed.
- Feature context map: passed.
- Universal Website Builder foundation contract checks: passed.
- Existing admin integrity gate reaches a pre-existing accessibility failure in `admin/ai-feedback.html` for controls `aifRating`, `aifStatus` and `aifReason`. This is outside this builder change and was already present in the base branch; it has not been altered as part of this scope.
- Supabase Edge Function type-check: passed.
- A real browser interaction pass is still required before calling the editor runtime verified.

**Phase 0 result:** source audit documented.  
**Phase 1 result:** isolated local-only editor foundation implemented; contract test passed.  
**Next gate:** browser QA of the builder, then improve document editing and add drag-and-drop only after the interaction model is verified.  
**Production impact:** none.  
**Database impact:** none.  
**Deployment:** none; work remains in draft PR #92.


## 10. Implementation update — isolated Website Studio partitions (2026-11-05)

The first sandbox workflow is now implemented on the feature branch:

- The System navigation label is **Website Studio**.
- Both Studio pages expose the same two partitions: **Live Website** and **Edit Website**.
- **Edit Website** remains the schema-driven sample editor. It saves a local draft and submits it to the review flow.
- **Live Website** now renders only the dashboard's Test Published Version. It no longer fetches, embeds, or links to the public storefront.
- Draft review supports Approve, followed by **Publish Test Version**. That action updates only the sandbox's published-version record and a bounded local version history (20 entries maximum).
- The legacy `admin/wordpress.html` route redirects to the sandbox Live Website page.
- The old production preview controllers were removed. The sandbox renderer emits a restricted document from the allowlisted component schema and places it in script-disabled, opaque-origin iframes.
- No production deployment token, GitHub Pages publishing action, production CMS write, storefront API request, Supabase data query, checkout, or payment permission is part of this workflow.

### Storage boundary caveat

The admin and public storefront currently share the same GitHub Pages origin. The sandbox therefore uses dedicated, namespaced browser-local storage keys rather than a separate browser origin. The current storefront code does not use these keys, and the sandbox controller does not read or write the storefront's existing data keys. This is a logical application boundary, not a hard browser-origin security boundary. A future stronger isolation milestone should move sandbox persistence and preview hosting to a separate origin before introducing shared drafts, team collaboration, or sensitive test data.

### Current limitations

- Drafts, approvals, Test Published Versions and history are local to one browser profile; they do not synchronize across devices or users.
- The editor still uses its sample document and six basic components. It does not import or modify the actual Halal Food homepage or inner pages.
- The preview is a safe rendering of the builder document, not a faithful simulation of the existing storefront's cart, checkout, products, or integrations.
- Browser-level QA against the feature branch remains required. CI checks are necessary but do not prove the complete interactive workflow in a real browser.
- Production publishing remains intentionally absent and must be designed as a separate, explicitly authorized release project.
