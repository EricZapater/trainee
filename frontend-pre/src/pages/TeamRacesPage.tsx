import React, { useState, useEffect } from 'react'
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
  Mountain
} from 'lucide-react'
import type { EsdevenimentEquip } from '../types'

export const TeamRacesPage: React.FC = () => {
  const { isEntrenador } = useAuth()
  const [races, setRaces] = useState<EsdevenimentEquip[]>([])
  const [selectedRaceForJoin, setSelectedRaceForJoin] = useState<EsdevenimentEquip | null>(null)

  // Join modal form state
  const [tipusObjectiu, setTipusObjectiu] = useState<'A' | 'B' | 'C'>('A')
  const [kms, setKms] = useState<number>(0)
  const [visibilitatEquip, setVisibilitatEquip] = useState<boolean>(true)
  const [comparteixTransport, setComparteixTransport] = useState<boolean>(false)
  const [ciutatOrigen, setCiutatOrigen] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)

  useEffect(() => {
    loadTeamRaces()
  }, [])

  const loadTeamRaces = async () => {
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
            { atleta_id: 'a5', nom: 'Corredor Anònim', cognoms: '', tipus_objectiu: 'A', kms: 100, es_privada: true } // visible only to coach or as private
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
        }
      ])
    }
  }

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

    setSubmitting(true)
    try {
      await api.post(`/competicions/equip/${selectedRaceForJoin.id}/join`, {
        tipus_objectiu: tipusObjectiu,
        kms,
        visibilitat_equip: visibilitatEquip,
        comparteix_transport: comparteixTransport,
        ciutat_origen_transport: ciutatOrigen
      })
      setSelectedRaceForJoin(null)
      loadTeamRaces()
    } catch (e) {
      // Mock join for UI test
      setSelectedRaceForJoin(null)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold mb-2">
            <Trophy className="w-3.5 h-3.5" /> Comunitat de Curses del Club
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Team Race Hub</h1>
          <p className="text-text-secondary text-sm mt-1">
            Descobreix quines competicions comparteixes amb els teus companys d'equip, coordina desplaçaments i descarrega el track oficial.
          </p>
        </div>
      </div>

      {/* Race Cards List */}
      <div className="space-y-6">
        {races.map((race) => (
          <div key={race.id} className="glass-card p-6 space-y-5 hover:shadow-lg transition-all">
            {/* Top Bar: Title, Date, Badges */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-border">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-text-primary">{race.nom}</h2>
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    <Users className="w-3.5 h-3.5" /> {race.total_inscrits} atletes del club
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted pt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-brand-500" /> {race.data}
                  </span>
                  {race.poblacio && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-text-secondary" /> {race.poblacio}
                    </span>
                  )}
                  {race.kms && (
                    <span className="flex items-center gap-1">
                      <Mountain className="w-3.5 h-3.5 text-emerald-500" /> {race.kms} km | +{race.desnivell}m D+
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {race.gpx_url && (
                  <button
                    onClick={() => alert(`Descarregant track GPX de ${race.nom}`)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-bg-hover hover:bg-border text-text-primary transition-colors flex items-center gap-1.5 border border-border"
                  >
                    <Download className="w-3.5 h-3.5 text-brand-500" /> Descarregar GPX
                  </button>
                )}
                {!isEntrenador && (
                  <button
                    onClick={() => openJoinModal(race)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white transition-all shadow-sm flex items-center gap-1.5 uppercase tracking-wider"
                  >
                    <Plus className="w-3.5 h-3.5" /> Jo també hi vaig!
                  </button>
                )}
              </div>
            </div>

            {/* Coach's collective notes */}
            {race.notes_equip && (
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <Trophy className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-950">Indicacions d'Equip de l'Entrenador:</p>
                  <p className="mt-0.5 leading-relaxed">{race.notes_equip}</p>
                </div>
              </div>
            )}

            {/* Athletes in this race */}
            <div>
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
                Companys inscrits a la prova:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {race.atletes?.map((atl, idx) => {
                  // If private and not coach: don't reveal identity
                  if (atl.es_privada && !isEntrenador) return null

                  return (
                    <div 
                      key={idx}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                        atl.es_privada 
                          ? 'bg-rose-50/30 border-rose-200' 
                          : 'bg-white border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 font-bold text-xs flex items-center justify-center flex-shrink-0">
                          {atl.nom.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-text-primary truncate flex items-center gap-1">
                            {atl.nom}
                            {atl.es_privada && isEntrenador && (
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
                          className="flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200 flex-shrink-0"
                          title={atl.ciutat_origen_transport ? `Surt de: ${atl.ciutat_origen_transport}` : 'Comparteix transport'}
                        >
                          <Car className="w-3 h-3 text-emerald-600" />
                          <span className="font-semibold truncate max-w-[80px]">
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

      {/* Modal Jo també hi vaig */}
      {selectedRaceForJoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg p-6 relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-text-primary">Inscriure'm a {selectedRaceForJoin.nom}</h3>
                <p className="text-xs text-text-muted">Data: {selectedRaceForJoin.data}</p>
              </div>
              <button 
                onClick={() => setSelectedRaceForJoin(null)}
                className="p-1 text-text-muted hover:text-text-primary rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleJoinRace} className="space-y-4">
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
                          : 'bg-white text-text-secondary border-border hover:border-text-muted'
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
                  className="w-full p-2.5 bg-white border border-border rounded-xl text-xs text-text-primary"
                />
              </div>

              {/* Privacy Setting */}
              <div className="p-3.5 rounded-xl border border-border bg-bg-hover/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {visibilitatEquip ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-rose-500" />}
                    <span className="text-xs font-bold text-text-primary">
                      {visibilitatEquip ? "Visible per a l'equip" : "Participació Privada"}
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
                    ? "Els teus companys podran veure el teu nom i animar-te. Les teves notes personals seguiran sent secretes."
                    : "Només el teu entrenador sabrà que corres aquesta cursa. No apareixeràs al calendari dels companys."}
                </p>
              </div>

              {/* Ride sharing */}
              <div className="p-3.5 rounded-xl border border-border bg-bg-hover/50 space-y-2">
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
                    placeholder="Ex: Barcelona (2 places lliures)"
                    className="w-full mt-2 p-2 bg-white border border-border rounded-lg text-xs"
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRaceForJoin(null)}
                  className="px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-bg-hover rounded-xl"
                >
                  Cancel·lar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white rounded-xl shadow-sm uppercase tracking-wider"
                >
                  {submitting ? 'Confirmant...' : 'Confirmar participació'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
