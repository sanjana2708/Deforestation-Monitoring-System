import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { postClassifyUpload, getCnnDatasetItems } from '../../api/forestApi'
import { cnnDatasetFileUrl } from '../../api/client'
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
  if (label === 'logging_road') {
    parts.push('The model leans toward linear clearing or access infrastructure—verify against roads and skid trails in high resolution.')
  } else if (label === 'mining') {
    parts.push('Mining-like texture scores high; rule out bare rock and bright soils that confuse spectral signatures.')
  } else if (label === 'agriculture') {
    parts.push('Agriculture class often overlaps with young fallow or plantation geometry; check cadastre and crop calendars.')
  } else if (label === 'healthy_forest') {
    parts.push('Healthy forest is the model’s read of dense canopy in the patch; still compare with the NDVI series for the full AOI.')
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

  const loadList = useCallback(async () => {
    setListLoading(true)
    try {
      const res = await getCnnDatasetItems({ limit: 60, refresh: false })
      setItems(Array.isArray(res.items) ? res.items : [])
    } catch {
      setItems([])
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    loadList()
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
    setPrediction(row.prediction || null)
    setUploadName(row.filename)
    setClassifyErr('')
  }

  const handleHarvest = async () => {
    try {
      // 3. Directly use the values from context
      const response = await fetch('http://localhost:8000/trigger-harvest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          lat: parseFloat(lat), 
          lon: parseFloat(lon),
          start: startDate,
          end: endDate 
        })
      });

      if (!response.ok) throw new Error("Harvest failed");
      alert("Harvesting started for coordinates: " + lat + ", " + lon);
    } catch (e) {
      alert("Failed to start harvest: " + e.message);
    }
  };

  const displayName = selected?.filename || uploadName

  return (
    <div className="dash-cnn-page">
      <section className="dash-widget">
        <h2 className="dash-widget__title">Detailed Analysis</h2>
        <p style={{ margin: '0 0 0.65rem', fontSize: '0.78rem', color: '#7a857e', lineHeight: 1.55 }}>
          Runs the CNN on any 224×224-style satellite chip. Results show full softmax outputs for all forest-change classes.
        </p>
        <button 
          className="dash-btn dash-btn--primary" 
          onClick={handleHarvest}
        >
          Run Detailed Analysis
        </button>
        {classifyErr ? (
          <p className="dash-err" role="alert">
            {classifyErr}
          </p>
        ) : null}
        <div className="dash-widget__footer">MobileNetV2 forest model</div>
      </section>

      <div className="dash-cnn-split">
        <section className="dash-widget">
          <h2 className="dash-widget__title">Dataset patches (NDVI-drop harvest)</h2>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.72rem', color: '#7a857e' }}>
            Click a tile to load its saved prediction into the analysis panel.
          </p>
          <button type="button" className="dash-btn dash-btn--ghost dash-btn--small" disabled={listLoading} onClick={() => loadList()}>
            {listLoading ? 'Refreshing…' : 'Reload list'}
          </button>
          <div className="dash-dataset-grid dash-dataset-grid--cnn">
            {items.map((row) => (
              <button
                key={row.filename}
                type="button"
                className={`dash-dataset-select${selected?.filename === row.filename ? ' dash-dataset-select--on' : ''}`}
                onClick={() => selectDatasetRow(row)}
              >
                <img src={cnnDatasetFileUrl(row.filename)} alt="" loading="lazy" />
                <span className="dash-dataset-select__cap">{probName(row.prediction?.label || '—')}</span>
              </button>
            ))}
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
