import { useEffect, useRef, useState } from 'react'
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion'
import { ArrowRight, ArrowUpRight, Moon, Sun } from 'lucide-react'
import { Link } from 'react-router-dom'
import '../Landingpage.css'

type ThemeMode = 'light' | 'dark'

const EASE: [number, number, number, number] = [0.2, 0.8, 0.2, 1]

const scenes = [
  {
    n: '01',
    tag: 'LIVE · ON LOCATION',
    title: 'Events',
    description: 'Talks, workshops and fests. Discover what is happening on campus and walk in with a QR ticket.',
    to: '/events',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1400&q=80',
    alt: 'Students gathered at a campus event',
  },
  {
    n: '02',
    tag: 'THE ENSEMBLE',
    title: 'Clubs',
    description: 'Find the people who care about the same things you do, and build something with them.',
    to: '/clubs',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=80',
    alt: 'Friends talking together outdoors',
  },
  {
    n: '03',
    tag: 'THE ARCHIVE',
    title: 'Resources',
    description: 'Notes, study material and previous papers, organised by subject and semester.',
    to: '/resources',
    image: 'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=1400&q=80',
    alt: 'Open study materials arranged on a desk',
  },
  {
    n: '04',
    tag: 'THE BREAKOUT ROLE',
    title: 'Career Hub',
    description: 'Internships, applications and guidance. Track every opportunity from first click to offer.',
    to: '/internships',
    image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1400&q=80',
    alt: 'A small team collaborating around a laptop',
  },
  {
    n: '05',
    tag: 'THE DIRECTOR',
    title: 'AI Assistant',
    description: 'Study plans, quizzes, interview practice. An assistant that knows your campus.',
    to: '/ai',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80',
    alt: 'Student working with a laptop in a bright study space',
  },
]

const prompts = ['Create a study plan', 'Generate a quiz', 'Find internships', 'Explain a topic', 'Prepare for an interview']

const acts = [
  { step: 'ACT I', title: 'Sign In', description: 'Use your college credentials.' },
  { step: 'ACT II', title: 'Connect', description: 'Discover resources, people, events and opportunities.' },
  { step: 'ACT III', title: 'Grow', description: 'Use AI-powered tools to move your academic and career journey forward.' },
]

const cast = [
  { label: 'STARRING', name: 'Student', description: 'Learn, collaborate, discover opportunities and get AI-powered support.' },
  { label: 'WITH', name: 'Faculty', description: 'Share knowledge, manage academic activity and stay close to students.' },
  { label: 'AND', name: 'Admin', description: 'Run the whole campus ecosystem from one dashboard.' },
]

const ticker = ['Events', 'Clubs', 'Resources', 'Internships', 'AI Assistant', 'Timetable', 'Attendance', 'Announcements', 'Messages']

/* ---------- small pieces ---------- */

function Word({ children, delay = 0 }: { children: string; delay?: number }) {
  const reduce = useReducedMotion()
  return (
    <span className="cx-mask">
      <motion.span
        className="cx-word"
        initial={reduce ? false : { y: '115%' }}
        animate={{ y: 0 }}
        transition={{ duration: 1.1, delay, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
  )
}

function Timecode() {
  const reduce = useReducedMotion()
  const [f, setF] = useState(0)
  useEffect(() => {
    if (reduce) return
    const id = window.setInterval(() => setF((x) => x + 1), 42)
    return () => window.clearInterval(id)
  }, [reduce])
  const p = (n: number) => String(n).padStart(2, '0')
  const frames = f % 24
  const seconds = Math.floor(f / 24) % 60
  const minutes = Math.floor(f / 1440) % 60
  return <span>{`00:${p(minutes)}:${p(seconds)}:${p(frames)}`}</span>
}

function Nav({ theme, onToggleTheme }: { theme: ThemeMode; onToggleTheme: () => void }) {
  const [solid, setSolid] = useState(false)
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 60)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`cx-nav ${solid ? 'is-solid' : ''}`}>
      <Link to="/" className="cx-logo" aria-label="CampusConnect AI home">
        <span className="cx-logo-dot" aria-hidden="true" />
        CAMPUSCONNECT<em>AI</em>
      </Link>
      <nav className="cx-nav-links" aria-label="Primary">
        <a href="#scenes">Scenes</a>
        <a href="#console">Assistant</a>
        <a href="#acts">How it works</a>
        <a href="#cast">Cast</a>
        <Link to="/support">Support</Link>
      </nav>
      <div className="cx-nav-actions">
        <button type="button" className="cx-icon-btn" onClick={onToggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <Link to="/login" className="cx-nav-login">Login</Link>
        <Link to="/register" className="cx-btn cx-btn-sm">Get Started</Link>
      </div>
    </header>
  )
}

/* ---------- hero ---------- */

