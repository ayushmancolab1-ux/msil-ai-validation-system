import React, { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Download, Printer, FileText, Loader2, AlertCircle } from 'lucide-react'
import { getReports, getValidationRun, exportReport } from '../api/client.js'
import RiskBadge from '../components/RiskBadge.jsx'

const SEVERITY_FILTERS = ['All', 'Critical', 'High', 'Medium', 'Low']

function formatIndianCurrency(amount) {
  if (amount == null) return '—'
  return '₹' + Math.round(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function formatDateTime(ts) {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return ts
  }
}

export default function AuditReport() {
  const { runId: paramRunId } = useParams()

  const [runs, setRuns] = useState([])
  const [selectedRunId, setSelectedRunId] = useState(paramRunId || '')
  const [runData, setRunData] = useState(null)
  const [loadingRuns, setLoadingRuns] = useState(true)
  const [loadingRun, setLoadingRun] = useState(false)
  const [error, setError] = useState(null)
  const [severityFilter, setSeverityFilter] = useState('All')
  const [exporting, setExporting] = useState(false)

  // Fetch list of all runs
  useEffect(() => {
    async function fetchRuns() {
      setLoadingRuns(true)
      try {
        const res = await getReports()
        const list = res.data?.runs || res.data || []
        setRuns(Array.isArray(list) ? list : [])
      } catch {
        setRuns([])
      } finally {
        setLoadingRuns(false)
      }
    }
    fetchRuns()
  }, [])

  // Fetch selected run data
  useEffect(() => {
    if (!selectedRunId) {
      setRunData(null)
      return
    }
    setLoadingRun(true)
    setError(null)
    getValidationRun(selectedRunId)
      .then(res => setRunData(res.data))
      .catch(e => setError(e.response?.data?.detail || e.message || 'Failed to load run'))
      .finally(() => setLoadingRun(false))
  }, [selectedRunId])

  // When paramRunId changes (route change), update selectedRunId
  useEffect(() => {
    if (paramRunId) setSelectedRunId(paramRunId)
  }, [paramRunId])

  const deviations = useMemo(() => runData?.deviations || [], [runData])

  const filteredDeviations = useMemo(() => {
    if (severityFilter === 'All') return deviations
    return deviations.filter(d => d.severity === severityFilter)
  }, [deviations, severityFilter])

  async function handleExport() {
    if (!selectedRunId) return
    setExporting(true)
    try {
      const res = await exportReport(selectedRunId)
      const blob = new Blob([res.data], { type: res.headers['content-type'] || 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-report-${selectedRunId}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError('Export failed: ' + (e.response?.data?.detail || e.message))
    } finally {
      setExporting(false)
    }
  }

  const thClass = 'px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap'
  const tdClass = 'px-3 py-2.5 text-sm text-gray-700'

  return (
    <div className="p-6 bg-[#F4F7FB] min-h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Report</h1>
          <p className="text-sm text-gray-500 mt-1">
            Complete deviation log for compliance and quality records.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleExport}
            disabled={!selectedRunId || exporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ borderColor: '#0D1B3E', color: '#0D1B3E' }}
          >
            {exporting ? (
              <><Loader2 size={15} className="animate-spin" /> Exporting…</>
            ) : (
              <><Download size={15} /> Export CSV</>
            )}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: '#0D1B3E' }}
          >
            <Printer size={15} />
            Print
          </button>
        </div>
      </div>

      {/* Run selector (only if no paramRunId) */}
      {!paramRunId && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-5 no-print">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Select Validation Run</label>
          <div className="flex items-center gap-3">
            <select
              value={selectedRunId}
              onChange={e => setSelectedRunId(e.target.value)}
              className="flex-1 max-w-sm rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none"
              disabled={loadingRuns}
            >
              <option value="">— Select a run —</option>
              {runs.map(run => {
                const id = run.id || run.run_id
                return (
                  <option key={id} value={id}>
                    {id} · {run.vehicle_model || ''} · {run.plant || ''} · {formatDateTime(run.created_at)}
                  </option>
                )
              })}
            </select>
            {loadingRuns && <Loader2 size={16} className="animate-spin text-gray-400" />}
          </div>
        </div>
      )}

      {/* Severity filter */}
      <div className="flex flex-wrap gap-2 mb-5 no-print">
        {SEVERITY_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setSeverityFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              severityFilter === f
                ? 'text-white border-transparent'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
            style={severityFilter === f ? { backgroundColor: '#0D1B3E', borderColor: '#0D1B3E' } : {}}
          >
            {f}
            {f !== 'All' && deviations.length > 0 && (
              <span className="ml-1 opacity-70">
                ({deviations.filter(d => d.severity === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* Print header (hidden on screen) */}
      <div className="hidden print:block mb-6">
        <div className="text-2xl font-bold text-gray-900">MSIL AI Validation — Audit Report</div>
        {runData && (
          <div className="text-sm text-gray-600 mt-1">
            Run: {selectedRunId} · {runData.vehicle_model} · {runData.plant} · {formatDateTime(runData.created_at)}
          </div>
        )}
      </div>

      {/* Main table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden print-full">
        {loadingRun ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin" style={{ color: '#00C4A7' }} />
          </div>
        ) : !selectedRunId ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <FileText size={40} />
            <div className="text-sm">Select a validation run to view the audit report</div>
          </div>
        ) : filteredDeviations.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No deviations found for this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className={thClass}>Run ID</th>
                  <th className={thClass}>Vehicle</th>
                  <th className={thClass}>Plant</th>
                  <th className={thClass}>Component</th>
                  <th className={thClass}>Field</th>
                  <th className={thClass}>Drawing Value</th>
                  <th className={thClass}>WIS Value</th>
                  <th className={thClass}>Severity</th>
                  <th className={thClass}>Cost Impact</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredDeviations.map(dev => (
                  <tr key={dev.id} className="hover:bg-gray-50 transition-colors">
                    <td className={`${tdClass} font-mono text-xs text-gray-400`}>
                      {selectedRunId}
                    </td>
                    <td className={tdClass}>{runData?.vehicle_model || '—'}</td>
                    <td className={tdClass}>{runData?.plant || '—'}</td>
                    <td className={tdClass}>{dev.component || '—'}</td>
                    <td className={tdClass}>{dev.field_name || '—'}</td>
                    <td className={`${tdClass} font-mono`}>{dev.drawing_value ?? '—'}</td>
                    <td className={`${tdClass} font-mono text-red-600`}>{dev.wis_value ?? '—'}</td>
                    <td className={tdClass}>
                      <RiskBadge severity={dev.severity} />
                    </td>
                    <td className={tdClass}>{formatIndianCurrency(dev.cost_impact)}</td>
                    <td className={tdClass}>
                      {dev.acknowledged ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                          Acknowledged
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className={`${tdClass} text-xs text-gray-400 whitespace-nowrap`}>
                      {formatDateTime(dev.created_at || runData?.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary row */}
      {selectedRunId && !loadingRun && filteredDeviations.length > 0 && (
        <div className="mt-4 text-sm text-gray-500 text-right">
          Showing {filteredDeviations.length} of {deviations.length} deviations
          {severityFilter !== 'All' && ` (filtered: ${severityFilter})`}
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
        Generated by MSIL AI Validation System · MSIL_DE_DX3 · Confidential
      </div>
    </div>
  )
}
