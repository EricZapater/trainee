import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  ShieldCheck, 
  Search, 
  UserCheck, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  Mail, 
  Filter,
  UserX,
  Users
} from 'lucide-react'
import { getUsuaris, impersonateUser, resetUserPassword, type AdminUser } from '../api/admin'

export const AdminDashboardPage: React.FC = () => {
  const { user, impersonate } = useAuth()
  const navigate = useNavigate()

  const [usuaris, setUsuaris] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'tots' | 'atleta' | 'entrenador' | 'admin'>('tots')
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getUsuaris()
      setUsuaris(data)
    } catch (err: any) {
      console.error('Error carregant usuaris admin:', err)
      showNotification('error', err.response?.data?.error || 'No s\'han pogut carregar els usuaris.')
    } finally {
      setLoading(false)
    }
  }

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text })
    setTimeout(() => setFeedback(null), 4000)
  }

  const handleImpersonate = async (targetUser: AdminUser) => {
    setImpersonatingId(targetUser.id)
    try {
      const res = await impersonateUser(targetUser.id)
      
      impersonate(res.token, {
        id: res.user.id,
        nom: res.user.nom,
        cognoms: res.user.cognoms || '',
        email: res.user.email,
        rol: res.user.rol,
        actiu: res.user.actiu,
        idioma: res.user.idioma
      })

      showNotification('success', `Has entrat com a ${res.user.nom} (${res.user.rol})`)
      
      // Navigate to target role's main screen
      if (res.user.rol === 'atleta') {
        navigate('/calendar')
      } else {
        navigate('/dashboard')
      }
    } catch (err: any) {
      console.error('Error impersonant usuari:', err)
      showNotification('error', err.response?.data?.error || 'Error en impersonar usuari.')
    } finally {
      setImpersonatingId(null)
    }
  }

  const handleResetPassword = async (targetUser: AdminUser) => {
    if (!window.confirm(`Vols enviar un correu de restabliment de contrasenya a ${targetUser.email}?`)) {
      return
    }

    try {
      const res = await resetUserPassword(targetUser.id)
      showNotification('success', res.message || 'Correu de restabliment enviat!')
    } catch (err: any) {
      console.error('Error reset password:', err)
      showNotification('error', err.response?.data?.error || 'Error enviant correu de recuperació.')
    }
  }

  const filteredUsers = usuaris.filter(u => {
    const matchesSearch = 
      u.nom.toLowerCase().includes(search.toLowerCase()) ||
      (u.cognoms && u.cognoms.toLowerCase().includes(search.toLowerCase())) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    
    const matchesRole = roleFilter === 'tots' ? true : u.rol === roleFilter
    return matchesSearch && matchesRole
  })

  const getRoleBadge = (rol: string) => {
    switch (rol) {
      case 'admin':
        return <span className="bg-purple-100 text-purple-800 border border-purple-300 text-[11px] font-bold px-2 py-0.5 rounded-full">Admin</span>
      case 'entrenador':
        return <span className="bg-blue-100 text-blue-800 border border-blue-300 text-[11px] font-bold px-2 py-0.5 rounded-full">Entrenador</span>
      case 'atleta':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold px-2 py-0.5 rounded-full">Atleta</span>
      default:
        return <span className="bg-slate-100 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded-full">{rol}</span>
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
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
              Administració del Sistema
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary flex items-center gap-2.5 mt-1">
            <ShieldCheck className="w-6 h-6 text-purple-600" />
            Panell d'Usuaris i Impersonació
          </h2>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Gestiona els usuaris de la plataforma i entra en la sessió de qualsevol atleta per verificar el funcionament.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl text-xs font-bold text-purple-700">
          <Users className="w-4 h-4" />
          <span>{usuaris.length} usuaris totals</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Cerca per nom, cognom o correu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 rounded-xl bg-white/80 border border-border-light focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-text-muted mr-1 shrink-0 hidden sm:inline" />
          {(['tots', 'atleta', 'entrenador', 'admin'] as const).map(role => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors shrink-0 ${
                roleFilter === role
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white/60 text-text-secondary hover:text-text-primary'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-text-muted text-sm font-medium">Carregant directori d'usuaris...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="glass-card p-12 text-center text-text-muted">
          <UserX className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-sm">No s'ha trobat cap usuari amb aquest filtre.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block glass-card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-light text-text-muted font-bold uppercase text-[11px] bg-bg-surface/50">
                  <th className="py-3 px-4">Usuari</th>
                  <th className="py-3 px-4">Correu Electrònic</th>
                  <th className="py-3 px-4">Rol</th>
                  <th className="py-3 px-4">Estat</th>
                  <th className="py-3 px-4 text-right">Accions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-bg-hover/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-text-primary flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-700 font-bold text-xs flex items-center justify-center border border-purple-200 shrink-0">
                        {u.nom.charAt(0)}
                      </div>
                      <div>
                        <div>{u.nom} {u.cognoms}</div>
                        <div className="text-[11px] text-text-muted font-normal">ID: {u.id.substring(0, 8)}...</div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-text-secondary text-xs">
                      {u.email}
                    </td>
                    <td className="py-3.5 px-4">
                      {getRoleBadge(u.rol)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        u.actiu ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {u.actiu ? 'Actiu' : 'Inactiu'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {u.id !== user?.id && (
                          <button
                            onClick={() => handleImpersonate(u)}
                            disabled={impersonatingId === u.id}
                            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm bg-purple-600 hover:bg-purple-700"
                            title="Entrar com a aquest usuari"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            {impersonatingId === u.id ? 'Entrant...' : 'Impersonar'}
                          </button>
                        )}
                        <button
                          onClick={() => handleResetPassword(u)}
                          className="p-1.5 rounded-lg bg-bg-surface hover:bg-white text-text-muted hover:text-amber-600 border border-border-light transition-colors"
                          title="Restablir contrasenya"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (< 768px) */}
          <div className="block md:hidden space-y-3">
            {filteredUsers.map(u => (
              <div 
                key={u.id}
                className="glass-card p-4 space-y-3 border border-border-light"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-700 font-bold text-sm flex items-center justify-center border border-purple-200 shrink-0">
                      {u.nom.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-text-primary">{u.nom} {u.cognoms}</h4>
                      <p className="text-xs text-text-muted flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {u.email}
                      </p>
                    </div>
                  </div>
                  {getRoleBadge(u.rol)}
                </div>

                <div className="pt-2 border-t border-border-light flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    u.actiu ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {u.actiu ? 'Compte Actiu' : 'Inactiu'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleResetPassword(u)}
                      className="p-2 rounded-xl bg-white border border-border-light text-text-muted hover:text-amber-600 shadow-sm"
                      title="Restablir contrasenya"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                    {u.id !== user?.id && (
                      <button
                        onClick={() => handleImpersonate(u)}
                        disabled={impersonatingId === u.id}
                        className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm bg-purple-600 hover:bg-purple-700"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        {impersonatingId === u.id ? 'Entrant...' : 'Impersonar'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
