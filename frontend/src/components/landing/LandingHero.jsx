import { Link } from 'react-router-dom'

export default function LandingHero() {
  return (
    <section className="landing-hero" aria-labelledby="landing-hero-title">
      {/* <p className="landing-hero__date">21 March</p> */}
      <div className="landing-hero__title-wrap">
        <h1 id="landing-hero-title" className="landing-hero__title">
          <span className="landing-hero__title-line">Global</span>
          <span className="landing-hero__title-line">Forest Monitor</span>
        </h1>
        <p className="landing-hero__script">Protecting forests through data</p>
      </div>
      <div className="landing-hero__body">
        <p>
          Track forest health with Google Earth Engine NDVI time series for any coordinates and date range.
        </p>
        <p>
          Use satellite-patch classification to spot change patterns across the Globe.
        </p>
      </div>
      <Link to="/about" className="landing-hero__cta">
        Learn More
      </Link>
    </section>
  )
}
