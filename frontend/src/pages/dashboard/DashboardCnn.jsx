import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { postClassifyUpload, getCnnDatasetItems } from '../../api/forestApi'
import { cnnDatasetFileUrl, apiFetch } from '../../api/client'
import { probName } from './dashboardUtils'
import { useDashboard } from './useDashboard'

function extractPatchDate(filename) {
  const m = /^patch_(\d{4}-\d{2}-\d{2})_/.exec(filename || '')
  return m ? m[1] : null
}

function interpretationText(prediction, filename) {
  const date = extractPatchDate(filename)
  const label = prediction?.label
  const parts = []
  
  if (date) {
    parts.push(`This patch was exported around the anomaly window anchored at ${date} (from NDVI drop harvesting).`)
  }
  
  // Synchronized with your updated 7-class backend rules mapping engine
  if (label === 'logging_road') {
    parts.push('The model leans toward linear clearing or access infrastructure—verify against roads and skid trails in high resolution.')
  } else if (label === 'mining') {
    parts.push('Mining-like surface texture patterns score high; cross-check against bare rock, river silt pits, or bright soils.')
  } else if (label === 'agriculture') {
    parts.push('Agriculture class often overlaps with young fallow vegetation or clear plantation geometry; check field outlines.')
  } else if (label === 'healthy_forest') {
    parts.push('Healthy forest is the model’s read of dense, stable canopy in the patch; compare with baseline trends.')
  } else if (label === 'cloudy') {
    parts.push('Heavy atmospheric cloud cover or localized mountain haze detected. Optical data visibility is obscured.')
  } else if (label === 'habitation') {
    parts.push('Human structures, buildings, or rural village patterns detected. Cross-check with local community boundary cadastre.')
  } else if (label === 'water_body') {
    parts.push('Open water signature or river silt channel detected. Verify if water levels match historical paths or flooding.')
  } else {
    parts.push('Review the probability bars and context imagery before treating any class as ground truth.')
  }
  return parts.join(' ')
}

