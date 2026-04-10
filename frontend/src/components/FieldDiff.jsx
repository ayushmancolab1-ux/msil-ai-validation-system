import React from 'react'

export default function FieldDiff({
  fieldName,
  drawingValue,
  wisValue,
  deviationMagnitude,
  isDeviation,
}) {
  return (
    <div className="flex gap-4">
      {/* Drawing side */}
      <div className="flex-1">
        <div className="text-xs font-medium text-gray-500 mb-1">Drawing (Master)</div>
        <div
          className={`rounded-lg p-4 border ${
            isDeviation
              ? 'bg-green-50 border-green-200'
              : 'bg-gray-50 border-gray-200'
          }`}
        >
          <div className="text-xs text-gray-400 mb-1">{fieldName}</div>
          <div
            className={`text-xl font-bold font-mono ${
              isDeviation ? 'text-green-700' : 'text-gray-700'
            }`}
          >
            {drawingValue ?? '—'}
          </div>
        </div>
      </div>

      {/* WIS side */}
      <div className="flex-1">
        <div className="text-xs font-medium text-gray-500 mb-1">WIS (Current)</div>
        <div
          className={`rounded-lg p-4 border ${
            isDeviation
              ? 'bg-red-50 border-red-200'
              : 'bg-gray-50 border-gray-200'
          }`}
        >
          <div className="text-xs text-gray-400 mb-1">{fieldName}</div>
          <div
            className={`text-xl font-bold font-mono ${
              isDeviation ? 'text-red-700' : 'text-gray-700'
            }`}
          >
            {wisValue ?? '—'}
          </div>
        </div>
      </div>

      {/* Deviation magnitude pill */}
      {isDeviation && deviationMagnitude != null && (
        <div className="self-end">
          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200 whitespace-nowrap">
            Δ {deviationMagnitude}
          </span>
        </div>
      )}
    </div>
  )
}
