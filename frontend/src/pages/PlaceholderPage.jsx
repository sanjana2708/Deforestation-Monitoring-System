import { Link } from 'react-router-dom'

export default function PlaceholderPage({ title }) {
  return (
    <main style={{ padding: '2rem', fontFamily: 'var(--font-sans, system-ui)' }}>
      <h1>{title}</h1>
      <p>This section is coming soon.</p>
      <Link to="/">Back to home</Link>
    </main>
  )
}
