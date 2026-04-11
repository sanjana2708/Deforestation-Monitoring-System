import { NavLink } from 'react-router-dom'

const linkClass = ({ isActive }) =>
  isActive ? 'landing-nav__link landing-nav__link--active' : 'landing-nav__link'

export default function LandingNav() {
  return (
    <header className="landing-nav">
      <nav className="landing-nav__links" aria-label="Main">
        <NavLink to="/" end className={linkClass}>
          Home
        </NavLink>
        <NavLink to="/about" className={linkClass}>
          About Us
        </NavLink>
        <NavLink to="/dashboard" className={linkClass}>
          Dashboard
        </NavLink>
        <NavLink to="/contact" className={linkClass}>
          Contact
        </NavLink>
        <NavLink to="/login" className={linkClass}>
          Sign in
        </NavLink>
      </nav>
      <div className="landing-nav__brand" aria-hidden="true">
        <svg className="landing-nav__trees" viewBox="0 0 120 72" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M24 58 L24 48 L12 48 L24 28 L36 48 L24 48 Z M18 58 L30 58"
            stroke="#3d6b4a"
            strokeWidth="2"
            fill="none"
            strokeLinejoin="round"
          />
          <path
            d="M60 58 L60 42 L44 42 L60 16 L76 42 L60 42 Z M52 58 L68 58"
            stroke="#3d6b4a"
            strokeWidth="2"
            fill="none"
            strokeLinejoin="round"
          />
          <path
            d="M96 58 L96 46 L86 46 L96 30 L106 46 L96 46 Z M92 58 L100 58"
            stroke="#3d6b4a"
            strokeWidth="2"
            fill="none"
            strokeLinejoin="round"
          />
        </svg>
        <div className="landing-nav__brand-text">
          <span className="landing-nav__brand-name">Forest</span>
          <span className="landing-nav__brand-tag">Monitor</span>
        </div>
      </div>
    </header>
  )
}
