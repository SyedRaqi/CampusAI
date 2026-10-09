import type { ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

type FeatureCardProps = {
  icon: ReactNode
  title: string
  description: string
  to: string
  image: string
  imageAlt: string
}

export default function FeatureCard({ icon, title, description, to, image, imageAlt }: FeatureCardProps) {
  return (
    <Link to={to} className="feature-card">
      <div className="feature-image-wrap">
        <img src={image} alt={imageAlt} loading="lazy" />
        <span className="feature-image-icon" aria-hidden="true">{icon}</span>
      </div>
      <div className="feature-card-copy">
        <div><h3>{title}</h3><p>{description}</p></div>
        <span className="feature-card-arrow" aria-hidden="true"><ArrowUpRight size={18} /></span>
      </div>
    </Link>
  )
}
