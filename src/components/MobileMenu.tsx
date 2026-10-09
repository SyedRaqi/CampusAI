import { Link } from 'react-router-dom'

type MobileMenuProps = {
  navItems: { label: string; to: string }[]
  onClose: () => void
}

export default function MobileMenu({ navItems, onClose }: MobileMenuProps) {
  return (
    <div className="mobile-menu" aria-label="Mobile navigation menu">
      {navItems.map((item) => (
        <a key={item.label} href={item.to} className="mobile-link" onClick={onClose}>
          {item.label}
        </a>
      ))}
      <Link to="/login" className="mobile-link" onClick={onClose}>
        Login
      </Link>
    </div>
  )
}
