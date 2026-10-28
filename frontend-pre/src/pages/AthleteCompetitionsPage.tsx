import React, { useState, useEffect } from 'react'
import { 
  Trophy, 
  Plus, 
  Calendar, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  Edit2,
  X
} from 'lucide-react'
import { getAtletaCompeticions, createCompeticio, updateCompeticio } from '../api/competicions'
import type { Competicio } from '../types'

export const AthleteCompetitionsPage: React.FC = () => {
  const [competicions, setCompeticions] = useState<Competicio[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'actives' | 'descartades'>('actives')
  const [showModal, setShowModal] = useState(false)
  const [editingComp, setEditingComp] = useState<Competicio | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form state
  const [nom, setNom] = useState('')
  const [data, setData] = useState('')
  const [tipus, setTipus] = useState<'A' | 'B' | 'C'>('A')
  const [kms, setKms] = useState<string>('')
  const [desnivell, setDesnivell] = useState<string>('')
  const [enllac, setEnllac] = useState('')
  const [comentaris, setComentaris] = useState('')
  const [gpxFile, setGpxFile] = useState<File | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getAtletaCompeticions()
      setCompeticions(data)
    } catch (err) {
      console.error('Error carregant competicions:', err)
      showNotification('error', 'No s\'han pogut carregar les teves competicions.')
    } finally {
      setLoading(false)
    }
  }

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text })
    setTimeout(() => setFeedback(null), 4000)
  }

  const openCreateModal = () => {
    setEditingComp(null)
    setNom('')
    setData('')
    setTipus('A')
    setKms('')
    setDesnivell('')
    setEnllac('')
    setComentaris('')
    setGpxFile(null)
    setShowModal(true)
  }

  const openEditModal = (comp: Competicio) => {
    setEditingComp(comp)
    setNom(comp.nom)
    setData(comp.data)
    setTipus(comp.tipus)
    setKms(comp.kms ? comp.kms.toString() : '')
    setDesnivell(comp.desnivell ? comp.desnivell.toString() : '')
    setEnllac(comp.enllac || '')
    setComentaris(comp.comentaris || '')
    setGpxFile(null)
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nom || !data) {
      showNotification('error', 'El nom i la data són obligatoris.')
      return
    }

    setSubmitting(true)
    const formData = new FormData()
    formData.append('nom', nom)
    formData.append('data', data)
    formData.append('tipus', tipus)
    formData.append('enllac', enllac)
    formData.append('comentaris', comentaris)
    if (kms) formData.append('kms', kms)
    if (desnivell) formData.append('desnivell', desnivell)
    if (gpxFile) formData.append('track_gpx', gpxFile)

    try {
      if (editingComp) {
        formData.append('estat', editingComp.estat)
        await updateCompeticio(editingComp.id, formData)
        showNotification('success', 'Competició actualitzada correctament!')
      } else {
        await createCompeticio(formData)
        showNotification('success', 'Nova competició afegida al teu calendari!')
      }
      setShowModal(false)
      loadData()
    } catch (err) {
      console.error('Error guardant competició:', err)
      showNotification('error', 'Error en desar la competició.')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleDescartar = async (comp: Competicio) => {
    const nouEstat = comp.estat === 'activa' ? 'descartada' : 'activa'
    const formData = new FormData()
    formData.append('nom', comp.nom)
    formData.append('data', comp.data)
    formData.append('tipus', comp.tipus)
    formData.append('enllac', comp.enllac || '')
    formData.append('estat', nouEstat)
    if (comp.kms) formData.append('kms', comp.kms.toString())
    if (comp.desnivell) formData.append('desnivell', comp.desnivell.toString())
    if (comp.comentaris) formData.append('comentaris', comp.comentaris)

    try {
      await updateCompeticio(comp.id, formData)
      showNotification('success', nouEstat === 'descartada' ? 'Competició descartada.' : 'Competició reactivada.')
      loadData()
    } catch (err) {
      console.error('Error canviant estat:', err)
      showNotification('error', 'Error canviant l\'estat de la competició.')
    }
  }

  const filteredCompeticions = competicions.filter(c => 
    activeTab === 'actives' ? c.estat === 'activa' : c.estat === 'descartada'
  )

  const getTipusBadge = (tipus: 'A' | 'B' | 'C') => {
    switch (tipus) {
      case 'A':
        return <span className="bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold px-2.5 py-0.5 rounded-full">Obj. A (Principal)</span>
      case 'B':
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold px-2.5 py-0.5 rounded-full">Obj. B (Secundari)</span>
      case 'C':
        return <span className="bg-sky-100 text-sky-800 border border-sky-300 text-xs font-bold px-2.5 py-0.5 rounded-full">Obj. C (Entrenament)</span>
    }
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Toast feedback */}
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
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-brand-500" /> Les meves Competicions
          </h2>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Planifica els teus objectius de cursa de la temporada perquè el teu entrenador els tingui en compte.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="btn-primary text-sm py-2.5 px-4 w-full sm:w-auto flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nova Competició
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border-light pb-2">
        <button
          onClick={() => setActiveTab('actives')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
            activeTab === 'actives'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'bg-white/60 text-text-secondary hover:text-text-primary'
          }`}
        >
          Actives ({competicions.filter(c => c.estat === 'activa').length})
        </button>
        <button
          onClick={() => setActiveTab('descartades')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
            activeTab === 'descartades'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'bg-white/60 text-text-secondary hover:text-text-primary'
          }`}
        >
          Descartades ({competicions.filter(c => c.estat === 'descartada').length})
        </button>
      </div>

      {/* Competitions List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-text-muted text-sm font-medium">Carregant competicions...</p>
        </div>
      ) : filteredCompeticions.length === 0 ? (
        <div className="glass-card p-12 text-center text-text-muted space-y-3">
          <Trophy className="w-12 h-12 mx-auto text-slate-300" />
          <p className="font-semibold text-sm">No tens cap competició en aquesta secció.</p>
          <button
            onClick={openCreateModal}
            className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Afegeix la teva primera cursa
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompeticions.map(comp => (
            <div 
              key={comp.id}
              className="glass-card p-4 sm:p-5 flex flex-col justify-between border border-border-light hover:border-brand-500/40 transition-all shadow-sm space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-base text-text-primary line-clamp-2">
                    {comp.nom}
                  </h3>
                  {getTipusBadge(comp.tipus)}
                </div>

                <div className="space-y-1.5 text-xs text-text-muted">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-brand-500" />
                    <span className="font-medium text-text-primary">{comp.data}</span>
                  </div>

                  {(comp.kms || comp.desnivell) && (
                    <div className="flex items-center gap-3 font-semibold text-text-secondary">
                      {comp.kms && <span>{comp.kms} km</span>}
                      {comp.desnivell && <span>+{comp.desnivell}m D+</span>}
                    </div>
                  )}

                  {comp.comentaris && (
                    <p className="italic text-slate-500 bg-bg-surface/60 p-2 rounded-lg mt-2 text-[11px]">
                      "{comp.comentaris}"
                    </p>
                  )}
                </div>
              </div>

              {/* Bottom links & Actions */}
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

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(comp)}
                    className="p-1.5 rounded-lg bg-bg-surface hover:bg-white text-text-secondary hover:text-text-primary transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleDescartar(comp)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-border-light text-text-muted hover:text-rose-600 hover:border-rose-300 transition-colors"
                  >
                    {comp.estat === 'activa' ? 'Descartar' : 'Reactivar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create / Edit Competition */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-card bg-white p-5 sm:p-7 rounded-2xl max-w-lg w-full shadow-2xl my-8 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-2 border-b border-border-light">
              <h3 className="font-bold text-lg text-text-primary flex items-center gap-2">
                <Trophy className="w-5 h-5 text-brand-500" />
                {editingComp ? 'Editar Competició' : 'Nova Competició'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-text-muted hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-text-primary mb-1">Nom de la cursa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ultra Pirineu, Marató dels Cims..."
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border-light focus:ring-2 focus:ring-brand-500/30 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-text-primary mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-border-light focus:ring-2 focus:ring-brand-500/30 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-text-primary mb-1">Prioritat / Objectiu *</label>
                  <select
                    value={tipus}
                    onChange={(e) => setTipus(e.target.value as 'A' | 'B' | 'C')}
                    className="w-full p-2.5 rounded-xl border border-border-light focus:ring-2 focus:ring-brand-500/30 outline-none font-semibold"
                  >
                    <option value="A">Objectiu A (Principal)</option>
                    <option value="B">Objectiu B (Secundari)</option>
                    <option value="C">Objectiu C (Entrenament)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-text-primary mb-1">Distància (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 42.2"
                    value={kms}
                    onChange={(e) => setKms(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-border-light focus:ring-2 focus:ring-brand-500/30 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-text-primary mb-1">Desnivell positiu (+m)</label>
                  <input
                    type="number"
                    placeholder="Ex: 2800"
                    value={desnivell}
                    onChange={(e) => setDesnivell(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-border-light focus:ring-2 focus:ring-brand-500/30 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-text-primary mb-1">Web oficial de la cursa</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={enllac}
                  onChange={(e) => setEnllac(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border-light focus:ring-2 focus:ring-brand-500/30 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-text-primary mb-1">Fitxer de track GPX (.gpx)</label>
                <input
                  type="file"
                  accept=".gpx"
                  onChange={(e) => setGpxFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs text-text-muted file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-bold text-text-primary mb-1">Comentaris o objectiu específic</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Vull provar material i nutrició de cursa..."
                  value={comentaris}
                  onChange={(e) => setComentaris(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border-light focus:ring-2 focus:ring-brand-500/30 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border-light">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-primary rounded-xl"
                >
                  Cancel·lar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs py-2 px-5 disabled:opacity-50"
                >
                  {submitting ? 'Desant...' : editingComp ? 'Desar Canvis' : 'Crear Competició'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
