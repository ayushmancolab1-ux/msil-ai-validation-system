import axios from 'axios'

const client = axios.create({
  baseURL: '/',
  timeout: 60000, // 60s — LLM vision calls can take a few seconds
})

export function uploadDrawing(file) {
  const formData = new FormData()
  formData.append('file', file)
  return client.post('/api/upload/drawing', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function uploadWIS(file) {
  const formData = new FormData()
  formData.append('file', file)
  return client.post('/api/upload/wis', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function startValidation(drawingId, wisId, vehicleModel, plant, component, llmProvider = 'openai') {
  return client.post('/api/validate', {
    drawing_id: drawingId,
    wis_id: wisId,
    vehicle_model: vehicleModel,
    plant,
    component,
    llm_provider: llmProvider,
  })
}

export function getValidationRun(runId) {
  return client.get(`/api/validate/${runId}`)
}

export function acknowledgeDeviation(deviationId) {
  return client.patch(`/api/validate/deviations/${deviationId}/acknowledge`)
}

export function getDashboardSummary() {
  return client.get('/api/dashboard/summary')
}

export function getHeatmapData() {
  return client.get('/api/dashboard/heatmap')
}

export function getTrendData() {
  return client.get('/api/dashboard/trend')
}

export function getReports() {
  return client.get('/api/reports')
}

export function exportReport(runId) {
  return client.get(`/api/reports/${runId}/export`, {
    responseType: 'blob',
  })
}

export function getLLMConfig() {
  return client.get('/api/config/llm')
}

export default client
