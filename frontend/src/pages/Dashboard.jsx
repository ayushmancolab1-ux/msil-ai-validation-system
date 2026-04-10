import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { AlertTriangle, CheckCircle, TrendingDown, DollarSign, ListChecks, Loader2 } from 'lucide-react'
import { getValidationRun, getDashboardSummary } from '../api/client.js'
import KPICard from '../components/KPICard.jsx'
import DeviationTable from '../components/DeviationTable.jsx'

const SEVERITY_COLORS = {
  Critical: '#EF4444',
  High: '#F97316',
  Medium: '#EAB308',
  Low: '#22C55E',
}

function formatIndianCurrency(amount) {
  if (amount == null) return '₹0'
  const rounded = Math.round(amount)
  return '₹' + rounded.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function formatPercentage(matched, total) {
  if (!total) return '0.0%'
  return ((matched / total) * 100).toFixed(1) + '%'
}

function countBySeverity(deviations, severity) {
  return deviations.filter(d => d.severity === severity).length
}

function groupByComponent(deviations) {
  const map = {}
  deviations.forEach(d => {
    const key = d.component || 'Unknown'
    map[key] = (map[key] || 0) + 1
  })
  return Object.entries(map).map(([name, count]) => ({ name, count }))
}

function CustomPieLabel({ cx, cy, total }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} dy="-0.4em" fontSize="28" fontWeight="bold" fill="#1F2937">
        {total}
      </tspan>
      <tspan x={cx} dy="1.4em" fontSize="11" fill="#6B7280">
        deviations
      </tspan>
    </text>
  )
}

