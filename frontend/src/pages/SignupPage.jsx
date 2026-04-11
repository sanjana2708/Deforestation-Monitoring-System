import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthPageLayout from '../components/auth/AuthPageLayout'
import { AUTH_IMAGE_SIGNUP } from '../constants/authAssets'
import { setSession } from '../auth/session'
import '../styles/auth.css'

function MailIcon() {
  return (
    <svg className="auth-field__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg className="auth-field__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg className="auth-field__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M4 4l16 16" />
      </svg>
    )
  }
  return (
    <svg className="auth-field__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  )
}

const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

export default function SignupPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!emailOk(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setSession({ email })
    navigate('/dashboard', { replace: true })
  }

  return (
    <AuthPageLayout
      imageUrl={AUTH_IMAGE_SIGNUP}
      heading="Join"
      tagline="Your eyes on the range—from first login to lasting impact."
      footerBrand="observe & act"
      footerLine1="+1 (000) 000-0000"
      footerLine2="www.himalayanforest.monitor"
    >
      <h2 className="auth-form__title">Create your account</h2>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {error ? (
          <p className="auth-form__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="auth-field">
          <MailIcon />
          <input
            className="auth-field__input"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
          />
        </div>
        <div className="auth-field">
          <LockIcon />
          <input
            className="auth-field__input"
            type={showPassword ? 'text' : 'password'}
            name="password"
            autoComplete="new-password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="auth-field__toggle"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            <EyeIcon open={showPassword} />
          </button>
        </div>
        <div className="auth-field">
          <LockIcon />
          <input
            className="auth-field__input"
            type={showConfirm ? 'text' : 'password'}
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <button
            type="button"
            className="auth-field__toggle"
            onClick={() => setShowConfirm((s) => !s)}
            aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
          >
            <EyeIcon open={showConfirm} />
          </button>
        </div>
        <button type="submit" className="auth-form__submit">
          Sign up <span aria-hidden>→</span>
        </button>
        <p className="auth-form__switch">
          Already have an account? <Link to="/login">Sign in here!</Link>
        </p>
      </form>
    </AuthPageLayout>
  )
}
