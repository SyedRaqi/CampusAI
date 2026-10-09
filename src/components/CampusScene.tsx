import { ArrowRight, BookOpenText, Bot, BriefcaseBusiness, CalendarDays, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

const quickLinks = [
  { title: 'Find Events', detail: 'Workshops, talks, fests', icon: <CalendarDays size={17} />, to: '/events' },
  { title: 'Join Clubs', detail: 'Meet your people', icon: <Users size={17} />, to: '/clubs' },
  { title: 'Get Resources', detail: 'Notes, books, guides', icon: <BookOpenText size={17} />, to: '/resources' },
  { title: 'Career Guidance', detail: 'Internships & jobs', icon: <BriefcaseBusiness size={17} />, to: '/internships' },
]

export default function CampusScene() {
  return (
    <div className="campus-scene">
      <div className="campus-plaza-light" aria-hidden="true" />
      <div className="campus-energy-ring" aria-hidden="true" />
      <div className="campus-ai-orb" aria-hidden="true">
        <span className="orb-core"><Bot size={25} /></span>
      </div>
      <div className="campus-assistant-panel">
        <div className="campus-assistant-card">
          <span className="assistant-signal" aria-hidden="true"><i /><i /><i /></span>
          <div><strong>AI Assistant</strong><span>Get instant help with notes, events, careers and more.</span></div>
          <ArrowRight className="assistant-card-arrow" size={17} aria-hidden="true" />
        </div>
        <div className="campus-quick-links">
          {quickLinks.map((item) => (
            <Link key={item.to} to={item.to} className="campus-quick-link">
              <span className="campus-quick-icon" aria-hidden="true">{item.icon}</span>
              <span className="campus-quick-copy"><strong>{item.title}</strong><small>{item.detail}</small></span>
              <ArrowRight className="campus-quick-arrow" size={16} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
