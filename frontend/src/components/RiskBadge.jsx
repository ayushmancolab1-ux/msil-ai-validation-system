import React from 'react'

const SEVERITY_CLASSES = {
  Critical: 'bg-red-100 text-red-800 border border-red-300',
  High: 'bg-orange-100 text-orange-800 border border-orange-300',
  Medium: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  Low: 'bg-green-100 text-green-800 border border-green-300',
}

export default function RiskBadge({ severity }) {
  const classes = SEVERITY_CLASSES[severity] || 'bg-gray-100 text-gray-700 border border-gray-300'
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${classes}`}>
      {severity}
    </span>
  )
}
