import React, { useState, useMemo } from 'react'
import RiskBadge from './RiskBadge.jsx'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

const SEVERITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 }
const SEVERITY_FILTERS = ['All', 'Critical', 'High', 'Medium', 'Low']

function SortIcon({ column, sortCol, sortDir }) {
  if (sortCol !== column) return <ChevronsUpDown size={13} className="text-gray-300 inline ml-1" />
  return sortDir === 'asc'
    ? <ChevronUp size={13} className="text-gray-600 inline ml-1" />
    : <ChevronDown size={13} className="text-gray-600 inline ml-1" />
}

export default function DeviationTable({ deviations = [], onViewDetails }) {
  const [sortCol, setSortCol] = useState('severity')
  const [sortDir, setSortDir] = useState('asc')
  const [severityFilter, setSeverityFilter] = useState('All')

  function handleSort(col) {
    if (sortCol === col) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    let list = severityFilter === 'All'
      ? deviations
      : deviations.filter(d => d.severity === severityFilter)

    return [...list].sort((a, b) => {
      let av, bv
      switch (sortCol) {
        case 'component':
          av = (a.component || '').toLowerCase()
          bv = (b.component || '').toLowerCase()
          break
        case 'field':
          av = (a.field_name || '').toLowerCase()
          bv = (b.field_name || '').toLowerCase()
          break
        case 'drawingValue':
          av = String(a.drawing_value || '')
          bv = String(b.drawing_value || '')
          break
        case 'wisValue':
          av = String(a.wis_value || '')
          bv = String(b.wis_value || '')
          break
        case 'deviation':
          av = parseFloat(a.deviation_magnitude) || 0
          bv = parseFloat(b.deviation_magnitude) || 0
          break
        case 'severity':
          av = SEVERITY_ORDER[a.severity] ?? 99
          bv = SEVERITY_ORDER[b.severity] ?? 99
          break
        default:
          av = ''
          bv = ''
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [deviations, sortCol, sortDir, severityFilter])

  const thClass = 'px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 whitespace-nowrap'
  const tdClass = 'px-3 py-2.5 text-sm text-gray-700'

  return (
    <div className="flex flex-col gap-3">
      {/* Severity filter buttons */}
      <div className="flex flex-wrap gap-2">
        {SEVERITY_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setSeverityFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              severityFilter === f
                ? 'text-white border-transparent'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
            style={
              severityFilter === f
                ? { backgroundColor: '#0D1B3E', borderColor: '#0D1B3E' }
                : {}
            }
          >
            {f}
            {f !== 'All' && (
              <span className="ml-1 opacity-70">
                ({deviations.filter(d => d.severity === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="min-w-full divide-y divide-gray-100 bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className={thClass} onClick={() => handleSort('component')}>
                Component <SortIcon column="component" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className={thClass} onClick={() => handleSort('field')}>
                Field <SortIcon column="field" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className={thClass} onClick={() => handleSort('drawingValue')}>
                Drawing Value <SortIcon column="drawingValue" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className={thClass} onClick={() => handleSort('wisValue')}>
                WIS Value <SortIcon column="wisValue" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className={thClass} onClick={() => handleSort('deviation')}>
                Deviation <SortIcon column="deviation" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className={thClass} onClick={() => handleSort('severity')}>
                Severity <SortIcon column="severity" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-400 text-sm">
                  No deviations found
                </td>
              </tr>
            ) : (
              filtered.map(dev => (
                <tr key={dev.id} className="hover:bg-gray-50 transition-colors">
                  <td className={tdClass}>{dev.component || '—'}</td>
                  <td className={tdClass}>{dev.field_name || '—'}</td>
                  <td className={`${tdClass} font-mono`}>{dev.drawing_value ?? '—'}</td>
                  <td className={`${tdClass} font-mono text-red-600`}>{dev.wis_value ?? '—'}</td>
                  <td className={tdClass}>
                    {dev.deviation_magnitude != null
                      ? <span className="text-orange-600 font-medium">Δ {dev.deviation_magnitude}</span>
                      : '—'}
                  </td>
                  <td className={tdClass}>
                    <RiskBadge severity={dev.severity} />
                  </td>
                  <td className={tdClass}>
                    <button
                      onClick={() => onViewDetails && onViewDetails(dev)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-all hover:text-white"
                      style={{ borderColor: '#00C4A7', color: '#00C4A7' }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#00C4A7'; e.currentTarget.style.color = '#fff' }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = '#00C4A7' }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
