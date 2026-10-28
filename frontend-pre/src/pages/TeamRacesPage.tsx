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
  ExternalLink
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
    } catch (e) {
      // Demo / seed data for PRE visualization
      setRaces([
        {
          id: 'race-1',
          nom: 'Ultra Pirineu',
          data: '2026-10-03',
          poblacio: 'Bagà, Berguedà',
          kms: 100,
          desnivell: 6600,
          gpx_url: '#',
          notes_equip: 'Punt de trobada del club a la plaça Major de Bagà a les 06:15h. Avituallament i suport d\'equip autoritzat a Gósol (km 42).',
          total_inscrits: 5,
          total_publics: 4,
          atletes: [
            { atleta_id: 'a1', nom: 'Marc Puig', cognoms: '', tipus_objectiu: 'A', kms: 100, comparteix_transport: true, ciutat_origen_transport: 'Girona (2 places)' },
            { atleta_id: 'a2', nom: 'Laura Morales', cognoms: '', tipus_objectiu: 'B', kms: 42, comparteix_transport: false },
            { atleta_id: 'a3', nom: 'Jordi Segura', cognoms: '', tipus_objectiu: 'A', kms: 100, comparteix_transport: true, ciutat_origen_transport: 'Barcelona (1 plaça)' },
            { atleta_id: 'a4', nom: 'Clara Valls', cognoms: '', tipus_objectiu: 'C', kms: 42, comparteix_transport: false },
            { atleta_id: 'a5', nom: 'Corredor Anònim', cognoms: '', tipus_objectiu: 'A', kms: 100, es_privada: true }
          ]
        },
        {
          id: 'race-2',
          nom: 'Trail Cap de Creus',
          data: '2026-11-15',
          poblacio: 'Roses, Alt Empordà',
          kms: 44,
          desnivell: 2100,
          gpx_url: '#',
          notes_equip: 'Tots els corredors que necessitin assistència avisar abans de dijous.',
          total_inscrits: 3,
          total_publics: 3,
          atletes: [
            { atleta_id: 'a1', nom: 'Marc Puig', cognoms: '', tipus_objectiu: 'B', kms: 44, comparteix_transport: true, ciutat_origen_transport: 'Girona' },
            { atleta_id: 'a6', nom: 'David Rovira', cognoms: '', tipus_objectiu: 'A', kms: 44, comparteix_transport: false },
            { atleta_id: 'a7', nom: 'Mireia Font', cognoms: '', tipus_objectiu: 'A', kms: 22, comparteix_transport: true, ciutat_origen_transport: 'Figueres' }
          ]
        },
        {
          id: 'race-3',
          nom: 'Marató de Barcelona',
          data: '2027-03-14',
          poblacio: 'Barcelona, Barcelonès',
          kms: 42,
          desnivell: 120,
          notes_equip: 'Carpa d\'equip a l\'Avinguda Maria Cristina des de les 07:30h per deixar motxilles.',
          total_inscrits: 6,
          total_publics: 6,
          atletes: [
            { atleta_id: 'a8', nom: 'Sergi Vidal', cognoms: '', tipus_objectiu: 'A', kms: 42, comparteix_transport: true, ciutat_origen_transport: 'Vic (3 places)' },
            { atleta_id: 'a9', nom: 'Anna Soler', cognoms: '', tipus_objectiu: 'A', kms: 42, comparteix_transport: false },
            { atleta_id: 'a10', nom: 'Pol Vila', cognoms: '', tipus_objectiu: 'B', kms: 42, comparteix_transport: true, ciutat_origen_transport: 'Mataró (2 places)' }
          ]
        }
      ])
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
      return (
        r.nom.toLowerCase().includes(q) ||
        (r.poblacio && r.poblacio.toLowerCase().includes(q)) ||
        (r.notes_equip && r.notes_equip.toLowerCase().includes(q))
      )
    })
  }, [races, searchQuery])

  const openJoinModal = (race: EsdevenimentEquip) => {
    setSelectedRaceForJoin(race)
    setKms(race.kms || 42)
    setTipusObjectiu('A')
    setVisibilitatEquip(true)
    setComparteixTransport(false)
    setCiutatOrigen('')
  }

  const handleJoinRace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRaceForJoin) return

    setSubmittingJoin(true)
    try {
      await api.post(`/competicions/equip/${selectedRaceForJoin.id}/join`, {
        tipus_objectiu: tipusObjectiu,
        kms,
        visibilitat_equip: visibilitatEquip,
        comparteix_transport: comparteixTransport,
        ciutat_origen_transport: ciutatOrigen
      })
      showToast("T'has afegit correctament a la cursa!")
      setSelectedRaceForJoin(null)
      loadTeamRaces()
    } catch (e) {
      // Local optimistic update for PRE
      const myName = user ? `${user.nom} ${user.cognoms || ''}`.trim() : 'El meu usuari'
      setRaces(prev => prev.map(r => {
        if (r.id !== selectedRaceForJoin.id) return r
        const newAthlete = {
          atleta_id: user?.id || 'me',
          nom: myName,
          cognoms: '',
          tipus_objectiu: tipusObjectiu,
          kms,
          comparteix_transport: comparteixTransport,
          ciutat_origen_transport: ciutatOrigen,
          es_privada: !visibilitatEquip
        }
        return {
          ...r,
          total_inscrits: (r.total_inscrits || 0) + 1,
          total_publics: (r.total_publics || 0) + (visibilitatEquip ? 1 : 0),
          atletes: [...(r.atletes || []), newAthlete]
        }
      }))
      showToast("Inscripció afegida correctament a l'equip!")
      setSelectedRaceForJoin(null)
    } finally {
      setSubmittingJoin(false)
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
      await api.post('/competicions/equip', newRaceForm)
      showToast('Cursa d\'equip proposada correctament!')
      setCreateModalOpen(false)
      loadTeamRaces()
    } catch (e) {
      // Local addition for preview
      const newRace: EsdevenimentEquip = {
        id: `race-${Date.now()}`,
        nom: newRaceForm.nom.trim(),
        data: newRaceForm.data,
        poblacio: newRaceForm.poblacio.trim() || undefined,
        kms: newRaceForm.kms,
        desnivell: newRaceForm.desnivell,
        enllac_oficial: newRaceForm.enllac_oficial.trim() || undefined,
        notes_equip: newRaceForm.notes_equip.trim() || undefined,
        total_inscrits: 1,
        total_publics: 1,
        atletes: [
          {
            atleta_id: user?.id || 'me',
            nom: user ? `${user.nom} ${user.cognoms || ''}`.trim() : 'Organitzador',
            cognoms: '',
            tipus_objectiu: 'A',
            kms: newRaceForm.kms,
            comparteix_transport: false
          }
        ]
      }
      setRaces(prev => [newRace, ...prev])
      showToast('Cursa d\'equip afegida al tauler!')
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
          {filteredRaces.map((race) => (
            <div key={race.id} className="glass-card p-4 sm:p-6 space-y-5 hover:shadow-lg transition-all">
              {/* Top Bar: Title, Date, Badges */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-border">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-lg sm:text-xl font-bold text-text-primary">{race.nom}</h2>
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      <Users className="w-3.5 h-3.5" /> {race.total_inscrits} atletes del club
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-text-muted pt-0.5">
                    <span className="flex items-center gap-1 font-semibold text-text-secondary">
                      <Calendar className="w-3.5 h-3.5 text-brand-500" />
                      {new Date(race.data + 'T00:00:00').toLocaleDateString('ca-ES', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                    {race.poblacio && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-text-secondary" /> {race.poblacio}
                      </span>
                    )}
                    {race.kms && (
                      <span className="flex items-center gap-1">
                        <Mountain className="w-3.5 h-3.5 text-emerald-500" /> {race.kms} km {race.desnivell ? `| +${race.desnivell}m D+` : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 self-start md:self-auto">
                  {race.enllac_oficial && (
                    <a
                      href={race.enllac_oficial}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-bg-surface hover:bg-bg-hover text-text-secondary border border-border flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Web Oficial
                    </a>
                  )}
                  {race.gpx_url && race.gpx_url !== '#' && (
                    <a
                      href={race.gpx_url}
                      download
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-bg-hover hover:bg-border text-text-primary transition-colors flex items-center gap-1.5 border border-border"
                    >
                      <Download className="w-3.5 h-3.5 text-brand-500" /> Track GPX
                    </a>
                  )}
                  <button
                    onClick={() => openJoinModal(race)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Jo també hi vaig!
                  </button>
                </div>
              </div>

              {/* Coach's collective notes */}
              {race.notes_equip && (
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                  <Trophy className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-950">Indicacions d'Equip de l'Entrenador:</p>
                    <p className="mt-0.5 leading-relaxed">{race.notes_equip}</p>
                  </div>
                </div>
              )}

              {/* Athletes in this race */}
              <div>
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2.5">
                  Companys inscrits a la prova:
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {race.atletes?.map((atl, idx) => {
                    if (atl.es_privada && !canManage) return null

                    return (
                      <div 
                        key={idx}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                          atl.es_privada 
                            ? 'bg-rose-50/40 border-rose-200' 
                            : 'bg-bg-surface border-border'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 font-bold text-xs flex items-center justify-center shrink-0">
                            {atl.nom.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-text-primary truncate flex items-center gap-1">
                              {atl.nom}
                              {atl.es_privada && canManage && (
                                <span title="Inscripció Privada (només visible per a l'entrenador)">
                                  <Lock className="w-3 h-3 text-rose-500" />
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-text-muted">
                              {atl.kms ? `${atl.kms} km` : 'Cursa'} • Obj. {atl.tipus_objectiu || 'A'}
                            </p>
                          </div>
                        </div>

                        {/* Ride sharing badge */}
                        {atl.comparteix_transport && (
                          <div 
                            className="flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0"
                            title={atl.ciutat_origen_transport ? `Surt de: ${atl.ciutat_origen_transport}` : 'Comparteix transport'}
                          >
                            <Car className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="font-semibold truncate max-w-[90px]">
                              {atl.ciutat_origen_transport || 'Cotxe'}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
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
                <p className="text-xs text-text-muted">Data: {selectedRaceForJoin.data}</p>
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
                    : "Només el teu entrenador sabrà que corres aquesta cursa. No apareixeràs al llistat dels companys."}
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
