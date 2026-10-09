# CampusConnect AI setup

Phase 7 AI calls are made by authenticated Supabase Edge Functions. The AI provider key is never a Vite variable and must only be stored as a Supabase Edge Function secret.

## Required configuration

Browser environment (`.env.local`, based on `.env.example`):

```dotenv
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-publishable-or-anon-key
```

Supabase Edge Function secrets:

| Secret | Required | Default / purpose |
| --- | --- | --- |
| `AI_PROVIDER_API_KEY` | Yes for generation and semantic embeddings | Secret API credential for an OpenAI-compatible provider |
| `AI_PROVIDER_BASE_URL` | No | `https://api.openai.com/v1`; use an HTTPS OpenAI-compatible endpoint |
| `AI_CHAT_MODEL` | No | `gpt-4o-mini` |
| `AI_EMBEDDING_MODEL` | No | `text-embedding-3-small` |
| `AI_EMBEDDING_DIMENSIONS` | No | `1536`; must match both the selected embedding model and the migration's `vector(1536)` columns |
| `AI_ALLOWED_ORIGINS` | Recommended | Comma-separated exact browser origins, for example `https://campus.example.edu,http://localhost:5173` |

Never put `AI_PROVIDER_API_KEY` in `.env.local`, `VITE_*`, source code, or Git. The app still builds and non-AI campus features work when the provider secret is absent; AI endpoints return a friendly unavailable response.

## Supabase Dashboard setup

1. Open **Database → Extensions**, find `vector` (pgvector), and enable it. If the extension already exists in the `extensions` schema, do not create a duplicate.
2. Open **SQL Editor** and apply migrations in timestamp order. If the Phase 7 migration has not been applied, run [`supabase/migrations/202610060001_phase7_ai.sql`](../supabase/migrations/202610060001_phase7_ai.sql) first. Then run [`supabase/migrations/202610070001_phase7_ai_enhancements.sql`](../supabase/migrations/202610070001_phase7_ai_enhancements.sql), followed by [`supabase/migrations/202610080001_phase7_completion.sql`](../supabase/migrations/202610080001_phase7_completion.sql). Do not rerun the first migration if its policies already exist.
3. In **Project Settings → Edge Functions → Secrets** (or **Edge Functions → Secrets**, depending on the Dashboard layout), add `AI_PROVIDER_API_KEY`. Add any optional model, origin, or compatible endpoint secrets from the table above. Do not prefix these with `VITE_`.
4. Deploy the Edge Functions from this repository with the Supabase CLI steps below. The functions share local modules under `supabase/functions/_shared`, so deploying only a copied entrypoint from the Dashboard editor will not include those modules.
5. Confirm `ai-chat`, `ai-generate`, `ai-search`, and `ai-embed-resource` show as deployed with JWT verification enabled. The matching `supabase/config.toml` entries set `verify_jwt = true`; each function also verifies the caller through Supabase Auth.
6. For RAG results, an administrator must call `ai-embed-resource` with a published source ID. Supported published sources are resources, FAQs, events, internships, and active clubs. The optional `content` property may contain text extracted and reviewed by an administrator from the corresponding resource file (up to 48,000 characters). The function validates publication status, chunks at paragraph/sentence boundaries, creates 1536-dimensional vectors, and stores only indexable public campus content. No Storage bucket or storage policy is added by this phase.
7. Create a test student account and verify its `/ai` workspace. Then use two accounts to verify conversations, plans, quizzes, and roadmaps are owner-scoped. Test admin analytics and FAQ publication using an admin account.

The latest migration provisions a private `ai-uploads` Storage bucket, owner-folder policies, and aggregate response/error/feedback metrics. The summary form currently accepts UTF-8 `.txt` and `.md` files up to 256 KB; content is extracted server-side, capped at 12,000 characters, treated as untrusted text, and the temporary object is removed after processing. Binary documents such as PDF and DOCX are not accepted; this avoids pretending to scan or safely parse unsupported formats. Plain text and Markdown cannot execute active document content, but the AI summary is still generated output and should be verified.

