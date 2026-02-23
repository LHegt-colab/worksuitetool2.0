import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/layouts/AppLayout'
import { PageSpinner } from '@/components/ui/Spinner'

// Pages
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Agenda from '@/pages/Agenda'
import Actions from '@/pages/Actions'
import Meetings from '@/pages/Meetings'
import Journal from '@/pages/Journal'
import Knowledge from '@/pages/Knowledge'
import Settings from '@/pages/Settings'
import HtmlPreview from '@/pages/HtmlPreview'
import CsvConverter from '@/pages/CsvConverter'
import Calculator from '@/pages/Calculator'
import TimeTracking from '@/pages/TimeTracking'
import DataManagement from '@/pages/DataManagement'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <PageSpinner />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="actions" element={<Actions />} />
        <Route path="meetings" element={<Meetings />} />
        <Route path="journal" element={<Journal />} />
        <Route path="knowledge" element={<Knowledge />} />
        <Route path="html-preview" element={<HtmlPreview />} />
        <Route path="csv-converter" element={<CsvConverter />} />
        <Route path="calculator" element={<Calculator />} />
        <Route path="time-tracking" element={<TimeTracking />} />
        <Route path="data-management" element={<DataManagement />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
