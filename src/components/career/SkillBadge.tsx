type SkillBadgeProps = { children: string; matched?: boolean }

export default function SkillBadge({ children, matched = false }: SkillBadgeProps) {
  return <span className={`career-skill-badge${matched ? ' matched' : ''}`}>{children}{matched && <span className="sr-only"> matched</span>}</span>
}
