import React, { createContext, useContext, useState, useEffect } from 'react'
import type { Usuari, AuthState } from '../types'
import api from '../api/client'

interface AuthContextType extends AuthState {
  login: (token: string, user: Usuari) => void
  logout: () => void
  refreshUser: () => Promise<void>
  isEntrenador: boolean
  isAtleta: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Usuari | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('trainee_token')
    const savedUser = localStorage.getItem('trainee_usuari')

    if (savedToken && savedUser) {
      try {
        setToken(savedToken)
        setUser(JSON.parse(savedUser))
      } catch (e) {
        console.error('Error parsing stored user:', e)
        localStorage.removeItem('trainee_token')
        localStorage.removeItem('trainee_usuari')
      }
    }
    setIsLoading(false)
  }, [])

  const login = (newToken: string, newUser: Usuari) => {
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem('trainee_token', newToken)
    localStorage.setItem('trainee_usuari', JSON.stringify(newUser))
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('trainee_token')
    localStorage.removeItem('trainee_usuari')
  }

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me')
      if (res.data) {
        setUser(res.data)
        localStorage.setItem('trainee_usuari', JSON.stringify(res.data))
      }
    } catch (e) {
      console.error('Error refreshing user:', e)
    }
  }

  const isEntrenador = user?.rol === 'entrenador' || user?.rol === 'admin'
  const isAtleta = user?.rol === 'atleta'
  const isAdmin = user?.rol === 'admin'

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        refreshUser,
        isEntrenador,
        isAtleta,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
