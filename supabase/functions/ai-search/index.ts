import { buildAuthorizedContext } from '../_shared/context.ts'
import { fail, handleOptions, json, readJson } from '../_shared/http.ts'
import { recordAIRequestMetrics } from '../_shared/metrics.ts'
import { requireUser } from '../_shared/supabase.ts'

Deno.serve(async (request) => {
  const options = handleOptions(request)
  if (options) return options
  if (request.method !== 'POST') return fail(request, 405, 'Method not allowed.')

  let auth: Awaited<ReturnType<typeof requireUser>>
  try {
    auth = await requireUser(request)
  } catch {
    return fail(request, 401, 'Sign in to search campus information.', 'unauthorized')
  }

  const startedAt = Date.now()
  let usageConsumed = false
  let requestSucceeded = false
  try {
    const body = await readJson(request, 8000)
    const query = typeof body.query === 'string' ? body.query.trim() : ''
    if (query.length < 2 || query.length > 1000) return fail(request, 400, 'Enter a campus search up to 1,000 characters.', 'invalid_query')
    const usage = await auth.client.rpc('consume_ai_usage', { target_feature: 'search', max_requests: 60 })
    if (usage.error) return fail(request, 503, 'AI setup is incomplete. Apply the Phase 7 database migration.', 'ai_setup_incomplete')
    if (usage.data !== true) return fail(request, 429, "You've reached your AI usage limit for now. Please try again later.", 'rate_limited')
    usageConsumed = true

    const result = await buildAuthorizedContext(auth.client, auth.user, { prompt: query, mode: 'campus' })
    requestSucceeded = true
    return json(request, {
      sources: result.sources.slice(0, 8).map(({ content: _content, ...source }) => source),
      knowledgeType: result.sources.length ? 'verified_campus_sources' : 'no_verified_campus_sources',
    })
  } catch {
    return fail(request, 503, 'Campus search is temporarily unavailable. Please try again.', 'search_unavailable')
  } finally {
    if (usageConsumed) await recordAIRequestMetrics(auth.client, 'search', startedAt, !requestSucceeded)
  }
})
