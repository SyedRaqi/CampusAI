export type ChatTurn = { role: 'system' | 'user' | 'assistant'; content: string }
export type ProviderReply = { text: string; model: string; tokens: number }

export class AIProviderUnavailable extends Error {
  constructor() { super('AI is temporarily unavailable. Please try again.') }
}

function providerConfig() {
  const apiKey = Deno.env.get('AI_PROVIDER_API_KEY')
  if (!apiKey) throw new AIProviderUnavailable()
  const baseUrl = (Deno.env.get('AI_PROVIDER_BASE_URL') ?? 'https://api.openai.com/v1').replace(/\/+$/, '')
  if (!baseUrl.startsWith('https://') && !baseUrl.startsWith('http://localhost')) throw new AIProviderUnavailable()
  return { apiKey, baseUrl }
}

async function postProvider(path: string, payload: unknown): Promise<Record<string, unknown>> {
  const { apiKey, baseUrl } = providerConfig()
  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(45_000),
    })
  } catch {
    throw new AIProviderUnavailable()
  }
  if (!response.ok) throw new AIProviderUnavailable()
  try { return await response.json() as Record<string, unknown> } catch { throw new AIProviderUnavailable() }
}

export async function generateText(turns: ChatTurn[], options: { json?: boolean; maxTokens?: number } = {}): Promise<ProviderReply> {
  const model = Deno.env.get('AI_CHAT_MODEL') ?? 'gpt-4o-mini'
  const body: Record<string, unknown> = {
    model,
    messages: turns,
    max_tokens: Math.min(Math.max(options.maxTokens ?? 1200, 128), 3000),
    temperature: 0.35,
  }
  if (options.json) body.response_format = { type: 'json_object' }
  const data = await postProvider('/chat/completions', body)
  const choices = data.choices as Array<{ message?: { content?: unknown } }> | undefined
  const text = choices?.[0]?.message?.content
  if (typeof text !== 'string' || !text.trim() || text.length > 20_000) throw new AIProviderUnavailable()
  const usage = data.usage as { total_tokens?: number } | undefined
  return { text: text.trim(), model: String(data.model ?? model).slice(0, 120), tokens: Math.max(0, Math.min(usage?.total_tokens ?? 0, 100_000)) }
}

export async function createEmbedding(text: string): Promise<number[]> {
  if (!text.trim() || text.length > 12_000) throw new Error('Text is empty or too long to search.')
  const model = Deno.env.get('AI_EMBEDDING_MODEL') ?? 'text-embedding-3-small'
  const configuredDimensions = Number(Deno.env.get('AI_EMBEDDING_DIMENSIONS') ?? '1536')
  if (configuredDimensions !== 1536) throw new Error('Embedding model dimensions do not match the database. Configure 1536 dimensions.')
  const data = await postProvider('/embeddings', { model, input: text.slice(0, 12_000), dimensions: 1536 })
  const rows = data.data as Array<{ embedding?: unknown }> | undefined
  const embedding = rows?.[0]?.embedding
  if (!Array.isArray(embedding) || embedding.length !== 1536 || embedding.some((value) => typeof value !== 'number' || !Number.isFinite(value))) {
    throw new AIProviderUnavailable()
  }
  return embedding as number[]
}

export function parseStructured<T>(text: string, validate: (value: unknown) => value is T): T {
  let parsed: unknown
  try { parsed = JSON.parse(text) } catch { throw new AIProviderUnavailable() }
  if (!validate(parsed)) throw new AIProviderUnavailable()
  return parsed
}
