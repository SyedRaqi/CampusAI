# Phase 11 — Stabilization and deployment readiness

## Readiness decision

**Status: not production-ready / backend deployment unverified.** The repository contains the Phase 1–10 application and backend definitions, but local checks cannot establish the state of a live Supabase project. The Phase 11 migration is not applied by this code change. Do not deploy until the database, authorization, storage, realtime, Edge Functions, environment, and hosting checks below have been completed in a staging project.

## Implementation inventory

| Area | Repository evidence | Status |
| --- | --- | --- |
| Authentication and roles | Supabase Auth, USN-to-email sign-in, profiles, protected routes, and role-gated dashboards are implemented. Signup inserts student-only profiles. | Implemented in code; live auth and role behavior unverified |
| Core campus features | Events and QR registrations, resources, internships and career profiles, clubs, project teams, chat, notifications, and support have UI/service/schema code. | Implemented in code; cross-account and live integration tests unverified |
| Academic operations | Phase 8 migration and academic pages/services define schedules, attendance, and related operations. | Present in repository; migration/application and end-to-end behavior unverified |
| AI workspace | Authenticated Edge Functions implement chat/search/generation, shared provider and context helpers, usage metrics, and owner-scoped AI records. | Implemented in code; provider, function deployment, limits, and RAG behavior unverified |
| Campus support | Phase 9 schema, policies, services, and setup notes are present. | Implemented in code; live RLS, Storage, and workflow unverified |
| Search, notifications, announcements, analytics | Phase 10 UI/services and a timestamped migration are present. The migration contains search, notification preferences, announcement audience/acknowledgement rules, analytics, private attachment policies, and notification Realtime setup. | Implemented in code; migration and workflows unverified against Supabase |
| Database baseline | `supabase/schema.sql` contains the core schema and policies. It is separate from the versioned phase migrations. | Must be accounted for before applying phase migrations to a new project |
| Hosting | Vite production build is configured. No deployment target or hosting manifest is present at the project root. | Platform-specific deployment and domain configuration unverified |
| Automated tests | `package.json` provides build and lint scripts but no test command; no test files were found under `src/` or `supabase/`. | Missing; high-value workflows remain manual-test gates |

## Security audit and fixes made

| Finding | Risk | Disposition |
| --- | --- | --- |
| The `profiles_update_self` RLS policy constrained the row owner but did not constrain changes to `role`. A signed-in user could therefore attempt to promote their own profile to faculty/admin. | **Critical privilege escalation** | Fixed in the canonical schema and the additive Phase 11 migration with a `BEFORE UPDATE OF role` trigger. The trigger rejects role changes from non-admin authenticated sessions; the existing RLS policy still applies. Service-role provisioning remains possible. Apply `202610110001_phase11_profile_role_security.sql` before considering the live database protected. |
| The core schema defined private conversation Realtime policies and the frontend subscribed to message inserts, but the schema did not add `public.messages` to `supabase_realtime`. | Chat message subscriptions may not deliver on a fresh setup unless manually enabled in the Dashboard. | Added an idempotent publication membership check to the core schema and Phase 11 migration. Confirm the table is in the live publication and verify with two authorized accounts. |
| The unused `usn-auth` scaffold had `verify_jwt = false` and an embedded publishable-key example. | The scaffold was unnecessarily callable without a user JWT and included a project-specific-looking public key in sample code. | Enabled JWT verification in `supabase/config.toml` and replaced the sample value with a placeholder. The function itself is not used by the frontend; do not deploy it as an authentication implementation. |
| The configured AI functions use JWT verification and the handlers additionally call Supabase Auth `getUser`; the AI provider key is read server-side. | Exposed-key risk is reduced in source, but deployed secrets and gateway settings cannot be inspected here. | Static configuration looks correct for `ai-chat`, `ai-generate`, `ai-search`, and `ai-embed-resource`; verify deployed settings and secrets in Supabase. |
| RLS and private Storage policies are defined across the base schema and phase migrations. | Static review cannot prove live policy state, ownership behavior, or that each migration was applied once and in order. | Staging tests required. Do not use a service-role key in the browser. |

## Environment and migration gates

- Browser configuration requires `VITE_SUPABASE_URL` and a publishable/anon key. These values are designed for browser use; protect data with RLS.
- `AI_PROVIDER_API_KEY` and any other provider credentials must exist only as Supabase Edge Function secrets. Never use a `VITE_` prefix for server credentials.
- `.env.local` is ignored by the project `.gitignore`; keep it out of commits and issue attachments.
- For a new, empty database, establish the core baseline in `supabase/schema.sql` once, then apply the timestamped migrations in order. The baseline is not itself in `supabase/migrations/`; `supabase db push` alone must not be assumed to establish it.
- For an existing database, first inspect migration history and schema, back up the project, and validate a staged plan. Do not blindly rerun `schema.sql`.
- Apply the Phase 11 migration after the existing base schema and prior phase migrations. Check that `profiles_prevent_role_escalation` exists and that `messages` is in the `supabase_realtime` publication.
- Configure provider secrets and exact allowed browser origins, deploy only intended functions, and verify JWT enforcement for every personalized endpoint.
- No Supabase project was queried or modified during this audit. Live RLS, Storage, Realtime, database migrations, Edge Function deployment, scheduled publishing, provider credentials, and production hosting remain **unverified**.

## Validation performed

| Check | Result |
| --- | --- |
| Repository/source inspection | Completed for authentication, role routes, Edge Function auth/config, AI handler patterns, RLS/Storage definitions, Phase 10 Realtime publication setup, package scripts, and deployment manifests |
| `npm run build` | Passed (`tsc -b` and Vite production build); Vite reports a 576 kB main JavaScript chunk, so bundle-performance review remains open |
| `npm run lint` | Passed with 11 existing React effect/dependency warnings; the unused scaffold parameter warning was fixed |
| SQL migration execution | Not run; requires a database connection or local Supabase stack and is not implied by source inspection |
| Browser, accessibility, performance, cross-role, and two-account integration testing | Not run |
| Production deployment | Not performed |

## Staging verification checklist

- [ ] Confirm core schema and all phase migrations are applied in order; record migration versions.
- [ ] Verify a student cannot change their own role to faculty/admin through the Supabase client; verify legitimate operator provisioning still works.
- [ ] Verify student, faculty, and admin routes and data access using separate accounts; verify a user cannot read another user's AI conversations, plans, saved outputs, or private files.
- [ ] Verify private Storage object access for chat, AI uploads, support, resumes, and announcement attachments using allowed and denied accounts.
- [ ] Verify `messages` and `notifications` publication membership and test subscriptions, presence, typing, and cleanup with two accounts.
- [ ] Test every deployed Edge Function with a valid session, no session, a malformed request, and a request that exceeds its documented limits.
- [ ] Verify provider secrets are configured only in Edge Function secrets and browser network requests never call the provider directly.
- [ ] Test AI citations against available sources, unavailable-source behavior, prompt-injection handling, usage limits, feedback, and failure responses.
- [ ] Check scheduled announcement publishing, notification preferences, analytics authorization, and audit-log visibility.
- [ ] Run responsive, keyboard-only, screen-reader, and production-build smoke tests on the chosen hosting platform.
- [ ] Set production environment variables and allowed origins; confirm HTTPS, SPA fallback routing, rollback procedure, backups, and monitoring.
