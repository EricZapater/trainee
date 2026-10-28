import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Navbar } from './components/Navbar'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { CalendarPage } from './pages/CalendarPage'
import { AthleteCompetitionsPage } from './pages/AthleteCompetitionsPage'
import { WellnessPage } from './pages/WellnessPage'
import { TeamRacesPage } from './pages/TeamRacesPage'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { CoachSubmissionsMatrixPage } from './pages/CoachSubmissionsMatrixPage'
import { WeeksManagerPage } from './pages/WeeksManagerPage'
import { TeamPlanningPage } from './pages/TeamPlanningPage'
import { CoachCompetitionsPage } from './pages/CoachCompetitionsPage'
import { AthletesManagerPage } from './pages/AthletesManagerPage'
import { TestsManagerPage } from './pages/TestsManagerPage'
import { InformePage } from './pages/InformePage'
import { AlertTriangle, Undo2 } from 'lucide-react'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base text-text-muted text-sm">
        Carregant sessió...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

const ImpersonationBanner: React.FC = () => {
  const { user, isAdminImpersonating, restoreAdminSession } = useAuth()
  const navigate = useNavigate()

  if (!isAdminImpersonating) return null

  const handleRestore = () => {
    restoreAdminSession()
    navigate('/admin')
  }

  return (
    <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white px-4 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-between sticky top-0 z-[60] shadow-md border-b border-white/20 animate-fade-in">
      <div className="flex items-center gap-2 max-w-xl truncate">
        <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
        <span className="truncate">
          Estàs visualitzant el sistema com a <strong className="text-white underline">{user?.nom} {user?.cognoms}</strong> ({user?.rol}).
        </span>
      </div>
      <button 
        onClick={handleRestore}
        className="bg-white text-purple-900 hover:bg-purple-50 px-3 py-1 rounded-lg text-xs font-extrabold shadow-sm flex items-center gap-1.5 transition-colors shrink-0 ml-2"
      >
        <Undo2 className="w-3.5 h-3.5" /> Tornar a l'Admin
      </button>
    </div>
  )
}

const AppContent: React.FC = () => {
  const { isEntrenador } = useAuth()

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col">
      <ImpersonationBanner />
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 py-4 sm:py-6 w-full">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                {isEntrenador ? <CoachSubmissionsMatrixPage /> : <CalendarPage />}
              </ProtectedRoute>
            }
          />
          <Route
            path="/hub"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                {isEntrenador ? <CoachSubmissionsMatrixPage /> : <CalendarPage />}
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <CalendarPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/weeks"
            element={
              <ProtectedRoute>
                <WeeksManagerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/planning"
            element={
              <ProtectedRoute>
                <TeamPlanningPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/competicions/entrenador"
            element={
              <ProtectedRoute>
                <CoachCompetitionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wellness"
            element={
              <ProtectedRoute>
                <WellnessPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/competicions/atleta"
            element={
              <ProtectedRoute>
                <AthleteCompetitionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team-races"
            element={
              <ProtectedRoute>
                <TeamRacesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/atletes"
            element={
              <ProtectedRoute>
                <AthletesManagerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tests"
            element={
              <ProtectedRoute>
                <TestsManagerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/informe"
            element={
              <ProtectedRoute>
                <InformePage />
              </ProtectedRoute>
            }
          />
          <Route path="/informes" element={<Navigate to="/informe" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
