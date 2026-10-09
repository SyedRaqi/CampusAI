import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.117.2'

export async function recordAIRequestMetrics(
  client: SupabaseClient,
  feature: string,
  startedAt: number,
  failed: boolean,
): Promise<void> {
  try {
    const { error } = await client.rpc('record_ai_request_metrics', {
      target_feature: feature,
      elapsed_ms: Date.now() - startedAt,
      request_failed: failed,
    })
    if (error) console.error('Unable to record AI request metrics')
  } catch {
    console.error('Unable to record AI request metrics')
  }
}
