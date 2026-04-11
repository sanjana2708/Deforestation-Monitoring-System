import LandingNav from '../components/landing/LandingNav'
import LandingHero from '../components/landing/LandingHero'
import LandingFooter from '../components/landing/LandingFooter'
import '../styles/landing.css'

export default function LandingPage() {
  return (
    <div className="landing">
      <div className="landing__backdrop" aria-hidden="true" />
      <div className="landing__content">
        <LandingNav />
        <div className="landing__grid">
          <div className="landing__col landing__col--visual" />
          <div className="landing__col landing__col--copy">
            <LandingHero />
          </div>
        </div>
        <LandingFooter />
      </div>
    </div>
  )
}
