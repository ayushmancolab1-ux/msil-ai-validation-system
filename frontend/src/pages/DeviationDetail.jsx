import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Lightbulb, CheckCircle, Loader2, AlertTriangle } from 'lucide-react'
import { getValidationRun, acknowledgeDeviation } from '../api/client.js'
import RiskBadge from '../components/RiskBadge.jsx'
import FieldDiff from '../components/FieldDiff.jsx'

function formatIndianCurrency(amount) {
  if (amount == null) return '₹0'
  return '₹' + Math.round(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function getDeviationPercentage(drawingVal, wisVal) {
  const d = parseFloat(drawingVal)
  const w = parseFloat(wisVal)
  if (isNaN(d) || isNaN(w) || d === 0) return null
  return (((Math.abs(d - w)) / Math.abs(d)) * 100).toFixed(1) + '%'
}

export default function DeviationDetail() {
  const { runId, deviationId } = useParams()
  const navigate = useNavigate()
  const [deviation, setDeviation] = useState(null)
  const [runData, setRunData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [acknowledging, setAcknowledging] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const res = await getValidationRun(runId)
        const run = res.data
        setRunData(run)
        const dev = (run.deviations || []).find(
          d => String(d.id) === String(deviationId)
        )
        if (!dev) {
          setError('Deviation not found')
        } else {
          setDeviation(dev)
          setAcknowledged(!!dev.acknowledged)
        }
      } catch (e) {
        setError(e.response?.data?.detail || e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [runId, deviationId])

  async function handleAcknowledge() {
    setAcknowledging(true)
    try {
      await acknowledgeDeviation(deviationId)
      setAcknowledged(true)
      setDeviation(prev => ({ ...prev, acknowledged: true }))
    } catch (e) {
      // Silently handle — show error inline if needed
      setError('Failed to acknowledge: ' + (e.response?.data?.detail || e.message))
    } finally {
      setAcknowledging(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={28} className="animate-spin" style={{ color: '#00C4A7' }} />
      </div>
    )
  }

  if (error && !deviation) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {error}
        </div>
      </div>
    )
  }

  const pct = deviation
    ? getDeviationPercentage(deviation.drawing_value, deviation.wis_value)
    : null

  const recommendation = deviation?.recommendation
    || `Update the Work Instruction Sheet for field "${deviation?.field_name}" in ${deviation?.component} to match the Assembly Drawing value of ${deviation?.drawing_value}. Coordinate with the engineering team before next production run.`

  return (
    <div className="p-6 max-w-4xl mx-auto min-h-full">
      {/* Back button */}
      <button
        onClick={() => navigate(`/dashboard/${runId}`)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">
              {deviation?.component || 'Unknown Component'}
            </h1>
            <span className="text-gray-400">·</span>
            <span className="text-base font-medium text-gray-600">
              {deviation?.field_name || 'Unknown Field'}
            </span>
            {deviation?.severity && <RiskBadge severity={deviation.severity} />}
          </div>
          {runData && (
            <p className="text-xs text-gray-400 mt-1">
              {runData.vehicle_model} · {runData.plant} · Run {runId}
            </p>
          )}
        </div>

        {/* Acknowledge button / badge */}
        <div className="shrink-0">
          {acknowledged ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-sm font-semibold border border-green-200">
              <CheckCircle size={15} />
              Acknowledged
            </span>
          ) : (
            <button
              onClick={handleAcknowledge}
              disabled={acknowledging}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: '#1D4ED8' }}
            >
              {acknowledging ? (
                <><Loader2 size={14} className="animate-spin" /> Acknowledging…</>
              ) : (
                'Acknowledge Deviation'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error (non-blocking) */}
      {error && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
          <AlertTriangle size={15} />
          {error}
        </div>
      )}

      {/* Value comparison panels */}
      {deviation && (
        <>
          <div className="grid grid-cols-2 gap-5 mb-5">
            {/* Drawing panel */}
            <div className="bg-white rounded-xl border-l-4 border-green-500 border border-gray-100 shadow-sm p-6">
              <div className="text-xs font-bold uppercase tracking-wider text-green-600 mb-3">
                Assembly Drawing (Master Truth)
              </div>
              <div className="bg-green-50 rounded-lg p-4 mb-4">
                <div className="text-xs text-gray-500 mb-1">{deviation.field_name}</div>
                <div className="text-3xl font-bold font-mono text-green-800">
                  {deviation.drawing_value ?? '—'}
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span className="text-gray-400">Component</span>
                  <span className="font-medium">{deviation.component || '—'}</span>
                </div>
                {runData?.vehicle_model && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Vehicle</span>
                    <span className="font-medium">{runData.vehicle_model}</span>
                  </div>
                )}
                {runData?.plant && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Plant</span>
                    <span className="font-medium">{runData.plant}</span>
                  </div>
                )}
              </div>
            </div>

            {/* WIS panel */}
            <div className="bg-white rounded-xl border-l-4 border-red-500 border border-gray-100 shadow-sm p-6">
              <div className="text-xs font-bold uppercase tracking-wider text-red-600 mb-3">
                Work Instruction Sheet (Current)
              </div>
              <div className="bg-red-50 rounded-lg p-4 mb-4">
                <div className="text-xs text-gray-500 mb-1">{deviation.field_name}</div>
                <div className="text-3xl font-bold font-mono text-red-700">
                  {deviation.wis_value ?? '—'}
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span className="text-gray-400">Deviation</span>
                  <span className="font-semibold text-red-600">
                    Δ {deviation.deviation_magnitude ?? '—'}
                  </span>
                </div>
                {pct && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">% Off</span>
                    <span className="font-semibold text-red-600">{pct} off</span>
                  </div>
                )}
                {deviation.cost_impact != null && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cost Impact</span>
                    <span className="font-semibold text-orange-600">
                      {formatIndianCurrency(deviation.cost_impact)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Deviation magnitude pill */}
          {(deviation.deviation_magnitude != null || pct) && (
            <div className="flex items-center gap-3 mb-5">
              <span className="px-3 py-1.5 rounded-full text-sm font-bold bg-red-100 text-red-700 border border-red-200">
                Δ {deviation.deviation_magnitude ?? '—'}
                {pct && <span className="ml-1 opacity-80">({pct} off)</span>}
              </span>
              <span className="text-sm text-gray-500">from drawing specification</span>
            </div>
          )}

          {/* FieldDiff visual */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-5">
            <div className="text-sm font-semibold text-gray-700 mb-3">Field Comparison</div>
            <FieldDiff
              fieldName={deviation.field_name}
              drawingValue={deviation.drawing_value}
              wisValue={deviation.wis_value}
              deviationMagnitude={deviation.deviation_magnitude}
              isDeviation={true}
            />
          </div>

          {/* Recommendation */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <Lightbulb size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-amber-800 mb-1">Recommendation</div>
                <p className="text-sm text-amber-700 leading-relaxed">{recommendation}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
