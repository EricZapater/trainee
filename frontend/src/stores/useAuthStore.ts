import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as apiLogin, register as apiRegister, getMe } from '@/api/auth'
import type { Usuari } from '@/types'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('trainee_token'))
  let initialUsuari = null
  const usuariStr = localStorage.getItem('trainee_usuari')
  if (usuariStr) {
    try {
      initialUsuari = JSON.parse(usuariStr)
    } catch (e) {
      localStorage.removeItem('trainee_usuari')
    }
  }
  const usuari = ref<Usuari | null>(initialUsuari)

  const isAuthenticated = computed(() => !!token.value)
  const isAtleta = computed(() => usuari.value?.rol === 'atleta')
  const isEntrenador = computed(() => usuari.value?.rol === 'entrenador')

  async function login(email: string, pass: string) {
    const data = await apiLogin(email, pass)
    token.value = data.token
    usuari.value = data.usuari
    localStorage.setItem('trainee_token', data.token)
    localStorage.setItem('trainee_usuari', JSON.stringify(data.usuari))
  }

  async function register(payload: any) {
    const data = await apiRegister(payload)
    token.value = data.token
    usuari.value = data.usuari
    localStorage.setItem('trainee_token', data.token)
    localStorage.setItem('trainee_usuari', JSON.stringify(data.usuari))
  }

  function logout() {
    token.value = null
    usuari.value = null
    localStorage.removeItem('trainee_token')
    localStorage.removeItem('trainee_usuari')
    router.push('/login')
  }

  async function loadFromStorage() {
    // Si tenim token però s'ha perdut l'usuari del localStorage (corrupte)
    if (token.value && !usuari.value) {
      logout()
    }
  }

  return {
    token,
    usuari,
    isAuthenticated,
    isAtleta,
    isEntrenador,
    login,
    register,
    logout,
    loadFromStorage
  }
})
