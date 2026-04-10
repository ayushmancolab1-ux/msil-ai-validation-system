import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, CheckCircle, Upload as UploadIcon, AlertCircle,
  Loader2, Image as ImageIcon, Cpu, Cloud,
} from 'lucide-react'
import { uploadDrawing, uploadWIS, startValidation, getLLMConfig } from '../api/client.js'

const VEHICLE_MODELS = ['Maruti Swift', 'Maruti Brezza', 'Maruti Dzire']
const PLANTS = ['Manesar', 'Gurugram', 'Gujarat']
const COMPONENTS = [
  'Engine Mount Bracket (Front LH)',
  'Brake Caliper Bolt Assembly',
  'Suspension Strut Upper Mount',
  'Steering Rack Mounting Bracket',
  'Fuel Tank Strap Assembly',
  'Exhaust Manifold Stud',
  'Wheel Hub Bearing',
  'Gearbox Crossmember',
]

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp'])

function getExt(filename) {
  return filename.slice(filename.lastIndexOf('.')).toLowerCase()
}

function isImageFile(filename) {
  return IMAGE_EXTS.has(getExt(filename))
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Drawing Dropzone (accepts images + PDF/DOCX) ────────────────────────────
function DrawingDropZone({ file, imagePreview, uploading, onFile }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  function handleDragOver(e) { e.preventDefault(); setDragging(true) }
  function handleDragLeave(e) { e.preventDefault(); setDragging(false) }
  function handleDrop(e) {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) onFile(f)
  }
  function handleChange(e) {
    const f = e.target.files?.[0]
    if (f) onFile(f)
  }

  const borderColor = dragging ? '#00C4A7' : file ? '#22c55e' : '#e5e7eb'
  const bgColor = dragging ? '#f0fdfb' : file ? '#f0fdf4' : '#ffffff'

  return (
    <div
      className="flex-1 rounded-xl border-2 border-dashed p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all min-h-[220px]"
      style={{ borderColor, backgroundColor: bgColor }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.pdf,.docx,.doc"
        className="hidden"
        onChange={handleChange}
      />

      {file && imagePreview ? (
        // Image preview
        <>
          <div className="w-full max-h-36 overflow-hidden rounded-lg border border-green-200">
            <img
              src={imagePreview}
              alt="Drawing preview"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-800 text-sm truncate max-w-[200px]">{file.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">{formatFileSize(file.size)}</div>
          </div>
          <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-100 px-2 py-0.5 rounded-full">
            <CheckCircle size={12} /> Uploaded · Image ready for LLM
          </span>
        </>
      ) : file ? (
        // PDF/DOCX uploaded
        <>
          <CheckCircle size={36} className="text-green-500" />
          <div className="text-center">
            <div className="font-semibold text-gray-800 text-sm truncate max-w-[200px]">{file.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">{formatFileSize(file.size)}</div>
          </div>
          <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-100 px-2 py-0.5 rounded-full">
            <CheckCircle size={12} /> Uploaded
          </span>
        </>
      ) : uploading ? (
        <>
          <Loader2 size={36} className="animate-spin text-gray-400" />
          <div className="text-sm text-gray-500">Uploading…</div>
        </>
      ) : (
        <>
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: '#EEF9F7' }}>
            <ImageIcon size={28} style={{ color: '#00C4A7' }} />
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-700 text-sm">Assembly Drawing</div>
            <div className="text-xs text-gray-400 mt-1">Drop an image (PNG / JPG / WEBP) for AI vision</div>
            <div className="text-xs text-gray-400">or PDF / DOCX for regex extraction</div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── WIS Dropzone (PDF / DOCX only) ─────────────────────────────────────────
function WISDropZone({ file, uploading, onFile }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  function handleDragOver(e) { e.preventDefault(); setDragging(true) }
  function handleDragLeave(e) { e.preventDefault(); setDragging(false) }
  function handleDrop(e) {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) onFile(f)
  }
  function handleChange(e) {
    const f = e.target.files?.[0]
    if (f) onFile(f)
  }

  const borderColor = dragging ? '#00C4A7' : file ? '#22c55e' : '#e5e7eb'
  const bgColor = dragging ? '#f0fdfb' : file ? '#f0fdf4' : '#ffffff'

  return (
    <div
      className="flex-1 rounded-xl border-2 border-dashed p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all min-h-[220px]"
      style={{ borderColor, backgroundColor: bgColor }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.doc"
        className="hidden"
        onChange={handleChange}
      />

      {file ? (
        <>
          <CheckCircle size={36} className="text-green-500" />
          <div className="text-center">
            <div className="font-semibold text-gray-800 text-sm truncate max-w-[200px]">{file.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">{formatFileSize(file.size)}</div>
          </div>
          <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-100 px-2 py-0.5 rounded-full">
            <CheckCircle size={12} /> Uploaded
          </span>
        </>
      ) : uploading ? (
        <>
          <Loader2 size={36} className="animate-spin text-gray-400" />
          <div className="text-sm text-gray-500">Uploading…</div>
        </>
      ) : (
        <>
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: '#EEF9F7' }}>
            <FileText size={28} style={{ color: '#00C4A7' }} />
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-700 text-sm">Work Instruction Sheet</div>
            <div className="text-xs text-gray-400 mt-1">Drop PDF or DOCX here or click to browse</div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── LLM Provider Toggle ─────────────────────────────────────────────────────
function LLMToggle({ provider, onChange, config }) {
  const openaiAvailable = config?.openai?.available ?? true
  const azureAvailable = config?.azure?.available ?? false

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">AI Provider</label>
      <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-gray-50 p-1 gap-1">
        <button
          type="button"
          disabled={!openaiAvailable}
          onClick={() => openaiAvailable && onChange('openai')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold transition-all ${
            provider === 'openai'
              ? 'text-white shadow-sm'
              : openaiAvailable
              ? 'text-gray-500 hover:text-gray-700 hover:bg-white'
              : 'text-gray-300 cursor-not-allowed'
          }`}
          style={provider === 'openai' ? { backgroundColor: '#0D1B3E' } : {}}
        >
          <Cpu size={13} />
          OpenAI
          {config?.openai?.model && (
            <span className={`opacity-60 font-normal ${provider === 'openai' ? 'text-blue-200' : 'text-gray-400'}`}>
              {config.openai.model}
            </span>
          )}
          {!openaiAvailable && <span className="text-gray-300 font-normal">(no key)</span>}
        </button>

        <button
          type="button"
          disabled={!azureAvailable}
          onClick={() => azureAvailable && onChange('azure')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold transition-all ${
            provider === 'azure'
              ? 'text-white shadow-sm'
              : azureAvailable
              ? 'text-gray-500 hover:text-gray-700 hover:bg-white'
              : 'text-gray-300 cursor-not-allowed'
          }`}
          style={provider === 'azure' ? { backgroundColor: '#0078D4' } : {}}
        >
          <Cloud size={13} />
          Azure GPT-4.1
          {!azureAvailable && <span className="text-gray-300 font-normal">(no key)</span>}
        </button>
      </div>
      {provider === 'openai' && openaiAvailable && (
        <p className="text-xs text-gray-400 mt-1">
          Vision model reads the drawing image and extracts all engineering specs as structured JSON.
        </p>
      )}
      {provider === 'azure' && azureAvailable && (
        <p className="text-xs text-gray-400 mt-1">
          Azure GPT-4.1 deployed in your tenant — data stays within your Azure subscription.
        </p>
      )}
      {!openaiAvailable && !azureAvailable && (
        <p className="text-xs text-red-400 mt-1">
          No LLM keys configured in backend/.env — will fall back to seeded data for demo.
        </p>
      )}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate()
  const [drawingFile, setDrawingFile] = useState(null)
  const [drawingImagePreview, setDrawingImagePreview] = useState(null)
  const [wisFile, setWisFile] = useState(null)
  const [drawingId, setDrawingId] = useState(null)
  const [wisId, setWisId] = useState(null)
  const [vehicleModel, setVehicleModel] = useState(VEHICLE_MODELS[0])
  const [plant, setPlant] = useState(PLANTS[0])
  const [component, setComponent] = useState(COMPONENTS[0])
  const [llmProvider, setLlmProvider] = useState('openai')
  const [llmConfig, setLlmConfig] = useState(null)
  const [uploadingDrawing, setUploadingDrawing] = useState(false)
  const [uploadingWis, setUploadingWis] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)

  // Fetch LLM config from backend to know what's available
  useEffect(() => {
    getLLMConfig()
      .then(res => {
        const cfg = res.data
        setLlmConfig(cfg)
        setLlmProvider(cfg.default_provider || 'openai')
      })
      .catch(() => {
        // Backend not reachable yet — default to openai
        setLlmConfig({ openai: { available: true, model: 'gpt-4.1' }, azure: { available: false } })
      })
  }, [])

  async function handleDrawingFile(file) {
    setDrawingFile(file)
    setDrawingId(null)
    setDrawingImagePreview(null)
    setError(null)

    // Generate local preview for images
    if (isImageFile(file.name)) {
      const url = URL.createObjectURL(file)
      setDrawingImagePreview(url)
    }

    setUploadingDrawing(true)
    try {
      const res = await uploadDrawing(file)
      setDrawingId(res.data.file_id || res.data.id)
    } catch (e) {
      setError('Failed to upload Assembly Drawing: ' + (e.response?.data?.detail || e.message))
      setDrawingFile(null)
      setDrawingImagePreview(null)
    } finally {
      setUploadingDrawing(false)
    }
  }

  async function handleWisFile(file) {
    setWisFile(file)
    setWisId(null)
    setError(null)
    setUploadingWis(true)
    try {
      const res = await uploadWIS(file)
      setWisId(res.data.file_id || res.data.id)
    } catch (e) {
      setError('Failed to upload Work Instruction Sheet: ' + (e.response?.data?.detail || e.message))
      setWisFile(null)
    } finally {
      setUploadingWis(false)
    }
  }

  async function handleRunValidation() {
    if (!drawingId || !wisId) return
    setRunning(true)
    setError(null)
    try {
      const res = await startValidation(drawingId, wisId, vehicleModel, plant, component, llmProvider)
      const runId = res.data.run_id || res.data.id
      navigate(`/validation/${runId}`)
    } catch (e) {
      setError('Failed to start validation: ' + (e.response?.data?.detail || e.message))
    } finally {
      setRunning(false)
    }
  }

  const uploading = uploadingDrawing || uploadingWis
  const canRun = drawingId && wisId && !uploading && !running

  // Badge: show what will be used for the drawing
  const drawingMode = drawingFile
    ? isImageFile(drawingFile.name)
      ? 'Vision LLM'
      : 'Regex / OCR'
    : null

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Validation Run</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload an Assembly Drawing (image or document) and a Work Instruction Sheet to begin AI-powered validation.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Drawing mode badge */}
      {drawingMode && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs text-gray-500">Drawing extraction mode:</span>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              drawingMode === 'Vision LLM'
                ? 'bg-teal-100 text-teal-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {drawingMode}
          </span>
          {drawingMode === 'Vision LLM' && (
            <span className="text-xs text-gray-400">— GPT-4.1 will analyze the image</span>
          )}
        </div>
      )}

      {/* Dropzones */}
      <div className="flex gap-4 mb-6">
        <DrawingDropZone
          file={drawingFile}
          imagePreview={drawingImagePreview}
          uploading={uploadingDrawing}
          onFile={handleDrawingFile}
        />
        <WISDropZone
          file={wisFile}
          uploading={uploadingWis}
          onFile={handleWisFile}
        />
      </div>

      {/* Config card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="text-sm font-semibold text-gray-700 mb-4">Validation Configuration</div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Vehicle Model */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Vehicle Model</label>
            <select
              value={vehicleModel}
              onChange={e => setVehicleModel(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none"
            >
              {VEHICLE_MODELS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {/* Plant */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Plant</label>
            <select
              value={plant}
              onChange={e => setPlant(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none"
            >
              {PLANTS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Component */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Component</label>
            <select
              value={component}
              onChange={e => setComponent(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none"
            >
              {COMPONENTS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* LLM Provider Toggle */}
          <LLMToggle
            provider={llmProvider}
            onChange={setLlmProvider}
            config={llmConfig}
          />
        </div>
      </div>

      {/* Info banner when image drawing is selected */}
      {drawingFile && isImageFile(drawingFile.name) && (
        <div
          className="mb-4 rounded-xl border p-4 flex items-start gap-3"
          style={{ backgroundColor: '#EEF9F7', borderColor: '#00C4A7' }}
        >
          <Cpu size={18} style={{ color: '#00C4A7' }} className="shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold" style={{ color: '#0D1B3E' }}>
              AI Vision Extraction Active
            </div>
            <div className="text-xs text-gray-600 mt-0.5">
              {llmProvider === 'azure' ? 'Azure GPT-4.1' : 'OpenAI GPT-4.1'} will read the drawing image and extract
              torque specs, bore dimensions, GD&T tolerances, surface finish, material grade, and revision marks.
              Results are then cross-referenced against the WIS.
            </div>
          </div>
        </div>
      )}

      {/* Run button */}
      <div className="flex justify-end">
        <button
          onClick={handleRunValidation}
          disabled={!canRun}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
            canRun ? 'text-white shadow-md hover:opacity-90' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          style={canRun ? { backgroundColor: '#0D1B3E' } : {}}
        >
          {running ? (
            <><Loader2 size={16} className="animate-spin" /> Starting…</>
          ) : uploading ? (
            <><Loader2 size={16} className="animate-spin" /> Uploading…</>
          ) : (
            <><UploadIcon size={16} /> Run Validation</>
          )}
        </button>
      </div>
    </div>
  )
}
