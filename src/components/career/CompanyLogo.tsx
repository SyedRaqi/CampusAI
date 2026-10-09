import { Building2 } from 'lucide-react'

type CompanyLogoProps = { name: string; logoUrl?: string | null; size?: 'small' | 'large' }

export default function CompanyLogo({ name, logoUrl, size = 'small' }: CompanyLogoProps) {
  return <span className={`career-company-logo career-company-logo-${size}`}>{logoUrl ? <img src={logoUrl} alt={`${name} logo`} loading="lazy" /> : <Building2 size={size === 'large' ? 30 : 21} aria-hidden="true" />}</span>
}