export default function DashboardCnn() {
  const { lat, lon, startDate, endDate } = useDashboard()

  const [prediction, setPrediction] = useState(null)
  const [uploadName, setUploadName] = useState('')
  const [classifyLoading, setClassifyLoading] = useState(false)
  const [classifyErr, setClassifyErr] = useState('')
  const [items, setItems] = useState([])
  const [listLoading, setListLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [harvestLoading, setHarvestLoading] = useState(false)
  const [harvestMsg, setHarvestMsg] = useState('')
  const harvestInFlightRef = useRef(false)

  // 🔄 INFINITE REFRESH PASS: Accepts an explicit trigger parameter
  const loadList = useCallback(async (isRefresh = false) => {
    setListLoading(true)
    try {
      const res = await getCnnDatasetItems({ limit: 60, refresh: isRefresh })
      setItems(Array.isArray(res.items) ? res.items : [])
    } catch (err) {
      console.error("🚨 Fetching dataset gallery grid failed:", err)
      setItems([])
    } finally {
      setListLoading(false)
    }
  }, [])

  // Initial render lifecycle load
  useEffect(() => {
    loadList(false)
  }, [loadList])

  const barData = useMemo(() => {
    const src = prediction?.all_probs
    if (!src) return []
    return Object.entries(src).map(([name, value]) => ({
      name: probName(name),
      value: Number(value),
    }))
  }, [prediction])

  const onClassifyFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setClassifyErr('')
    setClassifyLoading(true)
    setPrediction(null)
    setSelected(null)
    setUploadName(file.name)
    try {
      const res = await postClassifyUpload(file)
      setPrediction(res.prediction || null)
    } catch (err) {
      setClassifyErr(err.message || 'Classification failed')
    } finally {
      setClassifyLoading(false)
      e.target.value = ''
    }
  }

  function selectDatasetRow(row) {
    setSelected(row)
    // Dynamic fallbacks accommodate direct endpoint models or custom item structures
    const activePrediction = row.prediction || {
      label: row.label,
      confidence: row.confidence,
      all_probs: row.all_probs
    }
    setPrediction(activePrediction)
    setUploadName(row.filename)
    setClassifyErr('')
  }

  const handleHarvest = async () => {
    if (harvestInFlightRef.current) return

    harvestInFlightRef.current = true
    setHarvestLoading(true)
    setHarvestMsg('')
    setClassifyErr('')
    try {
      const response = await apiFetch('/trigger-harvest', {
        method: 'POST',
        body: JSON.stringify({
          lat: parseFloat(lat),
          lon: parseFloat(lon),
          start: startDate,
          end: endDate,
        }),
      })

      if (!response.ok) {
        let detail = 'Analysis failed'
        try {
          const body = await response.json()
          if (body?.detail) detail = String(body.detail)
        } catch {
          // ignore parse errors
        }
        throw new Error(detail)
      }

      await loadList(true)
      setHarvestMsg(`Analysis complete for coordinates ${lat}, ${lon}. Select a patch below to view results.`)
    } catch (e) {
      setClassifyErr(e.message || 'Analysis failed')
    } finally {
      harvestInFlightRef.current = false
      setHarvestLoading(false)
    }
  }

  const displayName = selected?.filename || uploadName

  return (
    <div className="dash-cnn-page">
      <section className="dash-widget">
        <h2 className="dash-widget__title">Detailed Analysis</h2>
        <p style={{ margin: '0 0 0.65rem', fontSize: '0.78rem', color: '#7a857e', lineHeight: 1.55 }}>
          Runs the CNN on any 224×224-style satellite chip. Results show full classification outputs for all forest-change classes.
        </p>
        <button
          type="button"
          className="dash-btn dash-btn--primary"
          disabled={harvestLoading}
          aria-busy={harvestLoading}
          onClick={handleHarvest}
        >
          {harvestLoading ? 'LOADING ANALYSIS' : 'Run Detailed Analysis'}
        </button>
        {harvestLoading ? (
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.78rem', color: '#5a6560' }} role="status" aria-live="polite">
            Running detailed analysis — please wait…
          </p>
        ) : null}
        {harvestMsg ? (
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.78rem', color: '#3d6b45' }} role="status">
            {harvestMsg}
          </p>
        ) : null}
        {classifyErr ? (
          <p className="dash-err" role="alert">
            {classifyErr}
          </p>
        ) : null}
        <div className="dash-widget__footer">MobileNetV3 optimized forest model</div>
      </section>

      <div className="dash-cnn-split">
        <section className="dash-widget">
          <h2 className="dash-widget__title">Dataset patches (NDVI-drop harvest)</h2>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.72rem', color: '#7a857e' }}>
            Click a tile to load its saved prediction into the analysis panel.
          </p>
          
          {/* Button executes native state update calling clear functions on your database arrays */}
          <button 
            type="button" 
            className="dash-btn dash-btn--ghost dash-btn--small" 
            disabled={listLoading} 
            onClick={() => loadList(true)}
          >
            {listLoading ? 'Refreshing…' : 'Reload list'}
          </button>
          
          <div style={{ position: 'relative', marginTop: '1rem', minHeight: '320px' }}>
            <style>{`
              @keyframes scaleUp {
                from { transform: scale(0.92); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
              }
            `}</style>

            {selected ? (
              <div className="dash-enlarged-overlay" style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(8px)',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '10px',
                border: '2px solid #5a7c5e',
                padding: '1rem',
                boxSizing: 'border-box',
                animation: 'scaleUp 0.18s ease-out'
              }}>
                <button 
                  type="button" 
                  onClick={() => { setSelected(null); setPrediction(null); }}
                  aria-label="Close enlarged view"
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: '#eceeec',
                    border: 'none',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    color: '#4d5a53',
                    fontSize: '12px',
                    transition: 'background 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#dce0dd'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#eceeec'}
                >
                  ✕
                </button>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  height: '100%',
                  justifyContent: 'center'
                }}>
                  <img 
                    src={cnnDatasetFileUrl(selected.filename)} 
                    alt={selected.filename}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '220px',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.12)',
                      border: '2px solid #5a7c5e'
                    }}
                  />
                  <div style={{ textAlign: 'center', padding: '0 0.5rem' }}>
                    <p style={{ margin: 0, fontWeight: '600', fontSize: '0.72rem', color: '#1a221e', wordBreak: 'break-all' }}>
                      {selected.filename}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: '#5a7c5e', fontWeight: 'bold' }}>
                      Class: {probName(selected.prediction?.label || selected.label || '—')}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="dash-dataset-grid dash-dataset-grid--cnn">
              {items.map((row) => {
                const currentLabel = row.prediction?.label || row.label || '—'
                return (
                  <button
                    key={row.filename}
                    type="button"
                    className={`dash-dataset-select${selected?.filename === row.filename ? ' dash-dataset-select--on' : ''}`}
                    onClick={() => selectDatasetRow(row)}
                  >
                    <img src={cnnDatasetFileUrl(row.filename)} alt="" loading="lazy" />
                    <span className="dash-dataset-select__cap">{probName(currentLabel)}</span>
                  </button>
                )
              })}
            </div>
          </div>
          {!listLoading && items.length === 0 ? (
            <p style={{ margin: '0.75rem 0 0', fontSize: '0.78rem', color: '#8a938d' }}>No files in cnn_dataset_raw.</p>
          ) : null}
        </section>

        <section className="dash-widget">
          <h2 className="dash-widget__title">Detailed analysis</h2>
          {displayName ? (
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.72rem', color: '#5a6560', wordBreak: 'break-all' }}>
              <strong>Source:</strong> {displayName}
            </p>
          ) : null}
          {prediction ? (
            <>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#2a332f' }}>
                Top class: <strong>{probName(prediction.label)}</strong>
                {prediction.confidence != null ? ` (${Math.round(prediction.confidence * 100)}% confidence)` : null}
              </p>
              
              {/* If your backend passes down the temporal state machine alerts, render them styled nicely */}
              {prediction.temporal_alert || selected?.prediction?.temporal_alert ? (
                <div style={{ padding: '0.5rem', backgroundColor: '#f0f4f1', borderLeft: '3px solid #5a7c5e', fontSize: '0.75rem', marginBottom: '0.75rem', borderRadius: '4px' }}>
                  {prediction.temporal_alert || selected?.prediction?.temporal_alert}
                </div>
              ) : null}

              <div className="dash-chart-box dash-chart-box--cnn">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={barData} margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
                    <XAxis type="number" domain={[0, 1]} tickFormatter={(x) => `${Math.round(Number(x) * 100)}%`} tick={{ fontSize: 9 }} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9 }} />
                    <Tooltip formatter={(v) => `${(Number(v) * 100).toFixed(1)}%`} />
                    <Bar dataKey="value" fill="#5a7c5e" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p style={{ margin: '0.85rem 0 0', fontSize: '0.78rem', lineHeight: 1.6, color: '#4d5a53' }}>
                {interpretationText(prediction, displayName)}
              </p>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#8a938d' }}>Select a dataset patch to see scores.</p>
          )}
        </section>
      </div>
    </div>
  )
}