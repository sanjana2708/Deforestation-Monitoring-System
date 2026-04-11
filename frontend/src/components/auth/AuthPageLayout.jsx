export default function AuthPageLayout({
  imageUrl,
  heading,
  tagline,
  footerBrand,
  footerLine1,
  footerLine2,
  children,
}) {
  const panelStyle = {
    backgroundImage: `linear-gradient(145deg, rgba(20, 28, 24, 0.72) 0%, rgba(30, 38, 34, 0.82) 100%), url(${imageUrl})`,
  }

  return (
    <div className="auth-page">
      <div className="auth-page__split-bg" aria-hidden="true" />
      <main className="auth-page__main">
        <div className="auth-card">
          <aside className="auth-card__panel" style={panelStyle}>
            <div className="auth-card__panel-inner">
              <h1 className="auth-card__heading">{heading}</h1>
              <p className="auth-card__tagline">{tagline}</p>
            </div>
            <div className="auth-card__panel-foot">
              <p className="auth-card__brand-line">{footerBrand}</p>
              <p className="auth-card__contact">{footerLine1}</p>
              <p className="auth-card__contact">{footerLine2}</p>
            </div>
          </aside>
          <div className="auth-card__form-col">{children}</div>
        </div>
      </main>
    </div>
  )
}
