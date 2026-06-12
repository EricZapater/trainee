import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as apiLogin, register as apiRegister, magicLogin as apiMagicLogin, updateIdioma as apiUpdateIdioma } from '@/api/auth'
import type { Usuari } from '@/types'
import router from '@/router'
import i18n, { idiomToLocale } from '@/i18n'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('trainee_token'))
  let initialUsuari = null
  const usuariStr = localStorage.getItem('trainee_usuari')
  if (usuariStr) {
    try {
      initialUsuari = JSON.parse(usuariStr)
      if (initialUsuari && initialUsuari.idioma) {
        // Safe check for locale as `any` since i18n instance types might vary
        ;(i18n.global.locale as any).value = idiomToLocale[initialUsuari.idioma] || 'ca'
      }
    } catch (e) {
      localStorage.removeItem('trainee_usuari')
    }
  }
  const usuari = ref<Usuari | null>(initialUsuari)

  const isAuthenticated = computed(() => !!token.value)
  const isAtleta = computed(() => usuari.value?.rol === 'atleta' || usuari.value?.rol === 'admin')
  const isEntrenador = computed(() => usuari.value?.rol === 'entrenador' || usuari.value?.rol === 'admin')

  async function login(email: string, pass: string) {
    const data = await apiLogin(email, pass)
    token.value = data.token
    usuari.value = data.usuari
    if (data.usuari.idioma) {
      ;(i18n.global.locale as any).value = idiomToLocale[data.usuari.idioma] || 'ca'
    }
    localStorage.setItem('trainee_token', data.token)
    localStorage.setItem('trainee_usuari', JSON.stringify(data.usuari))
  }

  async function magicLogin(magicToken: string): Promise<boolean> {
    try {
      const data = await apiMagicLogin(magicToken)
      token.value = data.token
      usuari.value = data.usuari
      if (data.usuari.idioma) {
        ;(i18n.global.locale as any).value = idiomToLocale[data.usuari.idioma] || 'ca'
      }
      localStorage.setItem('trainee_token', data.token)
      localStorage.setItem('trainee_usuari', JSON.stringify(data.usuari))
      return true
    } catch (e) {
      return false
    }
  }

  async function register(payload: any) {
    const data = await apiRegister(payload)
    token.value = data.token
    usuari.value = data.usuari
    if (data.usuari.idioma) {
      ;(i18n.global.locale as any).value = idiomToLocale[data.usuari.idioma] || 'ca'
    }
    localStorage.setItem('trainee_token', data.token)
    localStorage.setItem('trainee_usuari', JSON.stringify(data.usuari))
  }

  function logout() {
    token.value = null
    usuari.value = null
    ;(i18n.global.locale as any).value = 'ca' // default
    localStorage.removeItem('trainee_token')
    localStorage.removeItem('trainee_usuari')
    router.push('/login')
  }

  async function updateIdioma(idioma: string) {
    await apiUpdateIdioma(idioma)
    if (usuari.value) {
      usuari.value.idioma = idioma
      localStorage.setItem('trainee_usuari', JSON.stringify(usuari.value))
      ;(i18n.global.locale as any).value = idiomToLocale[idioma] || 'ca'
    }
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
    magicLogin,
    register,
    logout,
    updateIdioma,
    loadFromStorage
  }
})
