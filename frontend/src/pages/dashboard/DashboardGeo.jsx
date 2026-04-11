import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import ForestMap from '../../components/dashboard/ForestMap'
import { useDashboard } from './useDashboard'
import { formatTick } from './dashboardUtils'

export default function DashboardGeo() {
  const {
    lat,
    setLat,
    lon,
    setLon,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    series,
    loading,
    error,
    lastUpdated,
    timelapseUrl,
    timelapseLoading,
    timelapseErr,
    runAnalysis,
    loadTimelapse,
  } = useDashboard()

  const ndviChartData = (series || []).filter((p) => p && typeof p.NDVI === 'number' && !Number.isNaN(p.NDVI))

  const updateLabel = lastUpdated
    ? `Last update: ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Last update: —'

  return (
    <div className="dash-geo-page">
      <section className="dash-widget">
        <h2 className="dash-widget__title">AOI map &amp; Earth Engine workflow</h2>
        <div className="dash-controls">
          <label>
            Latitude
            <input type="number" step="0.0001" value={lat} onChange={(e) => setLat(Number(e.target.value))} />
          </label>
          <label>
            Longitude
            <input type="number" step="0.0001" value={lon} onChange={(e) => setLon(Number(e.target.value))} />
          </label>
          <label>
            Start
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label>
            End
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
          <button type="button" className="dash-btn" disabled={loading} onClick={runAnalysis}>
            {loading ? 'Running…' : 'Run NDVI analysis'}
          </button>
          <button type="button" className="dash-btn dash-btn--ghost" disabled={timelapseLoading} onClick={loadTimelapse}>
            {timelapseLoading ? 'Loading…' : 'Load GEE timelapse'}
          </button>
        </div>
        {error ? (
          <p className="dash-err" role="alert">
            {error}
          </p>
        ) : null}
        {timelapseErr ? (
          <p className="dash-err" role="alert">
            {timelapseErr}
          </p>
        ) : null}
        <div className="dash-map-wrap dash-map-wrap--geo">
          <ForestMap lat={lat} lon={lon} />
        </div>
        <div className="dash-widget__footer">{updateLabel}</div>
      </section>

      <section className="dash-widget">
        <h2 className="dash-widget__title">NDVI trend (monthly composites)</h2>
        <div className="dash-chart-box dash-chart-box--tall">
          {ndviChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ndviChartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <XAxis dataKey="time" tickFormatter={formatTick} tick={{ fontSize: 10 }} stroke="#9aa299" />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} stroke="#9aa299" width={36} />
                <Tooltip
                  labelFormatter={(l) => `Month: ${l}`}
                  formatter={(v) => [typeof v === 'number' ? v.toFixed(4) : v, 'NDVI']}
                />
                <Line type="monotone" dataKey="NDVI" stroke="#5a7c5e" strokeWidth={2} dot={{ r: 3, fill: '#c9a227' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="dash-timelapse__placeholder">Run analysis to plot NDVI from Google Earth Engine.</div>
          )}
        </div>
        <div className="dash-widget__footer">{updateLabel}</div>
      </section>

      <section className="dash-widget">
        <h2 className="dash-widget__title">Seasonal timelapse (Sentinel-2 RGB)</h2>
        <div className="dash-timelapse dash-timelapse--geo">
          {timelapseUrl ? (
            <img src={timelapseUrl} alt="Earth Engine timelapse animation for the AOI" />
          ) : (
            <div className="dash-timelapse__placeholder">
              Load timelapse to stream a GIF from Earth Engine for this location and year span.
            </div>
          )}
        </div>
        <div className="dash-widget__footer">{updateLabel}</div>
      </section>
    </div>
  )
}