function Hero() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '18%'])
  const copyY = useTransform(scrollYProgress, [0, 1], ['0%', '-12%'])
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  return (
    <section className="cx-hero" ref={ref} onMouseMove={onMove} id="top">
      <motion.div className="cx-hero-media" style={reduce ? undefined : { y: bgY }}>
        <div className="cx-hero-img cx-hero-img-dim" />
        <div className="cx-hero-img cx-hero-img-lit" aria-hidden="true" />
      </motion.div>

      <div className="cx-hero-vignette" />
      <div className="cx-flare" aria-hidden="true" />

      {/* letterbox bars open like a film starting */}
      <motion.div
        className="cx-bar cx-bar-top"
        initial={reduce ? false : { height: '50%' }}
        animate={{ height: '56px' }}
        transition={{ duration: 1.6, delay: 0.2, ease: EASE }}
      />
      <motion.div
        className="cx-bar cx-bar-bottom"
        initial={reduce ? false : { height: '50%' }}
        animate={{ height: '56px' }}
        transition={{ duration: 1.6, delay: 0.2, ease: EASE }}
      />

      <div className="cx-hud cx-hud-tl"><i className="cx-rec" /> REC</div>
      <div className="cx-hud cx-hud-tr"><Timecode /></div>
      <div className="cx-hud cx-hud-bl">SCENE 01 · TAKE 01 · 2.39:1</div>
      <div className="cx-hud cx-hud-br">SCROLL ↓</div>

      <motion.div className="cx-hero-copy" style={reduce ? undefined : { y: copyY, opacity: fade }}>
        <motion.p
          className="cx-eyebrow"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
        >
          A CAMPUSCONNECT PRODUCTION
        </motion.p>

        <h1 className="cx-title" aria-label="Your campus, smarter with AI.">
          <span className="cx-line">
            <Word delay={1.3}>Your</Word> <Word delay={1.4}>campus,</Word>
          </span>
          <span className="cx-line cx-line-serif">
            <Word delay={1.55}>smarter</Word> <Word delay={1.65}>with</Word>{' '}
            <span className="cx-ai"><Word delay={1.8}>AI.</Word></span>
          </span>
        </h1>

        <motion.p
          className="cx-lede"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.1, duration: 0.9, ease: EASE }}
        >
          Opportunities, people, resources and campus life in one intelligent platform. Designed for students, by students.
        </motion.p>

        <motion.div
          className="cx-actions"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.3, duration: 0.9, ease: EASE }}
        >
          <Link to="/register" className="cx-btn">
            Get Started <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <a href="#scenes" className="cx-ghost">
            <span className="cx-play" aria-hidden="true">▶</span> Watch the trailer
          </a>
        </motion.div>
      </motion.div>
    </section>
  )
}

/* ---------- ticker ---------- */

function Ticker() {
  const items = [...ticker, ...ticker]
  return (
    <div className="cx-ticker" aria-hidden="true">
      <div className="cx-ticker-track">
        {items.map((t, i) => (
          <span key={i}>{t}<b>✦</b></span>
        ))}
      </div>
    </div>
  )
}

/* ---------- pinned horizontal scenes ---------- */

