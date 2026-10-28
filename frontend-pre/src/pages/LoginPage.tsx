import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import { Sparkles, Lock, Mail, Loader2 } from 'lucide-react'

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Si us plau, omple el correu i la contrasenya.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await api.post('/auth/login', { email, password })
      if (res.data.token && res.data.usuari) {
        login(res.data.token, res.data.usuari)
        if (res.data.usuari.rol === 'entrenador' || res.data.usuari.rol === 'admin') {
          navigate('/dashboard')
        } else {
          navigate('/calendar')
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Credencials incorrectes o error al servidor.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-base">
      <div className="glass-card w-full max-w-md p-8 relative overflow-hidden">
        {/* Decorative banner */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-500 to-rose-600" />

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/logo.png" alt="Logo" className="h-14 w-auto drop-shadow-sm" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">TrainEE</h1>
          <div className="inline-flex items-center gap-1.5 bg-brand-50 text-brand-600 border border-brand-200 text-xs font-semibold px-2.5 py-1 rounded-full mt-2">
            <Sparkles className="w-3.5 h-3.5" /> Entorn de Pre-producció (React)
          </div>
          <p className="text-text-secondary text-sm mt-3">
            Inicia sessió amb el teu compte per testejar les noves funcionalitats
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
              Correu electrònic
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correu@exemple.cat"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
              Contrasenya
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Verificant...
              </>
            ) : (
              'Entrar al sistema'
            )}
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-border text-center text-xs text-text-muted">
          Connectat a <span className="font-mono text-text-secondary">pre.api.trainee.ericzapater.cat</span>
        </div>
      </div>
    </div>
  )
}
