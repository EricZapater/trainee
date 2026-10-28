import React, { createContext, useContext, useState, useEffect } from 'react'
import type { Usuari, AuthState } from '../types'
import api from '../api/client'

interface AuthContextType extends AuthState {
  login: (token: string, user: Usuari) => void
  logout: () => void
  refreshUser: () => Promise<void>
  impersonate: (userToken: string, targetUser: Usuari) => void
  restoreAdminSession: () => void
  isEntrenador: boolean
  isAtleta: boolean
  isAdmin: boolean
  isAdminImpersonating: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Usuari | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdminImpersonating, setIsAdminImpersonating] = useState(false)

  useEffect(() => {
    const savedToken = localStorage.getItem('trainee_token')
    const savedUser = localStorage.getItem('trainee_usuari')
    const adminToken = localStorage.getItem('admin_token')

    if (savedToken && savedUser) {
      try {
        setToken(savedToken)
        setUser(JSON.parse(savedUser))
        setIsAdminImpersonating(Boolean(adminToken))
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
    setIsAdminImpersonating(false)
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    setIsAdminImpersonating(false)
    localStorage.removeItem('trainee_token')
    localStorage.removeItem('trainee_usuari')
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
  }

  const impersonate = (userToken: string, targetUser: Usuari) => {
    // Save current admin credentials if not already impersonating
    if (!localStorage.getItem('admin_token')) {
      const currentToken = localStorage.getItem('trainee_token')
      const currentUser = localStorage.getItem('trainee_usuari')
      if (currentToken) localStorage.setItem('admin_token', currentToken)
      if (currentUser) localStorage.setItem('admin_user', currentUser)
    }

    setToken(userToken)
    setUser(targetUser)
    localStorage.setItem('trainee_token', userToken)
    localStorage.setItem('trainee_usuari', JSON.stringify(targetUser))
    setIsAdminImpersonating(true)
  }

  const restoreAdminSession = () => {
    const adminToken = localStorage.getItem('admin_token')
    const adminUser = localStorage.getItem('admin_user')

    if (adminToken && adminUser) {
      try {
        const parsedAdminUser = JSON.parse(adminUser)
        setToken(adminToken)
        setUser(parsedAdminUser)
        localStorage.setItem('trainee_token', adminToken)
        localStorage.setItem('trainee_usuari', adminUser)
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_user')
        setIsAdminImpersonating(false)
      } catch (e) {
        console.error('Error restoring admin user:', e)
      }
    }
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
        impersonate,
        restoreAdminSession,
        isEntrenador,
        isAtleta,
        isAdmin,
        isAdminImpersonating,
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
