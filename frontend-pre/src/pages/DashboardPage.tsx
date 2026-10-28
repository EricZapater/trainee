import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { HeartPulse, Trophy, Activity, ArrowRight } from 'lucide-react'

export const DashboardPage: React.FC = () => {
  const { user, isEntrenador } = useAuth()

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
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
              Benvingut al nou entorn de desenvolupament de TrainEE. Aquí pots testejar les noves funcionalitats de <strong className="text-text-primary">Wellness</strong> i <strong className="text-text-primary">Curses d'Equip</strong> sobre la base de dades aïllada.
            </p>
          </div>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module 1: Wellness */}
        <div className="glass-card p-6 flex flex-col justify-between hover:shadow-lg transition-all border-l-4 border-l-emerald-500">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <HeartPulse className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Mòdul Wellness & RPE</h2>
            <p className="text-text-secondary text-sm leading-relaxed mb-4">
              Avaluació setmanal de càrrega interna: Qualitat del son, nivell d'estrès, dolor muscular, ànim i mapa anatòmic de molèsties per prevenir lesions.
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md font-medium">Semàfor de fatiga</span>
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md font-medium">Escala Borg CR-10</span>
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md font-medium">1 cop/setmana</span>
            </div>
          </div>
          <Link
            to="/wellness"
            className="inline-flex items-center justify-between w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
          >
            <span>{isEntrenador ? "Obrir Panell de Wellness" : "Completar el meu Wellness"}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Module 2: Team Races */}
        <div className="glass-card p-6 flex flex-col justify-between hover:shadow-lg transition-all border-l-4 border-l-amber-500">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Trophy className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Team Race Hub (Curses d'Equip)</h2>
            <p className="text-text-secondary text-sm leading-relaxed mb-4">
              Comunitat de competicions del club: descobreix quins companys coincideixen a la mateixa cursa, comparteix viatges i track GPX, amb opció de privacitat individual.
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md font-medium">Auto-link per cursa</span>
              <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md font-medium">Privacitat granular</span>
              <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md font-medium">Coordinació de viatge</span>
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
      </div>
    </div>
  )
}
