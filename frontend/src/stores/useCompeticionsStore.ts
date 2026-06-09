import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getEntrenadorCompeticions } from '@/api/competicions'
import { useAuthStore } from './useAuthStore'

export const useCompeticionsStore = defineStore('competicions', () => {
  const pendingCount = ref(0)
  const loading = ref(false)

  const loadPendingCount = async () => {
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated || !authStore.isEntrenador) return

    loading.value = true
    try {
      const comps = await getEntrenadorCompeticions()
      pendingCount.value = comps.length
    } catch (e) {
      console.error('Error fetching pending competicions', e)
    } finally {
      loading.value = false
    }
  }

  const decrementCount = () => {
    if (pendingCount.value > 0) pendingCount.value--
  }

  return {
    pendingCount,
    loading,
    loadPendingCount,
    decrementCount
  }
})
