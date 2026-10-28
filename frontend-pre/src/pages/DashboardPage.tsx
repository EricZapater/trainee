import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { HeartPulse, Trophy, Activity, ArrowRight, Calendar, Users, ShieldCheck } from 'lucide-react'

export const DashboardPage: React.FC = () => {
  const { user, isEntrenador, isAtleta, isAdmin } = useAuth()

  return (
    <div className="space-y-6">
      {/* Welcome Hero */}
      <div className="glass-card p-6 md:p-8 bg-gradient-to-r from-white/90 via-white/80 to-brand-50/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-600 text-xs font-bold mb-3">
              <Activity className="w-3.5 h-3.5" /> Entorn PRE (React + Tailwind)
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight">
              Hola, {user?.nom} 👋
            </h1>
            <p className="text-text-secondary text-sm md:text-base mt-1 max-w-2xl">
              Benvingut al nou entorn de preproducció de TrainEE. Pots testejar el nou flux complet amb <strong className="text-text-primary">Calendari de Disponibilitat</strong>, <strong className="text-text-primary">Mòdul Wellness</strong> i <strong className="text-text-primary">Competicions</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Module 1: Calendar (Atleta & Admin) */}
        {isAtleta && (
          <div className="glass-card p-6 flex flex-col justify-between hover:shadow-lg transition-all border-l-4 border-l-brand-500">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">El meu Calendari</h2>
              <p className="text-text-secondary text-xs sm:text-sm leading-relaxed mb-4">
                Organitza la teva disponibilitat d'entrenament dia a dia, aplica plantilles habituals i envia la teva previsió a l'entrenador.
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="text-xs bg-brand-50 text-brand-700 px-2.5 py-1 rounded-md font-medium">Mobile-First</span>
                <span className="text-xs bg-brand-50 text-brand-700 px-2.5 py-1 rounded-md font-medium">Plantilles ràpides</span>
              </div>
            </div>
            <Link
              to="/calendar"
              className="inline-flex items-center justify-between w-full px-4 py-2.5 btn-primary font-semibold rounded-xl text-sm transition-colors shadow-sm"
            >
              <span>Obrir Calendari</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Module 2: Wellness (Tothom) */}
        <div className="glass-card p-6 flex flex-col justify-between hover:shadow-lg transition-all border-l-4 border-l-emerald-500">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <HeartPulse className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Mòdul Wellness & RPE</h2>
            <p className="text-text-secondary text-xs sm:text-sm leading-relaxed mb-4">
              Avaluació setmanal de càrrega interna: Qualitat del son, nivell d'estrès, dolor muscular, ànim i mapa anatòmic de molèsties per prevenir lesions.
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md font-medium">Protocol Hooper</span>
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md font-medium">Escala Borg CR-10</span>
            </div>
          </div>
          <Link
            to="/wellness"
            className="inline-flex items-center justify-between w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
          >
            <span>{isEntrenador && !isAtleta ? "Obrir Panell de Wellness" : "Completar el meu Wellness"}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Module 3: Athlete Competitions (Atleta & Admin) */}
        {isAtleta && (
          <div className="glass-card p-6 flex flex-col justify-between hover:shadow-lg transition-all border-l-4 border-l-rose-500">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                <Trophy className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">Les meves Competicions</h2>
              <p className="text-text-secondary text-xs sm:text-sm leading-relaxed mb-4">
                Defineix els teus reptes de la temporada (Objectius A, B i C), carrega fitxers GPX i enllaços oficials.
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="text-xs bg-rose-50 text-rose-700 px-2.5 py-1 rounded-md font-medium">Objectius A/B/C</span>
                <span className="text-xs bg-rose-50 text-rose-700 px-2.5 py-1 rounded-md font-medium">Tracks GPX</span>
              </div>
            </div>
            <Link
              to="/competicions/atleta"
              className="inline-flex items-center justify-between w-full px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
            >
              <span>Gestionar Curses</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Module 4: Team Races (Tothom) */}
        <div className="glass-card p-6 flex flex-col justify-between hover:shadow-lg transition-all border-l-4 border-l-amber-500">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Curses d'Equip (Hub)</h2>
            <p className="text-text-secondary text-xs sm:text-sm leading-relaxed mb-4">
              Punt de trobada del club: mira quins companys corren la mateixa cursa, coordina viatges en cotxe compartit i descarrega el track.
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md font-medium">Cotxe compartit</span>
              <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md font-medium">Privacitat</span>
            </div>
          </div>
          <Link
            to="/team-races"
            className="inline-flex items-center justify-between w-full px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
          >
            <span>Explorar Curses del Club</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Module 5: Admin Panel (Admin) */}
        {isAdmin && (
          <div className="glass-card p-6 flex flex-col justify-between hover:shadow-lg transition-all border-l-4 border-l-purple-500">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">Panell d'Admin</h2>
              <p className="text-text-secondary text-xs sm:text-sm leading-relaxed mb-4">
                Gestió global d'usuaris, rols, restabliment de contrasenyes i eina d'impersonació per entrar com a qualsevol atleta.
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md font-medium">Impersonació</span>
                <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md font-medium">Gestió usuaris</span>
              </div>
            </div>
            <Link
              to="/admin"
              className="inline-flex items-center justify-between w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
            >
              <span>Accedir a l'Admin</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
