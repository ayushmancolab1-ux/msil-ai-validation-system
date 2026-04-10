import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import ValidationRun from './pages/ValidationRun.jsx'
import Dashboard from './pages/Dashboard.jsx'
import DeviationDetail from './pages/DeviationDetail.jsx'
import PlantHeatmap from './pages/PlantHeatmap.jsx'
import TrendView from './pages/TrendView.jsx'
import AuditReport from './pages/AuditReport.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/validation/:runId" element={<Layout><ValidationRun /></Layout>} />
        <Route path="/dashboard/:runId" element={<Layout><Dashboard /></Layout>} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/deviation/:runId/:deviationId" element={<Layout><DeviationDetail /></Layout>} />
        <Route path="/heatmap" element={<Layout><PlantHeatmap /></Layout>} />
        <Route path="/trend" element={<Layout><TrendView /></Layout>} />
        <Route path="/audit" element={<Layout><AuditReport /></Layout>} />
        <Route path="/audit/:runId" element={<Layout><AuditReport /></Layout>} />
      </Routes>
    </BrowserRouter>
  )
}
