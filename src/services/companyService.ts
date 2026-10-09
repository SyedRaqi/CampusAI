import { supabase } from '../lib/supabase'
import type { Company } from '../types'
import { validateExternalUrl } from './internshipService'

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export async function getCompanies(includeInactive = false): Promise<Company[]> {
  let query = requireSupabase().from('companies').select('*').order('name')
  if (!includeInactive) query = query.eq('is_active', true)
  const { data, error } = await query
  if (error) throw new Error('Unable to load companies.')
  return (data ?? []) as Company[]
}

export async function saveCompany(input: Pick<Company, 'name' | 'logo_url' | 'website_url' | 'description' | 'industry' | 'location'>, companyId?: string): Promise<void> {
  validateExternalUrl(input.website_url, 'company website')
  validateExternalUrl(input.logo_url, 'logo URL')
  const result = companyId
    ? await requireSupabase().from('companies').update(input).eq('id', companyId)
    : await requireSupabase().from('companies').insert({ ...input, is_demo: false })
  if (result.error) throw new Error('Unable to save the company. Verify the company name and HTTPS links.')
}

export async function setCompanyActive(companyId: string, active: boolean): Promise<void> {
  const { error } = await requireSupabase().from('companies').update({ is_active: active }).eq('id', companyId)
  if (error) throw new Error('Unable to update company status.')
}
