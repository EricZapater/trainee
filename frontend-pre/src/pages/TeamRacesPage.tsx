import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import { 
  Trophy, 
  MapPin, 
  Calendar, 
  Download, 
  Users, 
  Car, 
  Lock, 
  Eye, 
  EyeOff, 
  Plus, 
  X, 
  Mountain,
  Search,
  CheckCircle2,
  Check,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Trash2,
  UserMinus
} from 'lucide-react'
import type { EsdevenimentEquip } from '../types'

export const TeamRacesPage: React.FC = () => {
  const { user, isEntrenador, isAdmin } = useAuth()
  const canManage = isEntrenador || isAdmin

  const [races, setRaces] = useState<EsdevenimentEquip[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')

  // Join modal form state
  const [selectedRaceForJoin, setSelectedRaceForJoin] = useState<EsdevenimentEquip | null>(null)
  const [tipusObjectiu, setTipusObjectiu] = useState<'A' | 'B' | 'C'>('A')
  const [kms, setKms] = useState<number>(0)
  const [visibilitatEquip, setVisibilitatEquip] = useState<boolean>(true)
  const [comparteixTransport, setComparteixTransport] = useState<boolean>(false)
  const [ciutatOrigen, setCiutatOrigen] = useState<string>('')
  const [submittingJoin, setSubmittingJoin] = useState<boolean>(false)

  // Create Race Modal (for club proposal)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [submittingCreate, setSubmittingCreate] = useState(false)
  const [newRaceForm, setNewRaceForm] = useState({
    nom: '',
    data: '',
    poblacio: '',
    kms: 42,
    desnivell: 1500,
    enllac_oficial: '',
    notes_equip: ''
  })

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadTeamRaces = async () => {
    setLoading(true)
    try {
      const res = await api.get('/competicions/equip')
      setRaces(res.data || [])
    } catch (e: any) {
      console.error("Error carregant curses d'equip:", e)
      showToast(e.response?.data?.error || "Error en carregar les curses d'equip del servidor", 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTeamRaces()
  }, [])

  // Filtered races
  const filteredRaces = useMemo(() => {
    return races.filter(r => {
      const q = searchQuery.toLowerCase().trim()
      if (!q) return true
      const nom = r.nom || ''
      const loc = r.poblacio || r.localitzacio || ''
      const notes = r.notes_equip || ''
      return (
        nom.toLowerCase().includes(q) ||
        loc.toLowerCase().includes(q) ||
        notes.toLowerCase().includes(q)
      )
    })
  }, [races, searchQuery])

  // Helper to determine if the current user is registered in a race
  const getUserParticipation = (race: EsdevenimentEquip) => {
    if (race.user_participant) return race.user_participant
    const list = race.atletes || race.participants || []
    return list.find(a => (a.atleta_id || a.usuari_id) === user?.id)
  }

  const openJoinModal = (race: EsdevenimentEquip) => {
    setSelectedRaceForJoin(race)
    const existing = getUserParticipation(race)
    if (existing) {
      const obj = (existing.tipus_objectiu || existing.objectiu || 'A') as 'A' | 'B' | 'C'
      setTipusObjectiu(['A', 'B', 'C'].includes(obj) ? obj : 'A')
      setKms(existing.kms || race.kms || race.distancia_km || 42)
      setVisibilitatEquip(existing.privacitat ? existing.privacitat === 'equip' : !existing.es_privada)
      setComparteixTransport(existing.disposa_cotxe ?? existing.comparteix_transport ?? false)
      setCiutatOrigen(existing.ciutat_origen || existing.ciutat_origen_transport || '')
    } else {
      setKms(race.kms || race.distancia_km || 42)
      setTipusObjectiu('A')
      setVisibilitatEquip(true)
      setComparteixTransport(false)
      setCiutatOrigen('')
    }
  }

  const handleJoinRace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRaceForJoin) return

    setSubmittingJoin(true)
    try {
      const payload = {
        estat: 'inscrit',
        objectiu: tipusObjectiu,
        tipus_objectiu: tipusObjectiu,
        kms,
        privacitat: visibilitatEquip ? 'equip' : 'privat',
        visibilitat_equip: visibilitatEquip,
        disposa_cotxe: comparteixTransport,
        comparteix_transport: comparteixTransport,
        places_lliures: comparteixTransport ? 1 : 0,
        ciutat_origen: ciutatOrigen.trim() || undefined,
        ciutat_origen_transport: ciutatOrigen.trim() || undefined
      }
      await api.post(`/competicions/equip/${selectedRaceForJoin.id}/join`, payload)
      showToast("Inscripció guardada correctament!")
      setSelectedRaceForJoin(null)
      await loadTeamRaces()
    } catch (e: any) {
      console.error("Error registrant inscripció:", e)
      showToast(e.response?.data?.error || "Error registrant la inscripció a la cursa", 'error')
    } finally {
      setSubmittingJoin(false)
    }
  }

  const handleLeaveRace = async (raceId: string, nom: string) => {
    if (!window.confirm(`Segur que vols donar-te de baixa de la cursa "${nom}"?`)) return
    try {
      await api.delete(`/competicions/equip/${raceId}/leave`)
      showToast("T'has donat de baixa correctament.")
      await loadTeamRaces()
    } catch (e: any) {
      console.error("Error cancel·lant inscripció:", e)
      showToast(e.response?.data?.error || "Error cancel·lant la inscripció", 'error')
    }
  }

  const handleDeleteRace = async (raceId: string, nom: string) => {
    if (!window.confirm(`Segur que vols eliminar la cursa d'equip "${nom}" per a tothom?`)) return
    try {
      await api.delete(`/competicions/equip/${raceId}`)
      showToast("Cursa d'equip eliminada correctament.")
      await loadTeamRaces()
    } catch (e: any) {
      console.error("Error eliminant cursa:", e)
      showToast(e.response?.data?.error || "Error eliminant la cursa d'equip", 'error')
    }
  }

  const handleCreateRaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRaceForm.nom.trim() || !newRaceForm.data) {
      showToast('El nom i la data de la cursa són obligatoris', 'error')
      return
    }

    setSubmittingCreate(true)
    try {
      const payload = {
        nom: newRaceForm.nom.trim(),
        data_inici: newRaceForm.data,
        data: newRaceForm.data,
        localitzacio: newRaceForm.poblacio.trim() || undefined,
        poblacio: newRaceForm.poblacio.trim() || undefined,
        distancia_km: newRaceForm.kms,
        kms: newRaceForm.kms,
        desnivell_positiu: newRaceForm.desnivell,
        desnivell: newRaceForm.desnivell,
        web_oficial: newRaceForm.enllac_oficial.trim() || undefined,
        enllac_oficial: newRaceForm.enllac_oficial.trim() || undefined,
        notes_equip: newRaceForm.notes_equip.trim() || undefined
      }
      await api.post('/competicions/equip', payload)
      showToast("Cursa d'equip publicada al calendari de club!")
      setCreateModalOpen(false)
      setNewRaceForm({
        nom: '',
        data: '',
        poblacio: '',
        kms: 42,
        desnivell: 1500,
        enllac_oficial: '',
        notes_equip: ''
      })
      await loadTeamRaces()
    } catch (e: any) {
      console.error("Error creant cursa d'equip:", e)
      showToast(e.response?.data?.error || "Error creant la cursa d'equip", 'error')
    } finally {
      setSubmittingCreate(false)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Toast */}
      {toastMessage && (
        <div 
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 animate-fade-in ${
            toastMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="glass-card p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold mb-2">
            <Trophy className="w-3.5 h-3.5" /> Comunitat de Curses del Club
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-text-primary tracking-tight">Team Race Hub</h1>
          <p className="text-text-secondary text-xs sm:text-sm mt-1 max-w-2xl">
            Descobreix quines competicions comparteixes amb els companys de club, coordina vehicles per desplaçar-vos i prepara la logística conjunta.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-sm flex items-center justify-center gap-2 transition-all shrink-0 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Proposar Cursa d'Equip
        </button>
      </div>

      {/* Search Bar */}
      <div className="glass-card p-4 flex items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cercar per nom de cursa, població o notes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-bg-surface border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <span className="text-xs text-text-muted font-bold hidden sm:inline-block">
          {filteredRaces.length} {filteredRaces.length === 1 ? 'cursa trobada' : 'curses trobades'}
        </span>
      </div>

      {/* Race Cards List */}
      {loading ? (
        <div className="glass-card p-12 text-center text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-500 mb-3" />
          <p className="text-sm font-semibold">Carregant el calendari de club...</p>
        </div>
      ) : filteredRaces.length === 0 ? (
        <div className="glass-card p-12 text-center text-text-muted">
          <Trophy className="w-12 h-12 mx-auto text-text-muted/40 mb-3" />
          <h3 className="text-base font-bold text-text-primary">Cap cursa d'equip trobada</h3>
          <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
            {searchQuery ? 'Cap resultat coincideix amb la teva cerca.' : 'Encara no s\'ha programat cap cursa comunitària per a aquesta temporada.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredRaces.map((race) => {
            const raceDate = race.data || race.data_inici || ''
            const raceLoc = race.poblacio || race.localitzacio || ''
            const raceKms = race.kms ?? race.distancia_km
            const raceDesnivell = race.desnivell ?? race.desnivell_positiu
            const raceWeb = race.enllac_oficial || race.web_oficial
            const raceGpx = race.gpx_url || race.fitxer_gpx
            const athletes = race.atletes || race.participants || []
            const totalInscrits = race.total_inscrits ?? race.participants_count ?? athletes.length
            const userPart = getUserParticipation(race)
            const canDeleteRace = canManage || (user?.id && race.creat_per === user.id)

            return (
              <div key={race.id} className="glass-card p-4 sm:p-6 space-y-5 hover:shadow-lg transition-all">
                {/* Top Bar: Title, Date, Badges */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-border">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-lg sm:text-xl font-bold text-text-primary">{race.nom}</h2>
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        <Users className="w-3.5 h-3.5" /> {totalInscrits} atletes del club
                      </span>
                      {userPart && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="w-3.5 h-3.5" /> Hi participes
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-text-muted pt-0.5">
                      {raceDate && (
                        <span className="flex items-center gap-1 font-semibold text-text-secondary">
                          <Calendar className="w-3.5 h-3.5 text-brand-500" />
                          {new Date(raceDate + 'T00:00:00').toLocaleDateString('ca-ES', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      )}
                      {raceLoc && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-text-secondary" /> {raceLoc}
                        </span>
                      )}
                      {raceKms && (
                        <span className="flex items-center gap-1">
                          <Mountain className="w-3.5 h-3.5 text-emerald-500" /> {raceKms} km {raceDesnivell ? `| +${raceDesnivell}m D+` : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                    {raceWeb && (
                      <a
                        href={raceWeb}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-bg-surface hover:bg-bg-hover text-text-secondary border border-border flex items-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Web Oficial
                      </a>
                    )}
                    {raceGpx && raceGpx !== '#' && (
                      <a
                        href={raceGpx}
                        download
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-bg-hover hover:bg-border text-text-primary transition-colors flex items-center gap-1.5 border border-border"
                      >
                        <Download className="w-3.5 h-3.5 text-brand-500" /> Track GPX
                      </a>
                    )}

                    {userPart ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openJoinModal(race)}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" /> Modificar dades
                        </button>
                        <button
                          onClick={() => handleLeaveRace(race.id, race.nom)}
                          title="Donar-me de baixa"
                          className="p-1.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => openJoinModal(race)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white transition-all shadow-sm flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Jo també hi vaig!
                      </button>
                    )}

                    {canDeleteRace && (
                      <button
                        onClick={() => handleDeleteRace(race.id, race.nom)}
                        title="Eliminar cursa d'equip"
                        className="p-1.5 rounded-xl text-xs font-semibold bg-bg-surface hover:bg-rose-50 text-text-muted hover:text-rose-600 border border-border transition-colors ml-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Coach's collective notes */}
                {race.notes_equip && (
                  <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                    <Trophy className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-950">Indicacions d'Equip:</p>
                      <p className="mt-0.5 leading-relaxed">{race.notes_equip}</p>
                    </div>
                  </div>
                )}

                {/* Athletes in this race */}
                <div>
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2.5">
                    Companys inscrits a la prova:
                  </h3>
                  {athletes.length === 0 ? (
                    <p className="text-xs text-text-muted italic">Encara no hi ha cap inscrit registrat.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {athletes.map((atl, idx) => {
                        const isPrivada = atl.es_privada ?? (atl.privacitat === 'privat')
                        if (isPrivada && !canManage && (atl.atleta_id || atl.usuari_id) !== user?.id) return null

                        const nomComplet = atl.nom || 'Atleta'
                        const atlKms = atl.kms ?? raceKms
                        const obj = atl.tipus_objectiu || atl.objectiu || 'A'
                        const hasCar = atl.comparteix_transport ?? atl.disposa_cotxe
                        const carCity = atl.ciutat_origen_transport || atl.ciutat_origen

                        return (
                          <div 
                            key={idx}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                              isPrivada 
                                ? 'bg-rose-50/40 border-rose-200' 
                                : 'bg-bg-surface border-border'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 font-bold text-xs flex items-center justify-center shrink-0">
                                {nomComplet.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-text-primary truncate flex items-center gap-1">
                                  {nomComplet}
                                  {isPrivada && (
                                    <span title="Inscripció Privada (només visible per a tu i l'entrenador)">
                                      <Lock className="w-3 h-3 text-rose-500" />
                                    </span>
                                  )}
                                </p>
                                <p className="text-[11px] text-text-muted">
                                  {atlKms ? `${atlKms} km` : 'Cursa'} • Obj. {obj}
                                </p>
                              </div>
                            </div>

                            {/* Ride sharing badge */}
                            {hasCar && (
                              <div 
                                className="flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0"
                                title={carCity ? `Surt de: ${carCity}` : 'Comparteix transport'}
                              >
                                <Car className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span className="font-semibold truncate max-w-[90px]">
                                  {carCity || 'Cotxe'}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Jo també hi vaig (Join Race) */}
      {selectedRaceForJoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card bg-bg-surface w-full max-w-lg p-6 rounded-2xl shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-base sm:text-lg font-black text-text-primary">
                  Inscriure'm a {selectedRaceForJoin.nom}
                </h3>
                <p className="text-xs text-text-muted">
                  Data: {selectedRaceForJoin.data || selectedRaceForJoin.data_inici}
                </p>
              </div>
              <button 
                onClick={() => setSelectedRaceForJoin(null)}
                className="p-1 text-text-muted hover:text-text-primary rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleJoinRace} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Objectiu personal
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['A', 'B', 'C'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTipusObjectiu(t)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        tipusObjectiu === t
                          ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                          : 'bg-bg-base text-text-secondary border-border hover:border-text-muted'
                      }`}
                    >
                      Objectiu {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Distància prevista (km)
                </label>
                <input
                  type="number"
                  value={kms}
                  onChange={(e) => setKms(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none"
                />
              </div>

              {/* Privacy Setting */}
              <div className="p-3.5 rounded-xl border border-border bg-bg-base space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {visibilitatEquip ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-rose-500" />}
                    <span className="text-xs font-bold text-text-primary">
                      {visibilitatEquip ? "Visible per a tot l'equip" : "Participació Privada (només entrenador)"}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={visibilitatEquip}
                    onChange={(e) => setVisibilitatEquip(e.target.checked)}
                    className="w-4 h-4 accent-brand-500 rounded"
                  />
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  {visibilitatEquip 
                    ? "Els teus companys podran veure que participes i podreu organitzar el viatge junts."
                    : "Només el teu entrenador sabrà que corres aquesta cursa. No apareixeràs al llistat públic dels companys."}
                </p>
              </div>

              {/* Ride sharing */}
              <div className="p-3.5 rounded-xl border border-border bg-bg-base space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-brand-500" />
                    <span className="text-xs font-bold text-text-primary">Comparteixo vehicle</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={comparteixTransport}
                    onChange={(e) => setComparteixTransport(e.target.checked)}
                    className="w-4 h-4 accent-brand-500 rounded"
                  />
                </div>
                {comparteixTransport && (
                  <input
                    type="text"
                    value={ciutatOrigen}
                    onChange={(e) => setCiutatOrigen(e.target.value)}
                    placeholder="Ex: Barcelona o Girona (2 places lliures)"
                    className="w-full mt-2 px-3 py-2 bg-bg-surface border border-border rounded-xl text-xs"
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setSelectedRaceForJoin(null)}
                  className="px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-bg-hover rounded-xl"
                >
                  Cancel·lar
                </button>
                <button
                  type="submit"
                  disabled={submittingJoin}
                  className="px-5 py-2 text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white rounded-xl shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {submittingJoin ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Confirmar participació
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Proposar Nova Cursa d'Equip */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card bg-bg-surface w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 rounded-2xl shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base sm:text-lg font-black text-text-primary flex items-center gap-2">
                <Trophy className="w-4 h-4 text-brand-500" />
                Proposar Nova Cursa de Club
              </h3>
              <button 
                onClick={() => setCreateModalOpen(false)}
                className="p-1 text-text-muted hover:text-text-primary rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRaceSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Nom de la cursa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Mitja Marató de Granollers"
                  value={newRaceForm.nom}
                  onChange={e => setNewRaceForm(prev => ({ ...prev, nom: e.target.value }))}
                  className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                    Data <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newRaceForm.data}
                    onChange={e => setNewRaceForm(prev => ({ ...prev, data: e.target.value }))}
                    className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                    Població / Comarca
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Granollers, Vallès Oriental"
                    value={newRaceForm.poblacio}
                    onChange={e => setNewRaceForm(prev => ({ ...prev, poblacio: e.target.value }))}
                    className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                    Quilòmetres (km)
                  </label>
                  <input
                    type="number"
                    value={newRaceForm.kms}
                    onChange={e => setNewRaceForm(prev => ({ ...prev, kms: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                    Desnivell (+m D+)
                  </label>
                  <input
                    type="number"
                    value={newRaceForm.desnivell}
                    onChange={e => setNewRaceForm(prev => ({ ...prev, desnivell: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Enllaç web oficial de la cursa
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newRaceForm.enllac_oficial}
                  onChange={e => setNewRaceForm(prev => ({ ...prev, enllac_oficial: e.target.value }))}
                  className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Indicacions o logística d'equip
                </label>
                <textarea
                  rows={3}
                  placeholder="Punt de trobada, informació sobre carpa del club, suport als corredors..."
                  value={newRaceForm.notes_equip}
                  onChange={e => setNewRaceForm(prev => ({ ...prev, notes_equip: e.target.value }))}
                  className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-bg-hover rounded-xl"
                >
                  Cancel·lar
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-5 py-2 text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white rounded-xl shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {submittingCreate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Publicar Cursa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
