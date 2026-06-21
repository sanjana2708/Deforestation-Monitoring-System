import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import AuthPageLayout from '../components/auth/AuthPageLayout'
import { AUTH_IMAGE_SIGNIN } from '../constants/authAssets'
import { setSession } from '../auth/session'
import { postLogin } from '../api/authApi'
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

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState(location.state?.successMessage || '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading) return
    setError('')
    setSuccessMsg('')
    if (!emailOk(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    try {
      setLoading(true)
      const data = await postLogin(email, password)
      setSession({ email: data.email, token: data.token }, remember)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err?.message || 'An error occurred during login.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPageLayout
      imageUrl={AUTH_IMAGE_SIGNIN}
      heading=""
      tagline="Finding focus in the data that guards our forests."
      footerBrand=""
      footerLine1=""
      footerLine2=""
    >
      <h2 className="auth-form__title">Sign in here</h2>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {successMsg ? (
          <p className="auth-form__success" role="status">
            {successMsg}
          </p>
        ) : null}
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
            autoComplete="current-password"
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
        <div className="auth-form__row">
          <label className="auth-form__remember">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Remember me
          </label>
        </div>
        <button type="submit" className="auth-form__submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'} <span aria-hidden>→</span>
        </button>
        <p className="auth-form__switch">
          Don&apos;t have an account?{' '}
          <Link to="/signup">Create your account here!</Link>
        </p>
      </form>
    </AuthPageLayout>
  )
}
