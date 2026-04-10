import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getValidationRun } from '../api/client.js'
import PipelineSteps from '../components/PipelineSteps.jsx'
import { Loader2 } from 'lucide-react'

const STEP_DELAYS = [1500, 4000, 6000, 7500] // ms after mount to complete each step

export default function ValidationRun() {
  const { runId } = useParams()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [backendComplete, setBackendComplete] = useState(false)
  const animDoneRef = useRef(false)
  const backendDoneRef = useRef(false)
  const pollRef = useRef(null)

  // Step animation timers
  useEffect(() => {
    const timers = STEP_DELAYS.map((delay, idx) =>
      setTimeout(() => {
        setCurrentStep(idx + 1)
        if (idx === 3) {
          animDoneRef.current = true
          // If backend already done, navigate
          if (backendDoneRef.current) {
            navigate(`/dashboard/${runId}`)
          }
        }
      }, delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [runId, navigate])

  // Poll backend every 2s
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await getValidationRun(runId)
        const status = res.data?.status
        if (status === 'complete' || status === 'completed') {
          backendDoneRef.current = true
          setBackendComplete(true)
          clearInterval(pollRef.current)
          // If animation also done, navigate
          if (animDoneRef.current) {
            navigate(`/dashboard/${runId}`)
          }
        }
      } catch {
        // Ignore poll errors silently
      }
    }, 2000)
    return () => clearInterval(pollRef.current)
  }, [runId, navigate])

  const stepLabels = [
    'Initializing…',
    'Ingesting documents…',
    'Extracting fields via OCR + NLP…',
    'Cross-referencing drawing vs WIS…',
    'Scoring risks and classifying deviations…',
  ]

  const statusText = stepLabels[currentStep] || 'Processing…'

  return (
    <div className="min-h-full flex items-center justify-center p-8 bg-[#F4F7FB]">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Loader2
              size={22}
              className={currentStep < 4 ? 'animate-spin' : ''}
              style={{ color: '#00C4A7' }}
            />
            <h1 className="text-xl font-bold text-gray-900">Processing Validation</h1>
          </div>
          <p className="text-sm text-gray-400">
            Run ID: <span className="font-mono text-gray-600">{runId}</span>
          </p>
        </div>

        {/* Pipeline steps */}
        <PipelineSteps currentStep={currentStep} />

        {/* Status label */}
        <div className="mt-6 text-center">
          <span
            className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full ${
              currentStep < 4
                ? 'bg-blue-50 text-blue-700'
                : backendComplete
                ? 'bg-green-50 text-green-700'
                : 'bg-yellow-50 text-yellow-700'
            }`}
          >
            {currentStep < 4 ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                {statusText}
              </>
            ) : backendComplete ? (
              'Validation complete — redirecting…'
            ) : (
              'Analysis complete — waiting for results…'
            )}
          </span>
        </div>

        {/* Estimated time */}
        {currentStep < 4 && (
          <p className="text-center text-xs text-gray-400 mt-4">
            Estimated time: ~8 seconds
          </p>
        )}
      </div>
    </div>
  )
}
