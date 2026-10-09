# CampusConnect AI

CampusConnect AI is a React 19, TypeScript, Vite, and Supabase application for campus operations, learning, careers, and student collaboration. It extends the existing Phases 1–10; it is not a separate chatbot application.

## Current capabilities

- Student, faculty, and administrator authentication, role-based dashboards, and protected routes
- Campus events, registrations, QR tickets, academic resources, internships, and career profiles
- Clubs, project teams, private chat, notifications, and campus support
- Academic operations, announcements, campus search, analytics, and audit logs
- An authenticated AI workspace for campus Q&A/search, study plans, quizzes, notes, summaries, career guidance, roadmaps, interview practice, and project planning

This inventory reflects code in the repository. It does not imply that a Supabase project, its migrations, Edge Functions, or production deployment have been configured or tested. See [the Phase 11 readiness report](./docs/PHASE11_READINESS.md) for verified checks and remaining deployment gates.

## Local development

Requirements: Node.js supported by the installed Vite version and npm.

```powershell
npm ci
Copy-Item .env.example .env.local
```

Set `VITE_SUPABASE_URL` and either `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY` in `.env.local`. These are browser-facing Supabase project settings; do not put a service-role key or AI provider key in a `VITE_*` variable. `.env.local` is ignored by Git.

```powershell
npm run dev
```

The app can be type-checked and production-built with `npm run build`; run the configured linter with `npm run lint`. There is currently no automated test script or test framework in `package.json`.

## Supabase setup and deployment

1. Create or select the intended Supabase project and take a backup before changing an existing database.
2. For a **new, empty** project, establish the baseline in [`supabase/schema.sql`](./supabase/schema.sql) once. Do not blindly reapply this baseline to an existing project; review its schema and migration history first.
3. Apply versioned SQL migrations in timestamp order from [`supabase/migrations/`](./supabase/migrations/). The Phase 11 security migration prevents self-service role escalation and adds chat messages to the Realtime publication.
4. Deploy the authenticated Edge Functions and configure AI credentials as Supabase Edge Function secrets. Follow [`docs/AI_SETUP.md`](./docs/AI_SETUP.md); never put the provider key in browser code or `.env.local`.
5. Verify authorization, RLS, Storage, Realtime, scheduled tasks, and the AI provider against a non-production project before production rollout.

Live project setup, migration state, and deployment status are not verified by a local build. Do not treat a successful frontend build as evidence that the Supabase backend is ready.

## Project structure

- `src/` — application UI, routes, contexts, and Supabase-backed services
- `supabase/schema.sql` — core schema and baseline policies
- `supabase/migrations/` — phased, versioned database changes
- `supabase/functions/` — Edge Function handlers and shared server-side AI utilities
- `docs/` — AI setup, phase setup guides, and readiness checklists

## Operational documentation

- [AI setup and Edge Function deployment](./docs/AI_SETUP.md)
- [Phase 11 inventory, security findings, and deployment gates](./docs/PHASE11_READINESS.md)
- [Campus support setup](./docs/CAMPUS_SUPPORT_SETUP.md)
