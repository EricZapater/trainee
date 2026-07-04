import axios from 'axios'
import router from '@/router'
import { useAuthStore } from '@/stores/useAuthStore'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('trainee_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const auth = useAuthStore()
      auth.logout()
    } else if (error.response?.status === 428 && error.response?.data?.error === 'CONSENT_REQUIRED') {
      if (router.currentRoute.value.path !== '/legal-consent') {
        router.push({
          path: '/legal-consent',
          query: { redirect: router.currentRoute.value.fullPath }
        })
      }
    }
    return Promise.reject(error)
  }
)

export default api
