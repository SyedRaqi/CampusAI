import type { ReactNode } from 'react'

type FloatingCardProps = {
  icon: ReactNode
  title: string
  description: string
  className?: string
}

export default function FloatingCard({ icon, title, description, className = '' }: FloatingCardProps) {
  return (
    <div className={`floating-card ${className}`.trim()}>
      <div className="floating-card-icon">{icon}</div>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  )
}
