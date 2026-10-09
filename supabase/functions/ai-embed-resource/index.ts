import { fail, handleOptions, json, readJson } from '../_shared/http.ts'
import { recordAIRequestMetrics } from '../_shared/metrics.ts'
import { createEmbedding } from '../_shared/provider.ts'
import { requireAdmin, requireUser } from '../_shared/supabase.ts'

type IndexableType = 'resource' | 'faq' | 'event' | 'internship' | 'club'

function splitIntoChunks(content: string): string[] {
  const normalized = content.split(String.fromCharCode(0)).join('').replace(/\r\n?/g, '\n').trim()
  const paragraphs = normalized.split(/\n{2,}/).map((part) => part.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const chunks: string[] = []
  let current = ''
  for (const paragraph of paragraphs) {
    const sentences = paragraph.length > 4500 ? paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [paragraph] : [paragraph]
    for (const sentence of sentences) {
      const next = `${current}${current ? '\n\n' : ''}${sentence.trim()}`
      if (next.length > 4500 && current) {
        chunks.push(current)
        current = sentence.trim()
      } else current = next
    }
    if (current.length >= 3800) {
      chunks.push(current)
      current = ''
    }
  }
  if (current) chunks.push(current)
  return chunks.filter((chunk) => chunk.length > 0).slice(0, 40)
}

Deno.serve(async (request) => {
  const options = handleOptions(request)
  if (options) return options
  if (request.method !== 'POST') return fail(request, 405, 'Method not allowed.')

  let auth: Awaited<ReturnType<typeof requireUser>>
  try {
    auth = await requireUser(request)
  } catch {
    return fail(request, 401, 'Sign in to index a campus resource.', 'unauthorized')
  }

  const startedAt = Date.now()
  let usageConsumed = false
  let requestSucceeded = false
  try {
    if (!await requireAdmin(auth.client)) return fail(request, 403, 'Only campus administrators can index AI resources.', 'forbidden')
    const body = await readJson(request, 64_000)
    const sourceType = body.source_type
    const sourceId = typeof body.source_id === 'string' ? body.source_id : ''
    const suppliedContent = typeof body.content === 'string' ? body.content : ''
    if (!['resource', 'faq', 'event', 'internship', 'club'].includes(String(sourceType)) || !/^[0-9a-f-]{36}$/i.test(sourceId)) {
      return fail(request, 400, 'Choose a valid published source.', 'invalid_source')
    }
    if (suppliedContent.length > 48_000) return fail(request, 413, 'Source text must be 48,000 characters or less.', 'content_too_large')
    const usage = await auth.client.rpc('consume_ai_usage', { target_feature: 'embedding', max_requests: 10 })
    if (usage.error) return fail(request, 503, 'AI setup is incomplete. Apply the Phase 7 database migration.', 'ai_setup_incomplete')
    if (usage.data !== true) return fail(request, 429, "You've reached your AI indexing limit for now. Please try again later.", 'rate_limited')
    usageConsumed = true

    let title = ''
    let sourceContent = ''
    const kind = sourceType as IndexableType
    if (kind === 'resource') {
      const { data } = await auth.client.from('resources').select('id,title,description,status').eq('id', sourceId).eq('status', 'published').maybeSingle()
      if (!data) return fail(request, 404, 'Published resource not found.', 'source_not_found')
      title = data.title
      sourceContent = `${data.title}\n\n${data.description ?? ''}\n\n${suppliedContent}`
    } else if (kind === 'faq') {
      const { data } = await auth.client.from('campus_faqs').select('id,question,answer,status').eq('id', sourceId).eq('status', 'published').maybeSingle()
      if (!data) return fail(request, 404, 'Published FAQ not found.', 'source_not_found')
      title = data.question
      sourceContent = `${data.question}\n\n${data.answer}\n\n${suppliedContent}`
    } else if (kind === 'event') {
      const { data } = await auth.client.from('events').select('id,title,short_description,description,event_date,venue,status').eq('id', sourceId).eq('status', 'published').maybeSingle()
      if (!data) return fail(request, 404, 'Published event not found.', 'source_not_found')
      title = data.title
      sourceContent = `${data.title}\n\n${data.short_description ?? ''}\n${data.description ?? ''}\nDate: ${data.event_date}; Venue: ${data.venue}\n\n${suppliedContent}`
    } else if (kind === 'internship') {
      const { data } = await auth.client.from('internships').select('id,role_title,short_description,description,location,work_mode,skills,status').eq('id', sourceId).eq('status', 'published').maybeSingle()
      if (!data) return fail(request, 404, 'Published internship not found.', 'source_not_found')
      title = data.role_title
      sourceContent = `${data.role_title}\n\n${data.short_description ?? ''}\n${data.description ?? ''}\nLocation: ${data.location}; Work mode: ${data.work_mode}; Skills: ${(data.skills ?? []).join(', ')}\n\n${suppliedContent}`
    } else {
      const { data } = await auth.client.from('clubs').select('id,name,description,category,meeting_schedule,location,status').eq('id', sourceId).eq('status', 'active').maybeSingle()
      if (!data) return fail(request, 404, 'Active club not found.', 'source_not_found')
      title = data.name
      sourceContent = `${data.name}\n\n${data.description}\nCategory: ${data.category}; meeting schedule: ${data.meeting_schedule ?? 'not specified'}; location: ${data.location ?? 'not specified'}\n\n${suppliedContent}`
    }

    const chunks = splitIntoChunks(sourceContent)
    if (!chunks.length) return fail(request, 400, 'This source does not contain any indexable text.', 'empty_source')
    const embeddings = await Promise.all(chunks.map((chunk) => createEmbedding(chunk)))
    const { data: existing, error: lookupError } = await auth.client.from('ai_documents')
      .select('id').eq('source_type', kind).eq('source_id', sourceId)
    if (lookupError) return fail(request, 503, 'Unable to update the AI resource index.', 'index_failed')
    if (existing?.length) {
      const { error: deleteError } = await auth.client.from('ai_documents').delete().in('id', existing.map((document) => document.id))
      if (deleteError) return fail(request, 503, 'Unable to update the AI resource index.', 'index_failed')
    }
    const { data: document, error: documentError } = await auth.client.from('ai_documents').insert({
      source_type: kind,
      source_id: sourceId,
      title: title.slice(0, 300),
      content: sourceContent.slice(0, 48_000),
      metadata: { indexed_by: auth.user.id },
      access_scope: 'public',
    }).select('id').single()
    if (documentError || !document) return fail(request, 503, 'Unable to save the AI resource index.', 'index_failed')
    const { error: chunkError } = await auth.client.from('ai_document_chunks').insert(chunks.map((content, index) => ({
      document_id: document.id,
      chunk_index: index,
      content,
      metadata: { source_type: kind, source_id: sourceId },
      embedding: `[${embeddings[index].join(',')}]`,
    })))
    if (chunkError) {
      await auth.client.from('ai_documents').delete().eq('id', document.id)
      return fail(request, 503, 'Unable to save the AI resource index.', 'index_failed')
    }
    await auth.client.rpc('record_ai_usage_tokens', { target_feature: 'embedding', token_count: 0 })
    requestSucceeded = true
    return json(request, { indexed: true, source_type: kind, source_id: sourceId, chunks: chunks.length })
  } catch {
    return fail(request, 503, 'Resource indexing is temporarily unavailable. Please try again.', 'index_unavailable')
  } finally {
    if (usageConsumed) await recordAIRequestMetrics(auth.client, 'embedding', startedAt, !requestSucceeded)
  }
})
