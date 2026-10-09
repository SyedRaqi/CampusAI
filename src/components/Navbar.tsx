import { useState } from 'react'
import { Menu, Search, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from './Button'
import ThemeToggle from './ThemeToggle'

type NavbarProps = {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Features', to: '#features' },
  { label: 'Events', to: '/events' },
  { label: 'Resources', to: '/resources' },
  { label: 'Clubs', to: '/clubs' },
  { label: 'Career Hub', to: '/internships' },
  { label: 'Campus AI', to: '/ai' },
  { label: 'Teams', to: '/teams' },
  { label: 'Chat', to: '/chat' },
  { label: 'About', to: '#about' },
]

export default function Navbar({ theme, onToggleTheme }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="topbar">
      <nav className="nav-shell" aria-label="Main navigation">
        <Link to="/" className="brand" aria-label="CampusConnect AI home">
          <div className="brand-mark" aria-hidden="true">
            <div className="brand-mark-core" />
          </div>
          <div>
            <span className="brand-name">CampusConnect <em>AI</em></span>
          </div>
        </Link>

        <div className="nav-links desktop-only" aria-label="Main menu items">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to} className="nav-link">
              {item.label}
            </Link>
          ))}
        </div>

        <div className="nav-actions">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <Link to="/resources" className="nav-search" aria-label="Open resource search" title="Search resources">
            <Search size={16} aria-hidden="true" />
          </Link>
          <Link to="/login" className="nav-login">
            Login
          </Link>
          <Button to="/register" className="nav-cta">
            Get Started
          </Button>
          <button
            type="button"
            className="mobile-menu-button"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {mobileOpen ? (
        <div className="mobile-menu" id="mobile-navigation" aria-label="Mobile navigation menu">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to} className="mobile-link" onClick={() => setMobileOpen(false)}>
              {item.label}
            </Link>
          ))}
          <Link to="/login" className="mobile-link" onClick={() => setMobileOpen(false)}>
            Login
          </Link>
          <Button to="/register" className="mobile-get-started" onClick={() => setMobileOpen(false)}>
            Get Started
          </Button>
        </div>
      ) : null}
    </header>
  )
}
