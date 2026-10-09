import { ArrowUpRight, Globe, MessageCircle, Share2 } from 'lucide-react'
import { Link } from 'react-router-dom'

const footerLinks = [
  { label: 'Home', to: '/' },
  { label: 'Features', to: '#features' },
  { label: 'Events', to: '#events' },
  { label: 'Resources', to: '#resources' },
  { label: 'Internships', to: '#internships' },
  { label: 'Clubs', to: '#clubs' },
  { label: 'About', to: '#about' },
  { label: 'Contact', to: '#contact' },
]

const legalLinks = ['Privacy Policy', 'Terms of Service']

export default function Footer() {
  return (
    <footer className="site-footer" id="contact">
      <div className="footer-grid">
        <div>
          <div className="brand-inline">
            <div className="brand-mark small" aria-hidden="true">
              <div className="brand-mark-core" />
            </div>
            <span>CampusConnect AI</span>
          </div>
          <p className="footer-text">Anjuman Institute of Technology</p>
        </div>

        <div>
          <h3>Explore</h3>
          <ul className="footer-links">
            {footerLinks.map((link) => (
              <li key={link.label}>
                <a href={link.to}>{link.label}</a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3>Legal</h3>
          <ul className="footer-links">
            {legalLinks.map((link) => (
              <li key={link}>
                <Link to="/">{link}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3>Social</h3>
          <div className="social-row" aria-label="Social links">
            <a href="#" aria-label="LinkedIn">
              <Globe size={18} />
            </a>
            <a href="#" aria-label="Instagram">
              <MessageCircle size={18} />
            </a>
            <a href="#" aria-label="GitHub">
              <Share2 size={18} />
            </a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 CampusConnect AI</span>
        <a href="#top" className="back-to-top">
          Back to top <ArrowUpRight size={16} />
        </a>
      </div>
    </footer>
  )
}
