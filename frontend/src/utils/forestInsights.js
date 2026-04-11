const LABEL_RISK = {
  mining: 28,
  logging_road: 22,
  agriculture: 12,
  other: 8,
  healthy_forest: -18,
}

/**
 * @param {{ time: string, NDVI: number }[]} series
 * @param {{ label?: string, confidence?: number, all_probs?: Record<string, number> } | null} prediction
 */
export function computeForestInsights(series, prediction) {
  const points = (series || []).filter((p) => p != null && typeof p.NDVI === 'number' && !Number.isNaN(p.NDVI))

  const messages = []
  let risk = 22

  if (points.length === 0) {
    messages.push('Run NDVI analysis for this location to see canopy trends from Earth Engine.')
    if (prediction?.label) {
      risk += LABEL_RISK[prediction.label] ?? 6
      risk = Math.max(0, Math.min(100, Math.round(risk)))
      const conf = prediction.confidence != null ? Math.round(prediction.confidence * 100) : null
      messages.push(
        `Model patch classification: ${humanLabel(prediction.label)}${conf != null ? ` (${conf}% confidence)` : ''}. Use this as a cue—not a substitute for site verification.`,
      )
    } else {
      messages.push('Upload a satellite patch image to run on-device classification (agriculture, forest, roads, mining, etc.).')
    }
    return { messages, riskScore: risk, ndviDelta: null, meanNdvi: null }
  }

  const first = points[0].NDVI
  const last = points[points.length - 1].NDVI
  const delta = last - first
  const meanNdvi = points.reduce((s, p) => s + p.NDVI, 0) / points.length

  if (delta < -0.06) {
    messages.push(
      'Vegetation index has declined over the selected period—possible canopy loss, stress, or seasonal dry-down. Cross-check with cloud-free months and field data.',
    )
    risk += Math.min(38, Math.round(Math.abs(delta) * 120))
  } else if (delta > 0.06) {
    messages.push('NDVI is trending upward—vegetation may be recovering or seasonal green-up is dominant in this window.')
    risk -= 12
  } else {
    messages.push('NDVI is relatively stable across the sampled months—no strong short-term decline detected in this series.')
  }

  if (last < 0.3) {
    messages.push('Recent mean NDVI is low for a closed forest—verify snow, clouds, or non-forest land cover in the AOI.')
    risk += 18
  } else if (last > 0.55) {
    messages.push('Recent NDVI suggests dense, healthy green cover in the sampled window.')
    risk -= 8
  }

  if (prediction?.label) {
    const bump = LABEL_RISK[prediction.label] ?? 6
    risk += bump
    const conf = prediction.confidence != null ? Math.round(prediction.confidence * 100) : null
    messages.push(
      `Model patch classification: ${humanLabel(prediction.label)}${conf != null ? ` (${conf}% confidence)` : ''}. Use this as a cue—not a substitute for site verification.`,
    )
  } else {
    messages.push('Upload a satellite patch image to run on-device classification (agriculture, forest, roads, mining, etc.).')
  }

  risk = Math.max(0, Math.min(100, Math.round(risk)))

  return {
    messages,
    riskScore: risk,
    ndviDelta: delta,
    meanNdvi,
  }
}

function humanLabel(key) {
  const map = {
    healthy_forest: 'healthy forest',
    logging_road: 'logging / road',
    agriculture: 'agriculture',
    mining: 'mining',
    other: 'other',
  }
  return map[key] || key.replace(/_/g, ' ')
}
