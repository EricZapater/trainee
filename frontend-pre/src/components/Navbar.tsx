import React, { useState, useEffect, useRef } from 'react'
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
  Bug, 
  ShoppingBag, 
  Apple, 
  Palette, 
  Settings as SettingsIcon, 
  Terminal, 
  FileSpreadsheet, 
  ChevronDown
} from 'lucide-react'

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, isEntrenador, isAtleta, isAdmin, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  
  const navRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close menus on route change
  useEffect(() => {
    setOpenDropdown(null)
    setMobileOpen(false)
  }, [location.pathname])

  if (!isAuthenticated) return null

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path: string) => location.pathname === path
  const isAnyActive = (paths: string[]) => paths.some(p => location.pathname === p)

  const toggleDropdown = (key: string) => {
    setOpenDropdown(prev => prev === key ? null : key)
  }

  const trainingPaths = ['/calendar', '/wellness', '/informe', '/nutricio']
  const racesPaths = ['/competicions/atleta', '/team-races']
  const clubPaths = ['/anuncis', '/material', '/feedback']
  const coachPaths = ['/dashboard', '/planning', '/atletes', '/tests', '/competicions/entrenador', '/weeks']
  const adminPaths = ['/admin', '/activitats', '/forms', '/settings', '/logs']

  return (
    <header className="sticky top-0 z-50 px-4 py-3 max-w-7xl mx-auto w-full">
      <div className="glass-card px-4 py-2.5 flex items-center justify-between" ref={navRef}>
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

        {/* Desktop Navigation: 4 or 5 clean categorized dropdowns */}
        <nav className="hidden lg:flex items-center gap-1.5 text-xs xl:text-sm font-semibold">
          {/* 1. El meu Entrenament */}
          {isAtleta && (
            <div className="relative">
              <button
                onClick={() => toggleDropdown('training')}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  openDropdown === 'training' || isAnyActive(trainingPaths)
                    ? 'bg-brand-50 text-brand-600 font-bold shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`}
              >
                <Calendar className="w-4 h-4 text-brand-500" />
                <span>Entrenament</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openDropdown === 'training' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'training' && (
                <div className="absolute left-0 mt-2 w-64 glass-card bg-bg-surface p-2 rounded-2xl shadow-xl border border-border flex flex-col gap-1 z-50 animate-fade-in text-xs font-medium">
                  <Link
                    to="/calendar"
                    className={`px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-colors ${
                      isActive('/calendar') ? 'bg-brand-50 text-brand-600 font-bold' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    }`}
                  >
                    <Calendar className="w-4 h-4 text-brand-500" />
                    <div>
                      <p className="font-bold text-text-primary leading-tight">El meu Calendari</p>
                      <p className="text-[11px] text-text-muted mt-0.5">Disponibilitat setmanal</p>
                    </div>
                  </Link>

                  <Link
                    to="/wellness"
                    className={`px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-colors ${
                      isActive('/wellness') ? 'bg-brand-50 text-brand-600 font-bold' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    }`}
                  >
                    <HeartPulse className="w-4 h-4 text-emerald-500" />
                    <div>
                      <p className="font-bold text-text-primary leading-tight">Wellness & Fatiga</p>
                      <p className="text-[11px] text-text-muted mt-0.5">Escala Hooper & dolor</p>
                    </div>
                  </Link>

                  <Link
                    to="/informe"
                    className={`px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-colors ${
                      isActive('/informe') ? 'bg-brand-50 text-brand-600 font-bold' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-sky-600" />
                    <div>
                      <p className="font-bold text-text-primary leading-tight">Historial & Informes</p>
                      <p className="text-[11px] text-text-muted mt-0.5">Volum d'hores i diari</p>
                    </div>
                  </Link>

                  <Link
                    to="/nutricio"
                    className={`px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-colors ${
                      isActive('/nutricio') ? 'bg-brand-50 text-brand-600 font-bold' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    }`}
                  >
                    <Apple className="w-4 h-4 text-amber-500" />
                    <div>
                      <p className="font-bold text-text-primary leading-tight">Pla Nutricional</p>
                      <p className="text-[11px] text-text-muted mt-0.5">Carbohidrats i avituallament</p>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* 2. Curses */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('races')}
              className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                openDropdown === 'races' || isAnyActive(racesPaths)
                  ? 'bg-brand-50 text-brand-600 font-bold shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              }`}
            >
              <Trophy className="w-4 h-4 text-rose-500" />
              <span>Curses</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openDropdown === 'races' ? 'rotate-180' : ''}`} />
            </button>

            {openDropdown === 'races' && (
              <div className="absolute left-0 mt-2 w-64 glass-card bg-bg-surface p-2 rounded-2xl shadow-xl border border-border flex flex-col gap-1 z-50 animate-fade-in text-xs font-medium">
                {isAtleta && (
                  <Link
                    to="/competicions/atleta"
                    className={`px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-colors ${
                      isActive('/competicions/atleta') ? 'bg-brand-50 text-brand-600 font-bold' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    }`}
                  >
                    <Trophy className="w-4 h-4 text-rose-500" />
                    <div>
                      <p className="font-bold text-text-primary leading-tight">Les meves Curses</p>
                      <p className="text-[11px] text-text-muted mt-0.5">Objectius A/B/C i tracks</p>
                    </div>
                  </Link>
                )}

                <Link
                  to="/team-races"
                  className={`px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-colors ${
                    isActive('/team-races') ? 'bg-brand-50 text-brand-600 font-bold' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                  }`}
                >
                  <Users className="w-4 h-4 text-amber-500" />
                  <div>
                    <p className="font-bold text-text-primary leading-tight">Curses d'Equip</p>
                    <p className="text-[11px] text-text-muted mt-0.5">Team Hub i cotxes compartits</p>
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* 3. Club i Comunitat */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('club')}
              className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                openDropdown === 'club' || isAnyActive(clubPaths)
                  ? 'bg-brand-50 text-brand-600 font-bold shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              }`}
            >
              <Users className="w-4 h-4 text-teal-600" />
              <span>Club & Serveis</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openDropdown === 'club' ? 'rotate-180' : ''}`} />
            </button>

            {openDropdown === 'club' && (
              <div className="absolute left-0 mt-2 w-64 glass-card bg-bg-surface p-2 rounded-2xl shadow-xl border border-border flex flex-col gap-1 z-50 animate-fade-in text-xs font-medium">
                <Link
                  to="/anuncis"
                  className={`px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-colors ${
                    isActive('/anuncis') ? 'bg-brand-50 text-brand-600 font-bold' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                  }`}
                >
                  <Megaphone className="w-4 h-4 text-amber-500" />
                  <div>
                    <p className="font-bold text-text-primary leading-tight">Tauler d'Anuncis</p>
                    <p className="text-[11px] text-text-muted mt-0.5">Material de segona mà i avisos</p>
                  </div>
                </Link>

                <Link
                  to="/material"
                  className={`px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-colors ${
                    isActive('/material') ? 'bg-brand-50 text-brand-600 font-bold' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 text-emerald-500" />
                  <div>
                    <p className="font-bold text-text-primary leading-tight">Equipament & Roba</p>
                    <p className="text-[11px] text-text-muted mt-0.5">Catàleg oficial i comandes</p>
                  </div>
                </Link>

                <Link
                  to="/feedback"
                  className={`px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-colors ${
                    isActive('/feedback') ? 'bg-brand-50 text-brand-600 font-bold' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                  }`}
                >
                  <Bug className="w-4 h-4 text-purple-500" />
                  <div>
                    <p className="font-bold text-text-primary leading-tight">Bústia de Feedback</p>
                    <p className="text-[11px] text-text-muted mt-0.5">Bugs i peticions de millora</p>
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* 4. Gestió Entrenador (Only if coach or admin) */}
          {(isEntrenador || isAdmin) && (
            <div className="relative">
              <button
                onClick={() => toggleDropdown('coach')}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  openDropdown === 'coach' || isAnyActive(coachPaths)
                    ? 'bg-blue-50 text-blue-700 font-bold shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`}
              >
                <Activity className="w-4 h-4 text-blue-500" />
                <span>Entrenador</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openDropdown === 'coach' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'coach' && (
                <div className="absolute left-0 mt-2 w-64 glass-card bg-bg-surface p-2 rounded-2xl shadow-xl border border-border flex flex-col gap-1 z-50 animate-fade-in text-xs font-medium">
                  <Link
                    to="/dashboard"
                    className={`px-3 py-2 rounded-xl flex items-center gap-2.5 transition-colors ${
                      isActive('/dashboard') ? 'bg-blue-50 text-blue-700 font-bold' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    }`}
                  >
                    <Activity className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="font-bold text-text-primary leading-tight">Matriu d'Atletes</p>
                      <p className="text-[11px] text-text-muted">Disponibilitats i semàfor</p>
                    </div>
                  </Link>

                  <Link
                    to="/planning"
                    className={`px-3 py-2 rounded-xl flex items-center gap-2.5 transition-colors ${
                      isActive('/planning') ? 'bg-blue-50 text-blue-700 font-bold' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-indigo-500" />
                    <div>
                      <p className="font-bold text-text-primary leading-tight">Planning d'Equip</p>
                      <p className="text-[11px] text-text-muted">Visió panoràmica de grup</p>
                    </div>
                  </Link>

                  <Link
                    to="/atletes"
                    className={`px-3 py-2 rounded-xl flex items-center gap-2.5 transition-colors ${
                      isActive('/atletes') ? 'bg-blue-50 text-blue-700 font-bold' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 text-teal-600" />
                    <div>
                      <p className="font-bold text-text-primary leading-tight">Gestió d'Atletes</p>
                      <p className="text-[11px] text-text-muted">Actius, inactius i dades</p>
                    </div>
                  </Link>

                  <Link
                    to="/tests"
                    className={`px-3 py-2 rounded-xl flex items-center gap-2.5 transition-colors ${
                      isActive('/tests') ? 'bg-blue-50 text-blue-700 font-bold' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    }`}
                  >
                    <ClipboardList className="w-4 h-4 text-purple-600" />
                    <div>
                      <p className="font-bold text-text-primary leading-tight">Proves Físiques & Tests</p>
                      <p className="text-[11px] text-text-muted">Traspàs i recordatoris</p>
                    </div>
                  </Link>

                  <Link
                    to="/competicions/entrenador"
                    className={`px-3 py-2 rounded-xl flex items-center gap-2.5 transition-colors ${
                      isActive('/competicions/entrenador') ? 'bg-blue-50 text-blue-700 font-bold' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    }`}
                  >
                    <Trophy className="w-4 h-4 text-rose-500" />
                    <div>
                      <p className="font-bold text-text-primary leading-tight">Curses dels Atletes</p>
                      <p className="text-[11px] text-text-muted">Aprovació i programació</p>
                    </div>
                  </Link>

                  <Link
                    to="/weeks"
                    className={`px-3 py-2 rounded-xl flex items-center gap-2.5 transition-colors ${
                      isActive('/weeks') ? 'bg-blue-50 text-blue-700 font-bold' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="font-bold text-text-primary leading-tight">Gestor de Setmanes</p>
                      <p className="text-[11px] text-text-muted">Obertura i tancament</p>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* 5. Administració i Sistema (Only if admin) */}
          {isAdmin && (
            <div className="relative">
              <button
                onClick={() => toggleDropdown('admin')}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  openDropdown === 'admin' || isAnyActive(adminPaths)
                    ? 'bg-purple-100 text-purple-800 font-bold shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Admin</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openDropdown === 'admin' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'admin' && (
                <div className="absolute right-0 mt-2 w-64 glass-card bg-bg-surface p-2 rounded-2xl shadow-xl border border-border flex flex-col gap-1 z-50 animate-fade-in text-xs font-medium">
                  <Link
                    to="/admin"
                    className={`px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-colors ${
                      isActive('/admin') ? 'bg-purple-50 text-purple-700 font-bold' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <div>
                      <p className="font-bold text-text-primary leading-tight">Panell d'Usuaris</p>
                      <p className="text-[11px] text-text-muted">Impersonació d'atletes/tècnics</p>
                    </div>
                  </Link>

                  <Link
                    to="/activitats"
                    className={`px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-colors ${
                      isActive('/activitats') ? 'bg-purple-50 text-purple-700 font-bold' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    }`}
                  >
                    <Palette className="w-4 h-4 text-rose-500" />
                    <div>
                      <p className="font-bold text-text-primary leading-tight">Esports & Activitats</p>
                      <p className="text-[11px] text-text-muted">Colors, icones i ordre</p>
                    </div>
                  </Link>

                  <Link
                    to="/forms"
                    className={`px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-colors ${
                      isActive('/forms') ? 'bg-purple-50 text-purple-700 font-bold' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                    <div>
                      <p className="font-bold text-text-primary leading-tight">Formularis Dinàmics</p>
                      <p className="text-[11px] text-text-muted">Enquestes i qüestionaris</p>
                    </div>
                  </Link>

                  <Link
                    to="/settings"
                    className={`px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-colors ${
                      isActive('/settings') ? 'bg-purple-50 text-purple-700 font-bold' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    }`}
                  >
                    <SettingsIcon className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="font-bold text-text-primary leading-tight">Configuració Cron</p>
                      <p className="text-[11px] text-text-muted">Tasques automàtiques</p>
                    </div>
                  </Link>

                  <Link
                    to="/logs"
                    className={`px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-colors ${
                      isActive('/logs') ? 'bg-purple-50 text-purple-700 font-bold' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    }`}
                  >
                    <Terminal className="w-4 h-4 text-slate-700" />
                    <div>
                      <p className="font-bold text-text-primary leading-tight">Logs del Sistema</p>
                      <p className="text-[11px] text-text-muted">Registre d'auditoria tècnica</p>
                    </div>
                  </Link>
                </div>
              )}
            </div>
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
            className="p-2 text-text-muted hover:text-brand-500 hover:bg-brand-50 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile menu button */}
        <button 
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden p-2 text-text-secondary hover:bg-bg-hover rounded-xl"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer (Clean categorized layout) */}
      {mobileOpen && (
        <div className="lg:hidden glass-card mt-2 p-4 flex flex-col gap-4 animate-fade-in max-h-[85vh] overflow-y-auto">
          {/* User Profile Header */}
          <div className="pb-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-600 font-bold text-sm flex items-center justify-center">
                {user?.nom?.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-sm text-text-primary">{user?.nom} {user?.cognoms}</p>
                <p className="text-xs text-text-muted">{user?.email} • <span className="capitalize">{user?.rol}</span></p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              title="Tancar sessió"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Section 1: El meu Entrenament */}
          {isAtleta && (
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand-500" />
                El meu Entrenament
              </p>
              <Link
                to="/calendar"
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                  isActive('/calendar') ? 'bg-brand-50 text-brand-600' : 'text-text-secondary hover:bg-bg-hover'
                }`}
              >
                <Calendar className="w-4 h-4 text-brand-500" /> El meu Calendari
              </Link>
              <Link
                to="/wellness"
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                  isActive('/wellness') ? 'bg-brand-50 text-brand-600' : 'text-text-secondary hover:bg-bg-hover'
                }`}
              >
                <HeartPulse className="w-4 h-4 text-emerald-500" /> Wellness & Fatiga
              </Link>
              <Link
                to="/informe"
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                  isActive('/informe') ? 'bg-brand-50 text-brand-600' : 'text-text-secondary hover:bg-bg-hover'
                }`}
              >
                <FileText className="w-4 h-4 text-sky-600" /> Historial & Informes
              </Link>
              <Link
                to="/nutricio"
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                  isActive('/nutricio') ? 'bg-brand-50 text-brand-600' : 'text-text-secondary hover:bg-bg-hover'
                }`}
              >
                <Apple className="w-4 h-4 text-amber-500" /> Estratègia Nutricional
              </Link>
            </div>
          )}

          {/* Section 2: Curses */}
          <div className="space-y-1 pt-2 border-t border-border">
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-rose-500" />
              Competicions & Curses
            </p>
            {isAtleta && (
              <Link
                to="/competicions/atleta"
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                  isActive('/competicions/atleta') ? 'bg-brand-50 text-brand-600' : 'text-text-secondary hover:bg-bg-hover'
                }`}
              >
                <Trophy className="w-4 h-4 text-rose-500" /> Les meves Curses (Obj. A/B/C)
              </Link>
            )}
            <Link
              to="/team-races"
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                isActive('/team-races') ? 'bg-brand-50 text-brand-600' : 'text-text-secondary hover:bg-bg-hover'
              }`}
            >
              <Users className="w-4 h-4 text-amber-500" /> Curses d'Equip (Team Hub)
            </Link>
          </div>

          {/* Section 3: Club & Serveis */}
          <div className="space-y-1 pt-2 border-t border-border">
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-teal-600" />
              Club & Serveis
            </p>
            <Link
              to="/anuncis"
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                isActive('/anuncis') ? 'bg-brand-50 text-brand-600' : 'text-text-secondary hover:bg-bg-hover'
              }`}
            >
              <Megaphone className="w-4 h-4 text-amber-500" /> Tauler d'Anuncis
            </Link>
            <Link
              to="/material"
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                isActive('/material') ? 'bg-brand-50 text-brand-600' : 'text-text-secondary hover:bg-bg-hover'
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-emerald-500" /> Equipament & Roba
            </Link>
            <Link
              to="/feedback"
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                isActive('/feedback') ? 'bg-brand-50 text-brand-600' : 'text-text-secondary hover:bg-bg-hover'
              }`}
            >
              <Bug className="w-4 h-4 text-purple-500" /> Bústia de Feedback & Bugs
            </Link>
          </div>

          {/* Section 4: Entrenador */}
          {(isEntrenador || isAdmin) && (
            <div className="space-y-1 pt-2 border-t border-border">
              <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-500" />
                Gestió Entrenador
              </p>
              <Link
                to="/dashboard"
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                  isActive('/dashboard') ? 'bg-blue-50 text-blue-700' : 'text-text-secondary hover:bg-bg-hover'
                }`}
              >
                <Activity className="w-4 h-4 text-blue-500" /> Matriu de Disponibilitats
              </Link>
              <Link
                to="/planning"
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                  isActive('/planning') ? 'bg-blue-50 text-blue-700' : 'text-text-secondary hover:bg-bg-hover'
                }`}
              >
                <Layers className="w-4 h-4 text-indigo-500" /> Planning d'Equip
              </Link>
              <Link
                to="/atletes"
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                  isActive('/atletes') ? 'bg-blue-50 text-blue-700' : 'text-text-secondary hover:bg-bg-hover'
                }`}
              >
                <UserCheck className="w-4 h-4 text-teal-600" /> Gestió d'Atletes
              </Link>
              <Link
                to="/tests"
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                  isActive('/tests') ? 'bg-blue-50 text-blue-700' : 'text-text-secondary hover:bg-bg-hover'
                }`}
              >
                <ClipboardList className="w-4 h-4 text-purple-600" /> Proves Físiques & Tests
              </Link>
              <Link
                to="/competicions/entrenador"
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                  isActive('/competicions/entrenador') ? 'bg-blue-50 text-blue-700' : 'text-text-secondary hover:bg-bg-hover'
                }`}
              >
                <Trophy className="w-4 h-4 text-rose-500" /> Curses dels Atletes
              </Link>
              <Link
                to="/weeks"
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                  isActive('/weeks') ? 'bg-blue-50 text-blue-700' : 'text-text-secondary hover:bg-bg-hover'
                }`}
              >
                <Clock className="w-4 h-4 text-slate-500" /> Gestor de Setmanes
              </Link>
            </div>
          )}

          {/* Section 5: Admin */}
          {isAdmin && (
            <div className="space-y-1 pt-2 border-t border-border">
              <p className="text-[11px] font-bold text-purple-700 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                Administració & Sistema
              </p>
              <Link
                to="/admin"
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                  isActive('/admin') ? 'bg-purple-100 text-purple-800' : 'text-text-secondary hover:bg-bg-hover'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-purple-600" /> Panell d'Usuaris (Impersonar)
              </Link>
              <Link
                to="/activitats"
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                  isActive('/activitats') ? 'bg-purple-50 text-purple-700' : 'text-text-secondary hover:bg-bg-hover'
                }`}
              >
                <Palette className="w-4 h-4 text-rose-500" /> Esports & Activitats
              </Link>
              <Link
                to="/forms"
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                  isActive('/forms') ? 'bg-purple-50 text-purple-700' : 'text-text-secondary hover:bg-bg-hover'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-teal-600" /> Formularis Dinàmics
              </Link>
              <Link
                to="/settings"
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                  isActive('/settings') ? 'bg-purple-50 text-purple-700' : 'text-text-secondary hover:bg-bg-hover'
                }`}
              >
                <SettingsIcon className="w-4 h-4 text-slate-500" /> Configuració Cron
              </Link>
              <Link
                to="/logs"
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                  isActive('/logs') ? 'bg-purple-50 text-purple-700' : 'text-text-secondary hover:bg-bg-hover'
                }`}
              >
                <Terminal className="w-4 h-4 text-slate-700" /> Logs del Sistema
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
