import React, { useState, useEffect } from 'react'
import { getHeatmapData } from '../api/client.js'
import { Loader2 } from 'lucide-react'

const PLANTS = ['Manesar', 'Gurugram', 'Gujarat']
const COMPONENTS = [
  'Engine Assembly',
  'Transmission Assembly',
  'Brake System',
  'Suspension System',
  'Steering Assembly',
  'Fuel System',
  'Exhaust System',
  'Electrical Harness',
]

const SEVERITY_LEVELS = ['Critical', 'High', 'Medium', 'Low']

function getSeverityStyle(severity) {
  switch (severity) {
    case 'Critical':
      return { bg: 'bg-red-500', text: 'text-white', label: 'bg-red-500' }
    case 'High':
      return { bg: 'bg-orange-400', text: 'text-white', label: 'bg-orange-400' }
    case 'Medium':
      return { bg: 'bg-yellow-300', text: 'text-gray-800', label: 'bg-yellow-300' }
    case 'Low':
      return { bg: 'bg-green-400', text: 'text-white', label: 'bg-green-400' }
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-400', label: 'bg-gray-100' }
  }
}

export default function PlantHeatmap() {
  const [heatmapData, setHeatmapData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tooltip, setTooltip] = useState(null) // { plant, component, x, y, data }

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const res = await getHeatmapData()
        setHeatmapData(res.data || [])
      } catch (e) {
        setError(e.response?.data?.detail || e.message || 'Failed to load heatmap')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Build lookup: { "Manesar:Engine Assembly": { max_severity, count, breakdown } }
  const cellLookup = {}
  heatmapData.forEach(item => {
    const key = `${item.plant}:${item.component}`
    cellLookup[key] = item
  })

  function getCellData(plant, component) {
    return cellLookup[`${plant}:${component}`] || null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={28} className="animate-spin" style={{ color: '#00C4A7' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-[#F4F7FB] min-h-full relative">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Plant Heatmap</h1>
        <p className="text-sm text-gray-500 mt-1">
          Deviation severity by plant and component. Hover cells for breakdown.
        </p>
      </div>

      {/* Heatmap card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 overflow-x-auto">
        {/* Grid */}
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `200px repeat(${PLANTS.length}, minmax(120px, 1fr))`,
          }}
        >
          {/* Header row */}
          <div /> {/* empty top-left cell */}
          {PLANTS.map(plant => (
            <div
              key={plant}
              className="text-center text-sm font-bold py-2 px-3 rounded-lg"
              style={{ backgroundColor: '#0D1B3E', color: '#fff' }}
            >
              {plant}
            </div>
          ))}

          {/* Component rows */}
          {COMPONENTS.map(component => (
            <React.Fragment key={component}>
              {/* Component label */}
              <div className="flex items-center text-sm font-medium text-gray-700 pr-3 py-1">
                {component}
              </div>

              {/* Plant cells */}
              {PLANTS.map(plant => {
                const cellData = getCellData(plant, component)
                const { bg, text } = getSeverityStyle(cellData?.max_severity)
                const count = cellData?.count ?? null

                return (
                  <div
                    key={`${plant}:${component}`}
                    className={`${bg} ${text} rounded-lg h-14 flex items-center justify-center text-lg font-bold cursor-pointer transition-transform hover:scale-105 relative`}
                    onMouseEnter={e => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setTooltip({ plant, component, cellData, rect })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    title={
                      cellData
                        ? `${plant} · ${component}: ${count} deviation(s), max severity: ${cellData.max_severity}`
                        : `${plant} · ${component}: No deviations`
                    }
                  >
                    {count !== null ? count : '—'}
                  </div>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-5 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Legend</div>
        <div className="flex flex-wrap gap-4">
          {[...SEVERITY_LEVELS, null].map(sev => {
            const { bg, text } = getSeverityStyle(sev)
            const label = sev || 'No Deviation'
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded ${bg}`} />
                <span className="text-sm text-gray-600">{label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tooltip overlay */}
      {tooltip && tooltip.cellData && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-4 min-w-[200px] pointer-events-none"
          style={{
            top: Math.max(0, tooltip.rect.top - 10),
            left: tooltip.rect.right + 8,
          }}
        >
          <div className="text-sm font-bold text-gray-800 mb-1">{tooltip.plant}</div>
          <div className="text-xs text-gray-500 mb-2">{tooltip.component}</div>
          <div className="text-xs space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Total deviations</span>
              <span className="font-semibold">{tooltip.cellData.count}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Max severity</span>
              <span className="font-semibold">{tooltip.cellData.max_severity}</span>
            </div>
            {tooltip.cellData.breakdown && Object.entries(tooltip.cellData.breakdown).map(([sev, cnt]) => (
              <div key={sev} className="flex justify-between gap-4">
                <span className="text-gray-500">{sev}</span>
                <span className="font-semibold">{cnt}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
