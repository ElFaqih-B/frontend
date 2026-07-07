import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import { ToastProvider } from './contexts/ToastContext.jsx'
import Backups from './pages/Backups.jsx'
import Console from './pages/Console.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Files from './pages/Files.jsx'
import Players from './pages/Players.jsx'
import Plugins from './pages/Plugins.jsx'
import Scheduler from './pages/Scheduler.jsx'
import Settings from './pages/Settings.jsx'
import Worlds from './pages/Worlds.jsx'

export default function App() {
  return (
    <ToastProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/console" element={<Console />} />
          <Route path="/players" element={<Players />} />
          <Route path="/worlds" element={<Worlds />} />
          <Route path="/plugins" element={<Plugins />} />
          <Route path="/files" element={<Files />} />
          <Route path="/backups" element={<Backups />} />
          <Route path="/scheduler" element={<Scheduler />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </ToastProvider>
  )
}