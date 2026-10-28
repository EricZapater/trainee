import React, { useState, useEffect } from 'react'
import { 
  Trophy, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  ExternalLink, 
  ArrowRightLeft, 
  Search,
  History,
  Clock
} from 'lucide-react'
import { 
  getEntrenadorCompeticions, 
  getHistoricCompeticions, 
  traspassarCompeticio, 
  updateCompeticioTipus 
} from '../api/entrenador'
import type { Competicio } from '../types'

export const CoachCompetitionsPage: React.FC = () => {
  const [competicions, setCompeticions] = useState<Competicio[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pendents' | 'historic'>('pendents')
  const [search, setSearch] = useState('')
  const [tipusFilter, setTipusFilter] = useState<'tots' | 'A' | 'B' | 'C'>('tots')
  const [traspassantId, setTraspassantId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadData(activeTab)
  }, [activeTab])

  const loadData = async (tab: 'pendents' | 'historic') => {
    setLoading(true)
    try {
      if (tab === 'pendents') {
        const data = await getEntrenadorCompeticions()
        setCompeticions(data)
      } else {
        const data = await getHistoricCompeticions()
        setCompeticions(data)
      }
    } catch (err) {
      console.error('Error carregant competicions:', err)
      showNotification('error', 'No s\'han pogut carregar les competicions.')
    } finally {
      setLoading(false)
    }
  }

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text })
    setTimeout(() => setFeedback(null), 4000)
  }

  const handleTraspassar = async (comp: Competicio) => {
    if (!window.confirm(`Vols traspassar "${comp.nom}" al calendari de ${comp.atleta_nom || 'l\'atleta'} per al dia ${comp.data}?`)) {
      return
    }

    setTraspassantId(comp.id)
    try {
      await traspassarCompeticio(comp.id)
      showNotification('success', `Competició traspassada amb èxit al calendari de ${comp.atleta_nom || 'l\'atleta'}!`)
      loadData(activeTab)
    } catch (err: any) {
      console.error('Error traspassant competició:', err)
      showNotification('error', err.response?.data?.error || 'Error traspassant la competició al calendari.')
    } finally {
      setTraspassantId(null)
    }
  }

  const handleChangeTipus = async (comp: Competicio, nouTipus: string) => {
    try {
      await updateCompeticioTipus(comp.id, nouTipus)
      showNotification('success', `Objectiu canviat a tipus ${nouTipus}.`)
      setCompeticions(prev => prev.map(c => c.id === comp.id ? { ...c, tipus: nouTipus as any } : c))
    } catch (err: any) {
      console.error('Error canviant tipus:', err)
      showNotification('error', 'Error actualitzant tipus d\'objectiu.')
    }
  }

  const filteredCompeticions = competicions.filter(c => {
    const matchesSearch = 
      c.nom.toLowerCase().includes(search.toLowerCase()) ||
      (c.atleta_nom && c.atleta_nom.toLowerCase().includes(search.toLowerCase())) ||
      (c.atleta_cognoms && c.atleta_cognoms.toLowerCase().includes(search.toLowerCase()))

    const matchesTipus = tipusFilter === 'tots' ? true : c.tipus === tipusFilter
    return matchesSearch && matchesTipus
  })

  const getTipusBadgeColor = (tipus: 'A' | 'B' | 'C') => {
    switch (tipus) {
      case 'A': return 'bg-rose-100 text-rose-800 border-rose-300'
      case 'B': return 'bg-amber-100 text-amber-800 border-amber-300'
      case 'C': return 'bg-sky-100 text-sky-800 border-sky-300'
    }
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Feedback */}
      {feedback && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 border animate-fade-in ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
          <span className="text-sm font-semibold">{feedback.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="glass-card p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
              Gestió Tècnica
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary flex items-center gap-2.5 mt-1">
            <Trophy className="w-6 h-6 text-rose-600" />
            Competicions dels Atletes i Traspàs
          </h2>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Revisa les curses proposades pels teus atletes, valida els objectius A/B/C i traspassa-les directament al seu calendari.
          </p>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('pendents')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 ${
              activeTab === 'pendents' ? 'bg-brand-500 text-white shadow-sm' : 'bg-white/60 text-text-secondary hover:text-text-primary'
            }`}
          >
            <Clock className="w-4 h-4" /> Properes Curses
          </button>
          <button
            onClick={() => setActiveTab('historic')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 ${
              activeTab === 'historic' ? 'bg-brand-500 text-white shadow-sm' : 'bg-white/60 text-text-secondary hover:text-text-primary'
            }`}
          >
            <History className="w-4 h-4" /> Històric de Curses
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cerca cursa o atleta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 rounded-xl bg-white/80 border border-border-light focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <select
            value={tipusFilter}
            onChange={(e) => setTipusFilter(e.target.value as any)}
            className="px-3 py-2 text-xs font-bold rounded-xl bg-white border border-border-light text-text-primary shadow-sm focus:outline-none"
          >
            <option value="tots">Tots els objectius</option>
            <option value="A">Només Obj. A</option>
            <option value="B">Només Obj. B</option>
            <option value="C">Només Obj. C</option>
          </select>
        </div>
      </div>

      {/* Competitions Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-text-muted text-sm font-medium">Carregant competicions...</p>
        </div>
      ) : filteredCompeticions.length === 0 ? (
        <div className="glass-card p-12 text-center text-text-muted">
          <Trophy className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-sm">Cap competició en aquest apartat.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompeticions.map(comp => (
            <div 
              key={comp.id}
              className="glass-card p-4 sm:p-5 flex flex-col justify-between border border-border-light hover:border-brand-500/40 transition-all shadow-sm space-y-4"
            >
              <div className="space-y-3">
                {/* Athlete tag & Objective */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-brand-50 text-brand-600 font-bold text-xs flex items-center justify-center border border-brand-200">
                      {comp.atleta_nom?.charAt(0) || 'A'}
                    </div>
                    <span className="font-bold text-xs text-text-primary">
                      {comp.atleta_nom} {comp.atleta_cognoms}
                    </span>
                  </div>

                  <select
                    value={comp.tipus}
                    onChange={(e) => handleChangeTipus(comp, e.target.value)}
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border cursor-pointer outline-none ${getTipusBadgeColor(comp.tipus)}`}
                  >
                    <option value="A">Obj. A (Principal)</option>
                    <option value="B">Obj. B (Secundari)</option>
                    <option value="C">Obj. C (Entrenament)</option>
                  </select>
                </div>

                <div>
                  <h3 className="font-bold text-base text-text-primary line-clamp-2">
                    {comp.nom}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-text-muted mt-1">
                    <Calendar className="w-3.5 h-3.5 text-brand-500" />
                    <span className="font-medium text-text-primary">{comp.data}</span>
                    {(comp.kms || comp.desnivell) && (
                      <span className="text-slate-400">•</span>
                    )}
                    {comp.kms && <span>{comp.kms} km</span>}
                    {comp.desnivell && <span>+{comp.desnivell}m</span>}
                  </div>
                </div>

                {comp.comentaris && (
                  <p className="italic text-slate-500 bg-bg-surface/60 p-2.5 rounded-xl text-xs">
                    "{comp.comentaris}"
                  </p>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-border-light flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {comp.enllac && (
                    <a 
                      href={comp.enllac.startsWith('http') ? comp.enllac : `https://${comp.enllac}`}
                      target="_blank" 
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-bg-surface hover:bg-white text-text-secondary hover:text-brand-600 transition-colors"
                      title="Web oficial"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  {comp.track_gpx_path && (
                    <a 
                      href={comp.track_gpx_path}
                      download
                      className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors flex items-center gap-1 text-[11px] font-bold"
                      title="Descarregar GPX"
                    >
                      <Download className="w-3.5 h-3.5" /> GPX
                    </a>
                  )}
                </div>

                {activeTab === 'pendents' && (
                  <button
                    onClick={() => handleTraspassar(comp)}
                    disabled={traspassantId === comp.id}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>{traspassantId === comp.id ? 'Traspassant...' : 'Traspassar al Calendari'}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