The initial Dashboard SQL migration creates policies and should be run only once. The follow-up enhancement migration adds private saved AI content and club-aware RAG authorization. For ongoing production changes, use versioned migrations and the CLI workflow below.

## Supabase CLI setup and deployment

Install the Supabase CLI using the [official Supabase CLI instructions](https://supabase.com/docs/guides/cli). From the `campusconnect` project directory:

```powershell
supabase login
supabase link --project-ref your-project-id
supabase db push
supabase secrets set AI_PROVIDER_API_KEY=your-provider-key
supabase secrets set AI_CHAT_MODEL=gpt-4o-mini AI_EMBEDDING_MODEL=text-embedding-3-small AI_EMBEDDING_DIMENSIONS=1536
supabase secrets set AI_ALLOWED_ORIGINS=https://your-campus-domain.example,http://localhost:5173
supabase functions deploy ai-chat
supabase functions deploy ai-generate
supabase functions deploy ai-search
supabase functions deploy ai-embed-resource
```

Use a secrets manager or a secure terminal session when entering provider credentials. Do not place a real key in shell history, a command file, or checked-in configuration. `supabase db push` applies pending SQL migrations, including the Phase 7 migration; the Dashboard SQL Editor is an alternative for the initial database setup.

For local development, start the Supabase stack and set secrets for local functions:

```powershell
supabase start
supabase secrets set --env-file .env.functions.local
supabase functions serve --env-file .env.functions.local
```

Keep `.env.functions.local` out of source control and include only server-side secrets there. Vite uses `.env.local` for the public Supabase URL and publishable/anon key.

## Endpoint smoke checks

From a signed-in browser session, the client invokes the functions through `supabase.functions.invoke`. Check the browser Network panel to confirm requests target the project's `/functions/v1/` endpoint and do not call the AI provider directly.

```ts
await supabase.functions.invoke('ai-chat', { body: { prompt: 'Explain database normalization', mode: 'study' } })
await supabase.functions.invoke('ai-search', { body: { query: 'resources about operating systems' } })
await supabase.functions.invoke('ai-generate', {
  body: { feature: 'summary', input: { content: 'Paste a short test passage', summary_style: 'brief' } },
})
```

To test indexing, authenticate as an administrator and invoke `ai-embed-resource` with `source_type`, `source_id` for a published resource, and optionally reviewed extracted text in `content`. To test authorization, repeat a call with no session and confirm it returns `401`, then attempt to load another user's database rows using the browser client and confirm RLS returns no rows.

## RAG and data boundaries

The Phase 7 migration uses `extensions.vector(1536)` and an HNSW cosine-distance index. The configured default embedding model, `text-embedding-3-small`, is requested with 1536 dimensions. If changing the embedding model or dimensions, prepare a database migration to change/rebuild both vector columns and the index at the same time; do not set a different `AI_EMBEDDING_DIMENSIONS` value against this schema.

Semantic matches are permission checked by `can_read_ai_document`; published source records are revalidated when indexed. The indexer currently supports published resources, FAQs, events, internships, and active clubs. It does not extract arbitrary uploaded documents, private resumes, or private team data. The chat and tools can summarize pasted text; adding secure file extraction requires a separately reviewed Storage bucket/policy and a malware/content validation pipeline.

The project assistant can receive a selected project-team ID from a team page. The Edge Function checks the caller's active team membership (or ownership) before adding project details; task context is limited to active members, consistent with the task-table RLS policy. Team data is not part of the shared semantic index. Quiz questions support multiple choice, true/false, short answer, or mixed types. Short answers are scored by case-insensitive exact match against the generated expected answer.

The admin page reports aggregate request, token, and daily active-user counts alongside the 30-day average response time, request error rate, and positive-feedback ratio. Quality analytics contain no prompt or conversation content and are available through an administrator-only RPC. Timing and error metrics begin accumulating after the completion migration and Edge Functions are deployed.
