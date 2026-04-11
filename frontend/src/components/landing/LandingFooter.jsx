export default function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer__social" aria-label="Social links">
        <a className="landing-footer__icon" href="#" aria-label="Facebook">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M14 10h2V8h-2c-1.1 0-2 .9-2 2v2h-2v2h2v6h2v-6h2l1-2h-3v-1c0-.6.4-1 1-1z" />
          </svg>
        </a>
        <a className="landing-footer__icon" href="#" aria-label="Instagram">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <rect x="7" y="7" width="10" height="10" rx="3" />
            <circle cx="12" cy="12" r="2.5" />
          </svg>
        </a>
        <a className="landing-footer__icon" href="#" aria-label="Twitter">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 16c6 0 9-4 9-7v-1l-2 1" />
          </svg>
        </a>
        <a className="landing-footer__icon" href="#" aria-label="YouTube">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M10 9l5 3-5 3V9z" fill="currentColor" stroke="none" />
          </svg>
        </a>
      </div>
      <div className="landing-footer__contact">
        {/* <p className="landing-footer__url">WWW.HIMALAYANFOREST.MONITOR</p> */}
        <p className="landing-footer__addr">Research &amp; conservation partners</p>
        <p className="landing-footer__addr">Earth observation lab</p>
      </div>
    </footer>
  )
}
