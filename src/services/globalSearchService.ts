import { supabase } from '../lib/supabase'

export type SearchCategory =
  | 'resource'
  | 'subject'
  | 'event'
  | 'internship'
  | 'club'
  | 'team'
  | 'announcement'
  | 'service'
  | 'lost_found'
  | 'faq'

export interface GlobalSearchResult {
  id: string
  title: string
  description: string
  category: SearchCategory
  href: string
  metadata: Record<string, string | number | null>
  created_at: string
  relevance: number
  total_count: number
}

export interface RecentSearch {
  id: string
  query: string
  created_at: string
}

export type SearchFilters = Record<string, string>

function client() {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  return supabase
}

export async function searchCampusContent(
  query: string,
  category: SearchCategory | null,
  page: number,
  filters: SearchFilters = {},
  sort = 'relevance',
) {
  const trimmed = query.trim()
  if (trimmed.length < 2) return { results: [] as GlobalSearchResult[], total: 0, historyWarning: '' }
  const { data, error } = await client().rpc('search_campus_content', {
    search_query: trimmed,
    result_category: category,
    page_number: page,
    page_size: 20,
    search_filters: filters,
    sort_order: sort,
  })
  if (error) throw new Error('Unable to search campus content. Please try again.')
  const results = (data ?? []) as GlobalSearchResult[]
  let historyWarning = ''
  if (page === 0) {
    const { error: historyError } = await client().rpc('record_user_search', { search_query: trimmed })
    if (historyError) historyWarning = 'Search results loaded, but this query could not be saved to recent searches.'
  }
  return { results, total: results[0]?.total_count ?? 0, historyWarning }
}

export async function getRecentSearches(): Promise<RecentSearch[]> {
  const { data, error } = await client()
    .from('user_search_history')
    .select('id,query,created_at')
    .order('created_at', { ascending: false })
    .limit(8)
  if (error) throw new Error('Unable to load recent searches.')
  return (data ?? []) as RecentSearch[]
}

export async function clearRecentSearches(): Promise<void> {
  const { data: userData, error: userError } = await client().auth.getUser()
  if (userError || !userData.user) throw new Error('Sign in to clear recent searches.')
  const { error } = await client().from('user_search_history').delete().eq('user_id', userData.user.id)
  if (error) throw new Error('Unable to clear recent searches.')
}
