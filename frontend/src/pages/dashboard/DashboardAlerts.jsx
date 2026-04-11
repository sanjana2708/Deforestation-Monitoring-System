import { useMemo, useState } from 'react'
import { clearLocationAlerts, loadLocationAlerts } from '../../utils/locationAlerts'
import { useDashboard } from './useDashboard'

export default function DashboardAlerts() {
  const { lat, lon } = useDashboard()
  const [alerts, setAlerts] = useState(() => loadLocationAlerts())

  const sorted = useMemo(
    () => [...alerts].sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0)),
    [alerts],
  )

  function refresh() {
    setAlerts(loadLocationAlerts())
  }

  function clearAll() {
    clearLocationAlerts()
    setAlerts([])
  }

  return (
    <div className="dash-alerts-page">
      <section className="dash-widget dash-alerts-intro">
        <h2 className="dash-widget__title">Location risk alerts</h2>
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: '#5a6560', lineHeight: 1.55 }}>
          Each successful <strong>Run NDVI analysis</strong> from the main or geo view adds an entry here with a heuristic risk score
          derived from the NDVI series (stored in this browser only).
        </p>
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', color: '#7a857e' }}>
          Current AOI (shared): {lat.toFixed(4)}, {lon.toFixed(4)}
        </p>
        <div className="dash-alerts-actions">
          <button type="button" className="dash-btn dash-btn--ghost" onClick={refresh}>
            Refresh list
          </button>
          <button type="button" className="dash-btn dash-btn--ghost" onClick={clearAll}>
            Clear all alerts
          </button>
        </div>
      </section>

      {sorted.length === 0 ? (
        <section className="dash-widget">
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#8a938d' }}>No analyses recorded yet. Run NDVI analysis on the dashboard to populate alerts.</p>
        </section>
      ) : (
        <ul className="dash-alerts-list">
          {sorted.map((a) => (
            <li key={a.id} className="dash-widget dash-alert-card">
              <div className="dash-alert-card__top">
                <span className="dash-alert-card__risk">{a.riskScore ?? '—'}</span>
                <span className="dash-alert-card__risk-label">risk index</span>
              </div>
              <div className="dash-alert-card__body">
                <div>
                  <strong>Coordinates</strong>
                  <div className="dash-alert-card__meta">
                    {typeof a.lat === 'number' ? a.lat.toFixed(4) : a.lat}, {typeof a.lon === 'number' ? a.lon.toFixed(4) : a.lon}
                  </div>
                </div>
                <div>
                  <strong>Date range</strong>
                  <div className="dash-alert-card__meta">
                    {a.startDate} → {a.endDate}
                  </div>
                </div>
                <div>
                  <strong>Samples</strong>
                  <div className="dash-alert-card__meta">{a.sampleCount ?? '—'} months</div>
                </div>
                <div>
                  <strong>NDVI Δ</strong>
                  <div className="dash-alert-card__meta">
                    {a.ndviDelta != null ? `${a.ndviDelta > 0 ? '+' : ''}${Number(a.ndviDelta).toFixed(3)}` : '—'}
                  </div>
                </div>
                <div className="dash-alert-card__full">
                  <strong>Recorded</strong>
                  <div className="dash-alert-card__meta">{a.at ? new Date(a.at).toLocaleString() : '—'}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