export default function Dashboard() {
  const { runId } = useParams()
  const navigate = useNavigate()
  const [runData, setRunData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        if (runId) {
          const res = await getValidationRun(runId)
          setRunData(res.data)
        } else {
          const res = await getDashboardSummary()
          setRunData(res.data)
        }
      } catch (e) {
        setError(e.response?.data?.detail || e.message || 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [runId])

  const deviations = useMemo(() => runData?.deviations || [], [runData])
  // Backend field names: total_params, matched, cost_impact_inr (per deviation)
  const totalParams = runData?.total_params ?? runData?.total_parameters ?? (deviations.length + (runData?.matched ?? runData?.matched_count ?? 0))
  const matchedCount = runData?.matched ?? runData?.matched_count ?? Math.max(0, totalParams - deviations.length)
  const criticalCount = countBySeverity(deviations, 'Critical')
  const highCount = countBySeverity(deviations, 'High')
  const mediumCount = countBySeverity(deviations, 'Medium')
  const lowCount = countBySeverity(deviations, 'Low')
  const costImpact = runData?.cost_impact ?? deviations.reduce((s, d) => s + (d.cost_impact_inr ?? d.cost_impact ?? 0), 0)
  const matchRate = formatPercentage(matchedCount, totalParams)

  const pieData = [
    { name: 'Critical', value: criticalCount },
    { name: 'High', value: highCount },
    { name: 'Medium', value: mediumCount },
    { name: 'Low', value: lowCount },
  ].filter(d => d.value > 0)

  const barData = groupByComponent(deviations)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin" style={{ color: '#00C4A7' }} />
          <div className="text-sm text-gray-500">Loading dashboard…</div>
        </div>
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
    <div className="p-6 bg-[#F4F7FB] min-h-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Validation Results</h1>
        {runData && (
          <p className="text-sm text-gray-500 mt-1">
            {runData.vehicle_model && <span>{runData.vehicle_model}</span>}
            {runData.plant && <span> · {runData.plant}</span>}
            {runData.component && <span> · {runData.component}</span>}
            {runId && <span className="ml-2 font-mono text-gray-400 text-xs">({runId})</span>}
            {runData.created_at && (
              <span className="ml-2 text-gray-400 text-xs">
                {new Date(runData.created_at).toLocaleString()}
              </span>
            )}
          </p>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <KPICard
          title="Total Parameters"
          value={totalParams}
          subtitle="Fields checked"
          icon={ListChecks}
          color="blue"
          tooltip="Total number of engineering fields compared between the Assembly Drawing (master truth) and the Work Instruction Sheet in this validation run."
        />
        <KPICard
          title="Match Rate"
          value={matchRate}
          subtitle={`${matchedCount} matched`}
          icon={CheckCircle}
          color="green"
          tooltip="Percentage of compared fields where the Drawing and WIS values are within acceptable engineering tolerance. Higher is better — 100% means the WIS is fully aligned with the drawing."
        />
        <KPICard
          title="Critical Deviations"
          value={criticalCount}
          subtitle="Immediate action"
          icon={AlertTriangle}
          color="red"
          tooltip="Safety-critical deviations — typically torque specs on brake, suspension, or steering components. These require immediate WIS correction and production hold before the next run."
        />
        <KPICard
          title="High Deviations"
          value={highCount}
          subtitle="Needs review"
          icon={TrendingDown}
          color="orange"
          tooltip="Dimensional tolerance deviations (bore, gap, true position) that exceed engineering limits. These can cause fit/function issues and need Engineering sign-off before clearing."
        />
        <KPICard
          title="Cost Impact"
          value={formatIndianCurrency(costImpact)}
          subtitle="Estimated rework"
          icon={DollarSign}
          color="teal"
          tooltip="Estimated rework cost if deviations reach production — calculated as: Critical ₹45,000 · High ₹28,000 · Medium ₹12,000 · Low ₹4,000 per deviation."
        />
      </div>

      {/* Middle row: Table + Pie */}
      <div className="flex gap-5 mb-6">
        {/* Deviation table — 60% */}
        <div className="flex-[3] bg-white rounded-xl border border-gray-100 shadow-sm p-5 min-w-0">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Deviations</h2>
          <DeviationTable
            deviations={deviations}
            onViewDetails={dev => navigate(`/deviation/${runId}/${dev.id}`)}
          />
        </div>

        {/* Donut pie — 40% */}
        <div className="flex-[2] bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Severity Distribution</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={false}
                >
                  {pieData.map(entry => (
                    <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name]} />
                  ))}
                </Pie>
                <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central">
                  <tspan fontSize="26" fontWeight="bold" fill="#1F2937">{deviations.length}</tspan>
                </text>
                <text x="50%" y="57%" textAnchor="middle" dominantBaseline="central">
                  <tspan fontSize="11" fill="#6B7280">deviations</tspan>
                </text>
                <Tooltip formatter={(value, name) => [value, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm">
              No deviations found
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: Bar chart + summary + buttons */}
      <div className="flex gap-5">
        {/* Bar chart */}
        <div className="flex-[3] bg-white rounded-xl border border-gray-100 shadow-sm p-5 min-w-0">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Deviations by Component</h2>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 0, right: 10, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#00C4A7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
              No data
            </div>
          )}
        </div>

        {/* Summary + buttons */}
        <div className="flex-[2] flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex-1">
            <h2 className="text-base font-semibold text-gray-800 mb-3">Summary</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              <span className="text-red-600 font-bold">{criticalCount} critical</span> deviation
              {criticalCount !== 1 ? 's' : ''} require immediate WIS correction before next production run.
            </p>
            {highCount > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                Additionally, <span className="text-orange-600 font-semibold">{highCount} high-severity</span> deviation
                {highCount !== 1 ? 's' : ''} should be reviewed within 48 hours.
              </p>
            )}
            <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
              Estimated cost impact: {formatIndianCurrency(costImpact)}
            </div>
          </div>

          <button
            onClick={() => navigate(`/audit/${runId}`)}
            className="w-full py-3 rounded-xl text-sm font-semibold border-2 transition-all hover:bg-gray-50"
            style={{ borderColor: '#0D1B3E', color: '#0D1B3E' }}
          >
            View Full Audit Report
          </button>

          <button
            onClick={() => navigate('/heatmap')}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: '#00C4A7' }}
          >
            View Plant Heatmap
          </button>
        </div>
      </div>
    </div>
  )
}
