import { useCallback, useEffect, useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import ForestMap from '../../components/dashboard/ForestMap'
import RiskGauge from '../../components/dashboard/RiskGauge'
import { getCnnDatasetItems } from '../../api/forestApi'
import { cnnDatasetFileUrl } from '../../api/client'
import { computeForestInsights } from '../../utils/forestInsights'
import { useDashboard } from './useDashboard'
import { formatTick, PIE_COLORS, probName } from './dashboardUtils'

export default function DashboardMain() {
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

  const [datasetItems, setDatasetItems] = useState([])
  const [aggregate, setAggregate] = useState({})
  const [datasetLoading, setDatasetLoading] = useState(false)
  const [datasetErr, setDatasetErr] = useState('')
  const [datasetFetchedAt, setDatasetFetchedAt] = useState(null)

  const loadDataset = useCallback(async (refresh = false) => {
    setDatasetErr('')
    setDatasetLoading(true)
    try {
      const res = await getCnnDatasetItems({ limit: 40, refresh })
      setDatasetItems(Array.isArray(res.items) ? res.items : [])
      setAggregate(res.aggregate && typeof res.aggregate === 'object' ? res.aggregate : {})
      setDatasetFetchedAt(new Date())
    } catch (e) {
      setDatasetErr(e.message || 'Failed to load CNN dataset')
      setDatasetItems([])
      setAggregate({})
    } finally {
      setDatasetLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDataset(false)
  }, [loadDataset])

  const insights = useMemo(() => computeForestInsights(series, null), [series])

  const ndviChartData = useMemo(
    () => (series || []).filter((p) => p && typeof p.NDVI === 'number' && !Number.isNaN(p.NDVI)),
    [series],
  )

  const aggregatePieData = useMemo(() => {
    const entries = Object.entries(aggregate).filter(([, c]) => c > 0)
    const total = entries.reduce((s, [, c]) => s + c, 0)
    if (!total) return []
    return entries.map(([name, count]) => ({
      name: probName(name),
      value: count / total,
    }))
  }, [aggregate])

  const latestNdvi = ndviChartData.length ? ndviChartData[ndviChartData.length - 1].NDVI : null
  const meanNdvi =
    ndviChartData.length > 0
      ? ndviChartData.reduce((s, p) => s + p.NDVI, 0) / ndviChartData.length
      : null

  const sampleDepth = Math.min(100, ndviChartData.length * 3)
  const updateLabel = lastUpdated
    ? `Last update: ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Last update: —'

  const datasetFooter = datasetFetchedAt
    ? `Dataset: ${datasetFetchedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Dataset: —'

  const activities = useMemo(() => {
    const rows = []
    if (lastUpdated && ndviChartData.length) {
      rows.push({
        id: 'a1',
        title: 'NDVI time series updated',
        sub: `${ndviChartData.length} monthly samples`,
        time: lastUpdated.toLocaleString(),
      })
    }
    if (datasetFetchedAt && datasetItems.length) {
      rows.push({
        id: 'a-ds',
        title: 'CNN dataset synced',
        sub: `${datasetItems.length} patches from data/cnn_dataset_raw`,
        time: datasetFetchedAt.toLocaleString(),
      })
    }
    rows.push({
      id: 'a3',
      title: 'AOI pinned on basemap',
      sub: `Lat ${lat.toFixed(4)}, Lon ${lon.toFixed(4)}`,
      time: 'Earth Engine / Esri imagery',
    })
    return rows
  }, [lastUpdated, ndviChartData.length, datasetFetchedAt, datasetItems.length, lat, lon])

  return (
    <div className="dash-grid">
      <div className="dash-col">
        <section className="dash-widget">
          <h2 className="dash-widget__title">Latest NDVI (mean canopy signal)</h2>
          <div className="dash-metric__row">
            <span className="dash-metric__icon" aria-hidden>
              🌲
            </span>
            <div>
              <div className="dash-metric__value">{latestNdvi != null ? latestNdvi.toFixed(3) : '—'}</div>
              {meanNdvi != null ? (
                <div className="dash-widget__footer" style={{ textAlign: 'left', marginTop: '0.35rem' }}>
                  Period mean: {meanNdvi.toFixed(3)}
                </div>
              ) : null}
            </div>
          </div>
          <div className="dash-widget__footer">{updateLabel}</div>
        </section>

        <section className="dash-widget">
          <div className="dash-widget__head-row">
            <h2 className="dash-widget__title" style={{ marginBottom: 0 }}>
              Patch classification mix
            </h2>
            <button type="button" className="dash-btn dash-btn--tiny" disabled={datasetLoading} onClick={() => loadDataset(true)}>
              {datasetLoading ? '…' : 'Refresh'}
            </button>
          </div>
          {datasetErr ? (
            <p className="dash-err" role="alert">
              {datasetErr}
            </p>
          ) : null}
          {aggregatePieData.length > 0 ? (
            <div className="dash-chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={aggregatePieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={62}
                    paddingAngle={2}
                  >
                    {aggregatePieData.map((_, i) => (
                      <Cell key={aggregatePieData[i].name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${(Number(v) * 100).toFixed(1)}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#8a938d', lineHeight: 1.5 }}>
              {datasetLoading
                ? 'Loading dataset…'
                : 'Add images to backend/data/cnn_dataset_raw (e.g. run the dataset harvest script) to populate class counts.'}
            </p>
          )}
          <div className="dash-widget__footer">{datasetFooter}</div>
        </section>

        <section className="dash-widget">
          <h2 className="dash-widget__title">Monthly samples in view</h2>
          <RiskGauge value={sampleDepth} label="Coverage depth" />
          <div className="dash-widget__footer">{updateLabel}</div>
        </section>
      </div>

      <div className="dash-col dash-col--center">
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
          <div className="dash-map-wrap">
            <ForestMap lat={lat} lon={lon} onMapClick={(clickedLat, clickedLon) => {
                setLat(clickedLat);
                setLon(clickedLon);
            }}/>
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
          <div className="dash-timelapse">
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

      <div className="dash-col">
        <section className="dash-widget">
          <h2 className="dash-widget__title">Activity</h2>
          <ul className="dash-activity">
            {activities.map((a) => (
              <li key={a.id}>
                <span className="dash-activity__dot" aria-hidden />
                <div>
                  <div>{a.title}</div>
                  <div className="dash-activity__meta">{a.sub}</div>
                  <div className="dash-activity__meta">{a.time}</div>
                </div>
              </li>
            ))}
          </ul>
          <div className="dash-widget__footer">{updateLabel}</div>
        </section>

        <section className="dash-widget">
          <h2 className="dash-widget__title">Mean NDVI (period)</h2>
          <div className="dash-metric__value" style={{ color: '#2a332f' }}>
            {meanNdvi != null ? meanNdvi.toFixed(3) : '—'}
          </div>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#7a857e', lineHeight: 1.5 }}>
            Higher values usually mean denser green vegetation in the buffered region; interpret with land cover and seasonality.
          </p>
          <div className="dash-widget__footer">{updateLabel}</div>
        </section>

        <section className="dash-widget">
          <h2 className="dash-widget__title">Raw dataset samples</h2>
          <p style={{ margin: '0 0 0.65rem', fontSize: '0.72rem', color: '#7a857e', lineHeight: 1.5 }}>
            Thumbnails from <code style={{ fontSize: '0.68rem' }}>data/cnn_dataset_raw</code> with model top-1 label.
          </p>
          <div className="dash-dataset-grid">
            {datasetItems.map((row) => (
              <figure key={row.filename} className="dash-dataset-card">
                <img src={cnnDatasetFileUrl(row.filename)} alt="" loading="lazy" />
                <figcaption>
                  <span className="dash-dataset-card__label">{probName(row.prediction?.label || '—')}</span>
                  <span className="dash-dataset-card__conf">
                    {row.prediction?.confidence != null ? `${Math.round(row.prediction.confidence * 100)}%` : ''}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
          {!datasetLoading && datasetItems.length === 0 ? (
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.78rem', color: '#8a938d' }}>No images in the dataset folder yet.</p>
          ) : null}
          <div className="dash-widget__footer">{datasetFooter}</div>
        </section>

        <section className="dash-widget dash-insights">
          <h2 className="dash-widget__title">Deforestation insight &amp; risk</h2>
          <RiskGauge value={insights.riskScore} label="Risk index" />
          <ul>
            {insights.messages.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
          {insights.ndviDelta != null ? (
            <p style={{ margin: '0.65rem 0 0', fontSize: '0.72rem', color: '#7a857e' }}>
              NDVI change (first → last month): {insights.ndviDelta > 0 ? '+' : ''}
              {insights.ndviDelta.toFixed(3)}
            </p>
          ) : null}
          <div className="dash-widget__footer">{updateLabel}</div>
        </section>
      </div>
    </div>
  )
}
