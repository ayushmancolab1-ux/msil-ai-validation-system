import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Upload,
  Map,
  TrendingUp,
  FileText,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Upload', icon: Upload, to: '/' },
  { label: 'Plant Heatmap', icon: Map, to: '/heatmap' },
  { label: 'Trend Analysis', icon: TrendingUp, to: '/trend' },
  { label: 'Audit Reports', icon: FileText, to: '/audit' },
]

function getBreadcrumbs(pathname) {
  const parts = pathname.split('/').filter(Boolean)
  const crumbs = [{ label: 'Home', to: '/' }]

  if (parts.length === 0) return crumbs

  const routeMap = {
    dashboard: 'Dashboard',
    validation: 'Validation Run',
    deviation: 'Deviation Detail',
    heatmap: 'Plant Heatmap',
    trend: 'Trend Analysis',
    audit: 'Audit Report',
  }

  parts.forEach((part, idx) => {
    const label = routeMap[part] || part
    const to = '/' + parts.slice(0, idx + 1).join('/')
    crumbs.push({ label, to })
  })

  return crumbs
}

export default function Layout({ children }) {
  const location = useLocation()
  const breadcrumbs = getBreadcrumbs(location.pathname)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className="flex flex-col shrink-0 overflow-y-auto"
        style={{ width: 240, backgroundColor: '#0D1B3E' }}
      >
        {/* Logo area */}
        <div className="px-6 py-5 border-b border-white/10">
          <div className="text-white font-bold text-2xl tracking-wide">MSIL</div>
          <div className="text-xs mt-0.5" style={{ color: '#00C4A7' }}>
            AI Validation System
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ label, icon: Icon, to }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'border-l-4 text-white bg-white/10'
                    : 'text-gray-300 hover:bg-white/5 border-l-4 border-transparent',
                ].join(' ')
              }
              style={({ isActive }) =>
                isActive ? { borderLeftColor: '#00C4A7', color: '#00C4A7' } : {}
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10">
          <div className="text-xs text-gray-500">v1.0.0 · MSIL_DE_DX3</div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-sm text-gray-500">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.to}>
                {idx > 0 && <span className="text-gray-300 mx-1">/</span>}
                {idx === breadcrumbs.length - 1 ? (
                  <span className="text-gray-800 font-medium">{crumb.label}</span>
                ) : (
                  <NavLink to={crumb.to} className="hover:text-gray-700">
                    {crumb.label}
                  </NavLink>
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* User avatar */}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white select-none"
            style={{ backgroundColor: '#0D1B3E' }}
          >
            QA
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-[#F4F7FB]">
          {children}
        </main>
      </div>
    </div>
  )
}