function Scenes() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.4 })
  const x = useTransform(p, [0, 1], ['0vw', `-${(scenes.length - 1) * 100}vw`])

  return (
    <section className="cx-scenes" id="scenes" ref={ref} style={{ height: `${scenes.length * 100}vh` }}>
      <div className="cx-scenes-pin">
        <div className="cx-scenes-head">
          <span>THE SCENES</span>
          <span>ONE CAMPUS · FIVE STORIES</span>
        </div>

        <motion.div className="cx-scenes-track" style={{ x }}>
          {scenes.map((s) => (
            <article className="cx-scene" key={s.n}>
              <span className="cx-scene-num" aria-hidden="true">{s.n}</span>

              <Link to={s.to} className="cx-frame" aria-label={`Open ${s.title}`}>
                <img src={s.image} alt={s.alt} loading="lazy" />
                <span className="cx-crop cx-crop-tl" />
                <span className="cx-crop cx-crop-tr" />
                <span className="cx-crop cx-crop-bl" />
                <span className="cx-crop cx-crop-br" />
                <span className="cx-frame-label">SC {s.n} / 0{scenes.length}</span>
              </Link>

              <div className="cx-scene-copy">
                <p className="cx-eyebrow">{s.tag}</p>
                <h2>{s.title}</h2>
                <p>{s.description}</p>
                <Link to={s.to} className="cx-link">
                  Enter scene <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </motion.div>

        <div className="cx-scenes-progress" aria-hidden="true">
          <motion.i style={{ scaleX: p }} />
        </div>
      </div>
    </section>
  )
}

/* ---------- AI console ---------- */

const script = [
  { who: 'YOU', text: 'Create a study plan for my DBMS exam.' },
  { who: 'CAMPUS AI', text: "Absolutely. Here's a personalised 7-day DBMS plan built around your free hours: Day 1, ER models and keys. Day 2, normalisation. Day 3, SQL joins..." },
]

function Console() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const reduce = useReducedMotion()
  const total = script.reduce((a, l) => a + l.text.length, 0)
  const [n, setN] = useState(0)

  useEffect(() => {
    if (!inView || reduce) return
    const id = window.setInterval(() => setN((x) => (x >= total ? x : x + 1)), 26)
    return () => window.clearInterval(id)
  }, [inView, reduce, total])

  const visibleCharacters = reduce ? total : n
  return (
    <section className="cx-console-section" id="console">
      <div className="cx-console-copy">
        <p className="cx-eyebrow">THE DIRECTOR&apos;S CHAIR</p>
        <h2>Meet your campus <span className="cx-serif">AI&nbsp;assistant.</span></h2>
        <p>Your intelligent companion for studying, planning, discovering opportunities and navigating campus life.</p>
        <div className="cx-pills">
          {prompts.map((t) => (
            <Link to="/ai" key={t} className="cx-pill">{t}</Link>
          ))}
        </div>
      </div>

      <div className="cx-console" ref={ref}>
        <div className="cx-console-top">
          <i /><i /><i />
          <span>campus-ai — session 001</span>
        </div>
        <div className="cx-console-body">
          {script.map((l, index) => {
            const offset = script.slice(0, index).reduce((sum, line) => sum + line.text.length, 0)
            const shown = l.text.slice(0, Math.max(0, visibleCharacters - offset))
            const typing = shown.length > 0 && shown.length < l.text.length
            return (
              <div key={l.who} className={`cx-msg ${l.who === 'YOU' ? 'is-you' : 'is-ai'}`} style={{ opacity: shown ? 1 : 0 }}>
                <span>{l.who}</span>
                <p>{shown}{typing ? <b className="cx-caret" /> : null}</p>
              </div>
            )
          })}
          {visibleCharacters >= total ? <b className="cx-caret cx-caret-end" /> : null}
        </div>
      </div>
    </section>
  )
}

/* ---------- acts (film strip) ---------- */

function Acts() {
  const reduce = useReducedMotion()
  return (
    <section className="cx-acts" id="acts">
      <div className="cx-section-head">
        <p className="cx-eyebrow">HOW IT WORKS</p>
        <h2>Three acts. <span className="cx-serif">One story.</span></h2>
      </div>
      <div className="cx-strip">
        {acts.map((a, i) => (
          <motion.div
            className="cx-frame-card"
            key={a.step}
            initial={reduce ? false : { opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.8, delay: i * 0.12, ease: EASE }}
          >
            <span className="cx-act-step">{a.step}</span>
            <h3>{a.title}</h3>
            <p>{a.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

/* ---------- credits ---------- */

function Cast() {
  return (
    <section className="cx-cast" id="cast">
      <p className="cx-eyebrow cx-center">DESIGNED FOR EVERY CAMPUS ROLE</p>
      <ul className="cx-credits">
        {cast.map((c) => (
          <li key={c.name}>
            <span className="cx-credit-label">{c.label}</span>
            <strong>{c.name}</strong>
            <p>{c.description}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ---------- finale ---------- */

function Finale() {
  return (
    <section className="cx-finale">
      <div className="cx-finale-glow" aria-hidden="true" />
      <p className="cx-eyebrow cx-center">COMING TO YOUR CAMPUS · NOW SHOWING</p>
      <h2>
        Your campus.<br />
        Your people.<br />
        <span className="cx-serif cx-ai">Your future.</span>
      </h2>
      <p className="cx-finale-copy">
        Everything you need to make the most of your college experience, connected in one intelligent platform.
      </p>
      <Link to="/register" className="cx-btn cx-btn-lg">
        Get Started <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </section>
  )
}

function Credits() {
  const [year] = useState(() => new Date().getFullYear())
  return (
    <footer className="cx-footer">
      <span>© {year} CampusConnect AI</span>
      <span>Directed by students · Produced on campus</span>
      <a href="#top">Back to opening ↑</a>
    </footer>
  )
}

/* ---------- page ---------- */

export default function LandingPage({ theme, onToggleTheme }: { theme: ThemeMode; onToggleTheme: () => void }) {
  return (
    <div className="cx" data-theme={theme}>
      <div className="cx-grain" aria-hidden="true" />
      <Nav theme={theme} onToggleTheme={onToggleTheme} />
      <main>
        <Hero />
        <Ticker />
        <Scenes />
        <Console />
        <Acts />
        <Cast />
        <Finale />
      </main>
      <Credits />
    </div>
  )
}