import React from 'react'
import { FileText, Cpu, ArrowLeftRight, Shield, Check } from 'lucide-react'

const STEPS = [
  { label: 'Document Ingestion', icon: FileText },
  { label: 'Field Extraction OCR+NLP', icon: Cpu },
  { label: 'Cross-Reference Comparison', icon: ArrowLeftRight },
  { label: 'Risk Scoring & Classification', icon: Shield },
]

export default function PipelineSteps({ currentStep }) {
  const progressPercent = Math.min(100, (currentStep / 4) * 100)

  return (
    <div className="w-full">
      {/* Steps row */}
      <div className="flex items-start justify-between relative">
        {/* Connecting line behind steps */}
        <div
          className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200"
          style={{ zIndex: 0 }}
        />

        {STEPS.map((step, idx) => {
          const stepNum = idx // 0-indexed
          const isCompleted = stepNum < currentStep
          const isActive = stepNum === currentStep - 1 && currentStep > 0 && currentStep <= 4
          const isPending = !isCompleted && !isActive

          return (
            <div
              key={step.label}
              className="flex flex-col items-center gap-2 flex-1 relative"
              style={{ zIndex: 1 }}
            >
              {/* Circle */}
              {isCompleted ? (
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                  <Check size={18} className="text-white" />
                </div>
              ) : isActive ? (
                <div
                  className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
                  style={{ borderColor: '#00C4A7', borderTopColor: 'transparent' }}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <step.icon size={18} className="text-gray-400" />
                </div>
              )}

              {/* Label */}
              <span
                className={`text-xs text-center leading-tight max-w-[90px] ${
                  isCompleted
                    ? 'text-green-600 font-medium'
                    : isActive
                    ? 'font-semibold'
                    : 'text-gray-400'
                }`}
                style={isActive ? { color: '#00C4A7' } : {}}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-6 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${progressPercent}%`, backgroundColor: '#00C4A7' }}
        />
      </div>
      <div className="mt-1 text-right text-xs text-gray-400">
        {progressPercent.toFixed(0)}% complete
      </div>
    </div>
  )
}
