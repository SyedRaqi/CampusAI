const allowedOrigins = (Deno.env.get('AI_ALLOWED_ORIGINS') ?? '').split(',').map((origin) => origin.trim()).filter(Boolean)

function responseHeaders(request: Request) {
  const origin = request.headers.get('origin') ?? ''
  const allowOrigin = allowedOrigins.length === 0 || allowedOrigins.includes(origin) ? (origin || '*') : ''
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
    'Content-Type': 'application/json; charset=utf-8',
  }
}

export function handleOptions(request: Request): Response | null {
  if (request.method !== 'OPTIONS') return null
  return new Response('ok', { status: 204, headers: responseHeaders(request) })
}

export function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(request) })
}

export function fail(request: Request, status: number, message: string, code?: string): Response {
  return json(request, { error: message, ...(code ? { code } : {}) }, status)
}

export async function readJson(request: Request, maxBytes = 32_000): Promise<Record<string, unknown>> {
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > maxBytes) throw new Error('Request is too large.')
  const text = await request.text()
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new Error('Request is too large.')
  let value: unknown
  try { value = JSON.parse(text) } catch { throw new Error('Request must contain valid JSON.') }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Request must be a JSON object.')
  return value as Record<string, unknown>
}

export function isMethod(request: Request, method: string): boolean {
  return request.method === method
}
