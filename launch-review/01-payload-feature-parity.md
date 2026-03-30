# PayloadCMS Feature Parity Review

## Synopsis

As of March 31, 2026, the latest Payload CMS release is `v3.80.0` published on March 20, 2026. Against that bar, `sveltekit-runelayer` is a credible SvelteKit-native CMS foundation, but it is not yet close to full Payload parity. The core skeleton is strong: schema-driven tables, Better Auth integration, local file storage, lifecycle hooks, Carbon-based admin UI, and host-managed migrations. The gap is that many Payload table-stakes features exist only as types or schema flags, not as runtime behavior: `where` filtering, access query constraints, validation enforcement, field-level access enforcement, localization, relationship population, version history, publish/unpublish, blocks, tabs, REST/GraphQL APIs, and a real rich text editor.

## Grade: 5.5/10

The implementation is solid for a first working version, but Payload parity is only partial. Runelayer already covers the primitives needed for a CMS package, yet several of the most important user-facing and security-relevant behaviors are still missing or only declared in types. That makes it useful for controlled host applications, but not yet equivalent to modern Payload CMS for content teams or production migrations.

## Main Body

### What Is Actually Implemented

Runelayer has a good base. Collections and globals are schema-driven, auth is wired through Better Auth, and the admin UI is already functional for list/create/edit flows. The runtime entry point in `packages/sveltekit-runelayer/src/sveltekit/runtime.ts` cleanly composes admin routing, auth checks, and loader/action dispatch. The split server/client entry points in `packages/sveltekit-runelayer/src/sveltekit/server.ts` and `packages/sveltekit-runelayer/src/sveltekit/components.ts` are also the right shape for SvelteKit package consumption.

At the data layer, `packages/sveltekit-runelayer/src/db/schema.ts` maps the schema into SQLite tables and already covers `versions` columns (`_status`, `_version`) and auth columns (`hash`, `salt`, `token`, `tokenExpiry`). The query layer in `packages/sveltekit-runelayer/src/query/operations.ts` supports CRUD plus lifecycle hooks and deny-by-default access checks.

The admin UI is not just a stub. `packages/sveltekit-runelayer/src/admin/components/CollectionList.svelte`, `CollectionEdit.svelte`, `UsersList.svelte`, `UserEdit.svelte`, `Dashboard.svelte`, and the shared layout/components give you a working admin experience with Carbon Svelte. The field renderer path is functional for simple fields, and the package already provides first-user bootstrap, user management, profile, and health views.

### What Is Partial Or Schema-Only

This is where parity drops. Several important Payload concepts exist in types or schema metadata, but the runtime does not use them.

`where` is the clearest example. `packages/sveltekit-runelayer/src/query/types.ts` advertises `FindArgs.where`, but `packages/sveltekit-runelayer/src/query/operations.ts` ignores it and always returns raw list queries. That means no real filtering, no query-based access control, and no meaningful search beyond client-side post-processing in the admin UI.

Validation is similar. `packages/sveltekit-runelayer/src/schema/types.ts` defines `ValidationFn`, field-level `access`, and rich field metadata, but `packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts` passes raw `FormData` into `query.create()` and `query.update()` without schema-aware validation or allowlisting. So the types describe a richer CMS than the runtime actually enforces.

Versioning is also only half there. The schema can create `_status` and `_version`, but there is no publish/unpublish workflow, no version history table, and no restore flow. In other words, the data model hints at drafts, but the behavior is absent.

Localization is in the same category. `localized?: boolean` exists on fields in `packages/sveltekit-runelayer/src/schema/fields.ts`, but there is no locale-aware storage, no locale parameter in the query API, and no admin locale switching.

### What Is Missing Entirely

Payload's most distinguishing CMS features are still absent:

- Query constraints from access functions. Runelayer access is boolean-only in `packages/sveltekit-runelayer/src/query/access.ts`, so row-level security patterns do not map cleanly.
- Relationship population. `packages/sveltekit-runelayer/src/admin/components/fields/RelationshipField.svelte` is just a document-ID text input, not a searchable relation picker with depth-controlled population.
- Block and tab layouts. `blocks` and `tabs` are not implemented, which limits complex content modeling.
- REST and GraphQL APIs. There is no public content API layer comparable to Payload's auto-generated endpoints.
- Real rich text editing. `packages/sveltekit-runelayer/src/admin/components/fields/RichTextField.svelte` is still a JSON textarea placeholder.
- Upload processing. `packages/sveltekit-runelayer/src/storage/handler.ts` and `serve.ts` handle local files, but there is no image resizing, focal point support, or cloud adapter story yet.
- Advanced Payload auth flows. Better Auth covers login/session basics, but there is no first-class forgot/reset-password UI or API-key style content access.

### Overall Parity Read

Runelayer is closer to a small, well-structured CMS kernel than to a full Payload v3 replacement. It gets the architecture right: clear module boundaries, SvelteKit-native wiring, host-managed migrations, and an admin UI that is already useful. But the parts that make Payload mature for real-world content teams are mostly the parts still missing: filtering, access constraints, validation, localization, versioning, block-based modeling, and public APIs.

The most important nuance is that the source often promises more than the runtime delivers. That is the main parity risk. For a first release, the code is coherent; for a migration story, it will feel incomplete until the schema-only features become enforced behavior.

## Action Items

### Critical

- Implement `where` translation in the query layer and thread it through admin list views. Without server-side filtering, the query API is too limited for real applications.
- Enforce field validation and field-level access during create/update/read flows. The current path in `packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts` trusts raw form data too much.
- Wire versioning into behavior, not just schema. Add publish/unpublish operations, history storage, and restore support for `versions`.
- Add locale-aware runtime support before advertising `localized` as a real feature. Right now it is schema metadata only.

### Medium

- Add relationship population with configurable `depth`. The current document-ID-only relationship UI is not Payload-like enough for production content models.
- Add query-constraint access returns so access functions can express row-level security instead of only allow/deny booleans.
- Replace the rich text textarea placeholder with an actual editor integration, or remove the field type from the parity story until it is real.
- Implement blocks and tabs. These are core CMS modeling primitives, not optional polish.
- Add public REST endpoints before claiming external-consumer parity with Payload.

### Low

- Add image processing and richer upload UX on top of the current local storage adapter.
- Add first-class forgot/reset-password UI for the Better Auth flows already supported underneath.
- Add type generation or schema-to-client helpers so consumers do not have to hand-cast query results.
- Add live preview and custom admin component hooks once the core data model is stable.

### Recommendation

- Market the package as a SvelteKit-native CMS foundation, not as Payload parity, until the missing runtime behaviors are implemented.
- Keep the docs explicit about what is schema-only versus actually enforced. That distinction is the main source of confusion in the current codebase.
- Prioritize `where`, validation, access constraints, and versioning before expanding the field surface. Those four changes move Runelayer from a useful prototype toward a credible CMS.
