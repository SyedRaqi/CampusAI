import { Filter } from 'lucide-react'
import type { Branch } from '../../types'
import type { DeadlineWindow, DurationWindow, InternshipFilters as Filters, InternshipSort } from '../../services/internshipService'
import type { InternshipType, WorkMode } from '../../types'

type InternshipFiltersProps = { filters: Filters; branches: Branch[]; locations: string[]; onChange: (filters: Filters) => void }

export default function InternshipFilters({ filters, branches, locations, onChange }: InternshipFiltersProps) {
  const set = <Key extends keyof Filters>(key: Key, value: Filters[Key]) => onChange({ ...filters, [key]: value, page: 1 })
  const fields = <>
    <label><span>Work mode</span><select value={filters.workMode ?? ''} onChange={(event) => set('workMode', (event.target.value || undefined) as WorkMode | undefined)}><option value="">Any mode</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="on_site">On-site</option></select></label>
    <label><span>Compensation</span><select value={filters.paid === undefined ? '' : String(filters.paid)} onChange={(event) => set('paid', event.target.value === '' ? undefined : event.target.value === 'true')}><option value="">Paid or unpaid</option><option value="true">Paid</option><option value="false">Unpaid</option></select></label>
    <label><span>Type</span><select value={filters.internshipType ?? ''} onChange={(event) => set('internshipType', (event.target.value || undefined) as InternshipType | undefined)}><option value="">Any type</option><option value="full_time">Full-time</option><option value="part_time">Part-time</option><option value="summer">Summer</option><option value="winter">Winter</option><option value="academic">Academic</option><option value="research">Research</option></select></label>
    <label><span>Location</span><input list="career-location-options" value={filters.location ?? ''} onChange={(event) => set('location', event.target.value || undefined)} placeholder="Any location" /><datalist id="career-location-options">{locations.map((location) => <option key={location} value={location} />)}</datalist></label>
    <label><span>Duration</span><select value={filters.durationWindow ?? ''} onChange={(event) => set('durationWindow', (event.target.value || undefined) as DurationWindow | undefined)}><option value="">Any duration</option><option value="under_one">Under 1 month</option><option value="one_to_three">1–3 months</option><option value="three_to_six">3–6 months</option><option value="six_plus">6+ months</option></select></label>
    <label><span>Branch</span><select value={filters.branchId ?? ''} onChange={(event) => set('branchId', event.target.value || undefined)}><option value="">Any branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}{branch.is_demo ? ' · Demo' : ''}</option>)}</select></label>
    <label><span>Deadline</span><select value={filters.deadlineWindow ?? ''} onChange={(event) => set('deadlineWindow', (event.target.value || undefined) as DeadlineWindow | undefined)}><option value="">Any deadline</option><option value="week">Closing this week</option><option value="month">Closing this month</option><option value="later">Later</option></select></label>
    <label><span>Sort</span><select value={filters.sort ?? 'deadline'} onChange={(event) => set('sort', event.target.value as InternshipSort)}><option value="deadline">Deadline soonest</option><option value="newest">Newest</option><option value="updated">Recently updated</option><option value="company">Company A–Z</option><option value="role">Role A–Z</option></select></label>
  </>
  return <><aside className="career-filter-sidebar" aria-label="Opportunity filters"><div className="career-filter-title"><Filter size={17} /> Filters</div>{fields}</aside><details className="career-filter-drawer"><summary><Filter size={17} /> Filters</summary><div>{fields}</div></details></>
}
