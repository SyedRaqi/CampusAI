import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { supabase } from './lib/supabase'
import './auth.css'

type Variant = 'login' | 'register' | 'forgot'

const copy: Record<Variant, { kicker: string; title: string; sub: string }> = {
  login: {
    kicker: 'ADMIT ONE · RETURNING',
    title: 'Welcome back',
    sub: 'Pick up right where the last scene ended.',
  },
  register: {
    kicker: 'NEW PRODUCTION · STUDENT',
    title: 'Create account',
    sub: 'Join your campus. It takes under a minute.',
  },
  forgot: {
    kicker: 'RETAKE · RESET ACCESS',
    title: 'Reset password',
    sub: 'Enter your email and we will send a reset link.',
  },
}

export default function AuthPage({ variant }: { variant: Variant }) {
  const isForgot = variant === 'forgot'
  const isRegister = variant === 'register'
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const recoveryMode = isForgot && searchParams.get('recovery') === '1'
  const { signIn, signUp, role, user, loading } = useAuth()
  const [fullName, setFullName] = useState('')
  const [usn, setUsn] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user || !role || recoveryMode) return
    if (role === 'student') navigate('/student/dashboard', { replace: true })
    else if (role === 'faculty') navigate('/faculty/dashboard', { replace: true })
    else if (role === 'admin') navigate('/admin/dashboard', { replace: true })
  }, [navigate, recoveryMode, role, user])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setNotice('')

    if (isForgot) {
      if (!supabase) {
        setError('Password reset is unavailable because Supabase is not configured.')
        return
      }
      setBusy(true)
      try {
        if (recoveryMode) {
          const { error: updateError } = await supabase.auth.updateUser({ password })
          if (updateError) throw updateError
          const next = new URLSearchParams(searchParams)
          next.delete('recovery')
          setSearchParams(next, { replace: true })
          setNotice('Your password has been updated. You can now sign in.')
          setPassword('')
        } else {
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: `${window.location.origin}/forgot-password?recovery=1`,
          })
          if (resetError) throw resetError
          setNotice('If an account exists for that email, a password reset link has been sent.')
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to reset your password right now.')
      } finally {
        setBusy(false)
      }
      return
    }

    if (isRegister && !fullName.trim()) {
      setError('Please enter your full name.')
      return
    }
    if (!usn.trim() || !password.trim()) {
      setError('Please enter your USN and password.')
      return
    }

    try {
      if (isRegister) await signUp(fullName, usn, password)
      else await signIn(usn, password)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to sign in right now.')
    }
  }

  const t = copy[variant]
  const isBusy = loading || busy
  const submitLabel = recoveryMode
    ? 'Update password'
    : isForgot
      ? busy ? 'Sending reset link…' : 'Send reset link'
      : isBusy
        ? isRegister ? 'Creating account…' : 'Signing in…'
        : isRegister ? 'Create account' : 'Login'

  return (
    <div className="ax" data-variant={variant}>
      <aside className="ax-still" aria-hidden="true">
        <div className="ax-still-img" />
        <div className="ax-still-shade" />
        <div className="ax-still-bar ax-still-bar-top" />
        <div className="ax-still-bar ax-still-bar-bottom" />
        <div className="ax-flare" />
        <Link to="/" className="ax-logo">
          <span className="ax-logo-dot" /> CAMPUSCONNECT<em>AI</em>
        </Link>
        <div className="ax-still-copy">
          <p className="ax-mono">SCENE 00 · THE OPENING</p>
          <h2>Same campus.<br /><span>Bigger opportunities.</span></h2>
        </div>
        <p className="ax-still-hud ax-mono">2.39:1 · 24 FPS · NO LAUNCH WITHOUT YOU</p>
      </aside>

      <main className="ax-stage">
        <Link to="/" className="ax-logo ax-logo-mobile">
          <span className="ax-logo-dot" /> CAMPUSCONNECT<em>AI</em>
        </Link>
        <section className="ax-ticket">
          <header className="ax-stub">
            <span className="ax-mono">{recoveryMode ? 'RETAKE · CHOOSE PASSWORD' : t.kicker}</span>
            <span className="ax-mono ax-serial">Nº 000142</span>
          </header>
          <div className="ax-perf" aria-hidden="true" />
          <div className="ax-body">
            <h1>{recoveryMode ? 'Choose a password' : t.title}</h1>
            <p className="ax-sub">{recoveryMode ? 'Use a new password to secure your account.' : t.sub}</p>
            <form className="ax-form" onSubmit={handleSubmit}>
              {!isForgot ? (
                <>
                  {isRegister && <label className="ax-field">
                    <span>Full name</span>
                    <input type="text" name="fullName" placeholder="Enter your full name" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
                  </label>}
                  <label className="ax-field">
                    <span>USN</span>
                    <input type="text" name="usn" placeholder="Enter your USN" aria-label="USN" autoComplete="username" value={usn} onChange={(event) => setUsn(event.target.value)} required />
                  </label>
                </>
              ) : !recoveryMode ? (
                <label className="ax-field">
                  <span>Email</span>
                  <input type="email" name="email" placeholder="Enter your email" aria-label="Email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                </label>
              ) : null}

              {(!isForgot || recoveryMode) && <label className="ax-field">
                <span>{recoveryMode ? 'New password' : 'Password'}</span>
                <div className="ax-password">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder={recoveryMode ? 'Enter a new password' : 'Enter your password'}
                    aria-label={recoveryMode ? 'New password' : 'Password'}
                    autoComplete={recoveryMode || isRegister ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={6}
                    required
                  />
                  <button type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>}

              {error && <p className="ax-error" role="alert">{error}</p>}
              {notice && <p className="ax-notice" role="status">{notice}</p>}
              <button type="submit" className="ax-submit" disabled={isBusy}>
                {submitLabel} <ArrowRight size={16} aria-hidden="true" />
              </button>
              {!isForgot && !isRegister && <Link to="/forgot-password" className="ax-link ax-forgot">Forgot password?</Link>}
            </form>

            {!isForgot ? (
              <p className="ax-meta">
                {isRegister ? 'Already have an account? ' : 'New to CampusConnect? '}
                <Link to={isRegister ? '/login' : '/register'} className="ax-link">{isRegister ? 'Login' : 'Create student account'}</Link>
              </p>
            ) : (
              <p className="ax-meta">
                <Link to="/login" className="ax-link">← Back to login</Link>
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
