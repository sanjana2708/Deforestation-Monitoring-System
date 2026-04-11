import { useId } from 'react'

export default function RiskGauge({ value, label }) {
  const gid = useId().replace(/\W/g, '')
  const v = Math.max(0, Math.min(100, Math.round(Number(value) || 0)))
  const arcLen = 150.8
  const dash = (v / 100) * arcLen
  const gradId = `dg${gid}`

  return (
    <div className="risk-gauge" role="img" aria-label={`${label}: ${v} out of 100`}>
      <svg viewBox="0 0 120 72" className="risk-gauge__svg">
        <path
          d="M 12 60 A 48 48 0 0 1 108 60"
          fill="none"
          stroke="#e8ede9"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M 12 60 A 48 48 0 0 1 108 60"
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${arcLen}`}
        />
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5a7c5e" />
            <stop offset="100%" stopColor="#b8573d" />
          </linearGradient>
        </defs>
      </svg>
      <div className="risk-gauge__value">{v}</div>
      <div className="risk-gauge__cap">/ 100</div>
      <div className="risk-gauge__label">{label}</div>
    </div>
  )
}
