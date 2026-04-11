import { useCallback, useMemo, useState } from 'react'
import { postAnalyze, postTimelapseUrl } from '../../api/forestApi'
import { computeForestInsights } from '../../utils/forestInsights'
import { pushLocationAlert } from '../../utils/locationAlerts'
import { DashboardContext } from './dashboardContextCore'

export function DashboardProvider({ children }) {
  const [lat, setLat] = useState(28.2096)
  const [lon, setLon] = useState(83.9856)
  const [startDate, setStartDate] = useState('2022-01-01')
  const [endDate, setEndDate] = useState('2024-12-01')
  const [series, setSeries] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [timelapseUrl, setTimelapseUrl] = useState('')
  const [timelapseLoading, setTimelapseLoading] = useState(false)
  const [timelapseErr, setTimelapseErr] = useState('')

  const runAnalysis = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const res = await postAnalyze({ lat, lon, start_date: startDate, end_date: endDate })
      const data = Array.isArray(res.data) ? res.data : []
      setSeries(data)
      setLastUpdated(new Date())
      if (data.length > 0) {
        const ins = computeForestInsights(data, null)
        pushLocationAlert({
          id: crypto.randomUUID(),
          lat,
          lon,
          startDate,
          endDate,
          at: new Date().toISOString(),
          riskScore: ins.riskScore,
          ndviDelta: ins.ndviDelta,
          sampleCount: data.length,
        })
      }
    } catch (e) {
      setError(e.message || 'Analysis failed')
      setSeries([])
    } finally {
      setLoading(false)
    }
  }, [lat, lon, startDate, endDate])

  const loadTimelapse = useCallback(async () => {
    setTimelapseErr('')
    setTimelapseLoading(true)
    setTimelapseUrl('')
    try {
      const sy = new Date(startDate).getFullYear()
      const ey = new Date(endDate).getFullYear()
      const res = await postTimelapseUrl({
        lat,
        lon,
        start_year: Math.min(sy, ey),
        end_year: Math.max(sy, ey),
      })
      setTimelapseUrl(res.url || '')
    } catch (e) {
      setTimelapseErr(e.message || 'Timelapse unavailable')
    } finally {
      setTimelapseLoading(false)
    }
  }, [lat, lon, startDate, endDate])

  const value = useMemo(
    () => ({
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
    }),
    [
      lat,
      lon,
      startDate,
      endDate,
      series,
      loading,
      error,
      lastUpdated,
      timelapseUrl,
      timelapseLoading,
      timelapseErr,
      runAnalysis,
      loadTimelapse,
    ],
  )

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}
