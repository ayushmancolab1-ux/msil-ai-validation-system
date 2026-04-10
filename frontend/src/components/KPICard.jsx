import React, { useState } from 'react'
import { Info } from 'lucide-react'

const COLOR_MAP = {
  red:    { bg: 'bg-red-100',    text: 'text-red-600' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600' },
  green:  { bg: 'bg-green-100',  text: 'text-green-600' },
  blue:   { bg: 'bg-blue-100',   text: 'text-blue-600' },
  teal:   { bg: 'bg-teal-100',   text: 'text-teal-600' },
}

export default function KPICard({ title, value, subtitle, icon: Icon, color = 'blue', tooltip }) {
  const { bg, text } = COLOR_MAP[color] || COLOR_MAP.blue
  const [showTip, setShowTip] = useState(false)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-4 relative">
      {Icon && (
        <div className={`${bg} ${text} rounded-full p-3 shrink-0`}>
          <Icon size={22} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-2xl font-bold text-gray-900 leading-tight truncate">{value}</div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-sm font-medium text-gray-700">{title}</span>
          {tooltip && (
            <div className="relative inline-block">
              <button
                onMouseEnter={() => setShowTip(true)}
                onMouseLeave={() => setShowTip(false)}
                className="text-gray-300 hover:text-gray-500 transition-colors focus:outline-none"
                aria-label={`Info: ${title}`}
              >
                <Info size={13} />
              </button>
              {showTip && (
                <div
                  className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-lg shadow-lg border border-gray-100 p-3 text-xs text-gray-600 leading-relaxed pointer-events-none"
                  style={{ backgroundColor: '#FFFFFF' }}
                >
                  {tooltip}
                  {/* Arrow */}
                  <div
                    className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent"
                    style={{ borderTopColor: '#FFFFFF' }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        {subtitle && (
          <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>
        )}
      </div>
    </div>
  )
}
