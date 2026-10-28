import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  Trophy, 
  Activity, 
  HeartPulse, 
  Calendar, 
  LogOut, 
  Menu, 
  X,
  Sparkles,
  Users,
  ShieldCheck,
  Layers,
  Clock,
  ClipboardList,
  FileText,
  UserCheck,
  Megaphone,
  Bug
} from 'lucide-react'

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, isEntrenador, isAtleta, isAdmin, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  if (!isAuthenticated) return null

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <header className="sticky top-0 z-50 px-4 py-3 max-w-7xl mx-auto w-full">
      <div className="glass-card px-4 py-2.5 flex items-center justify-between">
        {/* Brand & Badge */}
        <Link to="/" className="flex items-center gap-3 group">
          <img src="/logo.png" alt="Logo" className="h-9 w-auto transition-transform group-hover:scale-105" />
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-text-primary tracking-tight">TrainEE</span>
            <span className="bg-brand-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
              <Sparkles className="w-3 h-3" /> PRE
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 text-xs xl:text-sm font-medium">
          {isAtleta && (
            <>
              <Link 
                to="/calendar" 
                className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  isActive('/calendar') 
                    ? 'bg-brand-50 text-brand-600 font-semibold' 
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`}
              >
                <Calendar className="w-4 h-4 text-brand-500" /> Calendari
              </Link>
              <Link 
                to="/competicions/atleta" 
                className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  isActive('/competicions/atleta') 
                    ? 'bg-brand-50 text-brand-600 font-semibold' 
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`}
              >
                <Trophy className="w-4 h-4 text-rose-500" /> Curses
              </Link>
            </>
          )}

          <Link 
            to="/wellness" 
            className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              isActive('/wellness') 
                ? 'bg-brand-50 text-brand-600 font-semibold' 
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            <HeartPulse className="w-4 h-4 text-emerald-500" /> Wellness
          </Link>

          <Link 
            to="/team-races" 
            className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              isActive('/team-races') 
                ? 'bg-brand-50 text-brand-600 font-semibold' 
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            <Users className="w-4 h-4 text-amber-500" /> Curses d'Equip
          </Link>

          {(isEntrenador || isAdmin) && (
            <>
              <Link 
                to="/dashboard" 
                className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  isActive('/dashboard') || (isActive('/') && !isAtleta)
                    ? 'bg-brand-50 text-brand-600 font-semibold' 
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`}
              >
                <Activity className="w-4 h-4 text-blue-500" /> Matriu
              </Link>
              <Link 
                to="/planning" 
                className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  isActive('/planning') 
                    ? 'bg-brand-50 text-brand-600 font-semibold' 
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`}
              >
                <Layers className="w-4 h-4 text-indigo-500" /> Planning
              </Link>
              <Link 
                to="/atletes" 
                className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  isActive('/atletes') 
                    ? 'bg-brand-50 text-brand-600 font-semibold' 
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`}
              >
                <UserCheck className="w-4 h-4 text-teal-600" /> Atletes
              </Link>
              <Link 
                to="/tests" 
                className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  isActive('/tests') 
                    ? 'bg-brand-50 text-brand-600 font-semibold' 
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`}
              >
                <ClipboardList className="w-4 h-4 text-purple-600" /> Tests
              </Link>
              <Link 
                to="/competicions/entrenador" 
                className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  isActive('/competicions/entrenador') 
                    ? 'bg-brand-50 text-brand-600 font-semibold' 
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`}
              >
                <Trophy className="w-4 h-4 text-rose-500" /> Curses Entr.
              </Link>
              <Link 
                to="/weeks" 
                className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  isActive('/weeks') 
                    ? 'bg-brand-50 text-brand-600 font-semibold' 
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`}
              >
                <Clock className="w-4 h-4 text-slate-500" /> Setmanes
              </Link>
            </>
          )}

          <Link 
            to="/informe" 
            className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              isActive('/informe') 
                ? 'bg-brand-50 text-brand-600 font-semibold' 
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            <FileText className="w-4 h-4 text-sky-600" /> {isEntrenador || isAdmin ? 'Informes' : 'Informe'}
          </Link>

          <Link 
            to="/anuncis" 
            className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              isActive('/anuncis') 
                ? 'bg-brand-50 text-brand-600 font-semibold' 
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            <Megaphone className="w-4 h-4 text-amber-500" /> Anuncis
          </Link>

          <Link 
            to="/feedback" 
            className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              isActive('/feedback') 
                ? 'bg-brand-50 text-brand-600 font-semibold' 
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            <Bug className="w-4 h-4 text-purple-500" /> Feedback
          </Link>

          {isAdmin && (
            <Link 
              to="/admin" 
              className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                isActive('/admin') 
                  ? 'bg-purple-100 text-purple-700 font-semibold' 
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-purple-600" /> Admin
            </Link>
          )}
        </nav>

        {/* User Profile & Actions */}
        <div className="hidden lg:flex items-center gap-3">
          <div className="flex items-center gap-2 pl-3 border-l border-border">
            <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 font-bold text-xs flex items-center justify-center border border-brand-200">
              {user?.nom?.charAt(0) || 'U'}
            </div>
            <div className="text-left text-xs">
              <p className="font-semibold text-text-primary leading-tight">{user?.nom}</p>
              <p className="text-text-muted capitalize">{user?.rol}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Tancar sessió"
            className="p-1.5 text-text-muted hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile menu button */}
        <button 
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden p-2 text-text-secondary hover:bg-bg-hover rounded-lg"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden glass-card mt-2 p-4 flex flex-col gap-2 animate-fade-in max-h-[85vh] overflow-y-auto">
          <div className="pb-3 mb-2 border-b border-border flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-600 font-bold text-sm flex items-center justify-center">
              {user?.nom?.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-sm text-text-primary">{user?.nom} {user?.cognoms}</p>
              <p className="text-xs text-text-muted">{user?.email}</p>
            </div>
          </div>

          {isAtleta && (
            <>
              <Link
                to="/calendar"
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-bg-hover flex items-center gap-2"
              >
                <Calendar className="w-4 h-4 text-brand-500" /> El meu Calendari
              </Link>
              <Link
                to="/competicions/atleta"
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-bg-hover flex items-center gap-2"
              >
                <Trophy className="w-4 h-4 text-rose-500" /> Les meves Curses
              </Link>
            </>
          )}

          <Link
            to="/wellness"
            onClick={() => setMobileOpen(false)}
            className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-bg-hover flex items-center gap-2"
          >
            <HeartPulse className="w-4 h-4 text-emerald-500" /> Mòdul Wellness & RPE
          </Link>

          <Link
            to="/team-races"
            onClick={() => setMobileOpen(false)}
            className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-bg-hover flex items-center gap-2"
          >
            <Users className="w-4 h-4 text-amber-500" /> Curses d'Equip (Team Hub)
          </Link>

          {(isEntrenador || isAdmin) && (
            <>
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-bg-hover flex items-center gap-2"
              >
                <Activity className="w-4 h-4 text-blue-500" /> Matriu de Disponibilitats
              </Link>
              <Link
                to="/planning"
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-bg-hover flex items-center gap-2"
              >
                <Layers className="w-4 h-4 text-indigo-500" /> Planning d'Equip
              </Link>
              <Link
                to="/atletes"
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-bg-hover flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4 text-teal-600" /> Gestió d'Atletes
              </Link>
              <Link
                to="/tests"
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-bg-hover flex items-center gap-2"
              >
                <ClipboardList className="w-4 h-4 text-purple-600" /> Proves Físiques i Tests
              </Link>
              <Link
                to="/competicions/entrenador"
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-bg-hover flex items-center gap-2"
              >
                <Trophy className="w-4 h-4 text-rose-500" /> Curses dels Atletes
              </Link>
              <Link
                to="/weeks"
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-bg-hover flex items-center gap-2"
              >
                <Clock className="w-4 h-4 text-slate-500" /> Gestor de Setmanes
              </Link>
            </>
          )}

          <Link
            to="/informe"
            onClick={() => setMobileOpen(false)}
            className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-bg-hover flex items-center gap-2"
          >
            <FileText className="w-4 h-4 text-sky-600" /> {isEntrenador || isAdmin ? 'Informes i Estadístiques' : 'El meu Informe'}
          </Link>

          <Link
            to="/anuncis"
            onClick={() => setMobileOpen(false)}
            className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-bg-hover flex items-center gap-2"
          >
            <Megaphone className="w-4 h-4 text-amber-500" /> Tauler d'Anuncis
          </Link>

          <Link
            to="/feedback"
            onClick={() => setMobileOpen(false)}
            className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-bg-hover flex items-center gap-2"
          >
            <Bug className="w-4 h-4 text-purple-500" /> Bústia de Feedback & Bugs
          </Link>

          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setMobileOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 flex items-center gap-2 border border-purple-200"
            >
              <ShieldCheck className="w-4 h-4 text-purple-600" /> Panell d'Admin (Impersonar)
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="mt-2 pt-2 border-t border-border text-left px-3 py-2 text-sm text-rose-600 font-semibold hover:bg-rose-50 rounded-lg flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Tancar Sessió
          </button>
        </div>
      )}
    </header>
  )
}
