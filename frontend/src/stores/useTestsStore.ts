import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getPendingTests, getRecordatorisTests } from '@/api/tests'
import type { Test } from '@/types'

export const useTestsStore = defineStore('tests', () => {
  const pendingTests = ref<Test[]>([])
  const recordatoris = ref<Test[]>([])
  const loading = ref(false)

  async function loadData() {
    loading.value = true
    try {
      const [pendents, records] = await Promise.all([
        getPendingTests(),
        getRecordatorisTests()
      ])
      pendingTests.value = pendents
      recordatoris.value = records
    } catch (e) {
      console.error('Error carregant dades de tests:', e)
    } finally {
      loading.value = false
    }
  }

  // Comprova si un recordatori caduca en menys de 14 dies (o ja ha caducat)
  const isUrgent = (dateStr: string | undefined): boolean => {
    if (!dateStr) return false
    const d = new Date(dateStr)
    const avui = new Date()
    avui.setHours(0, 0, 0, 0)
    
    // Diferència en dies
    const diffTime = d.getTime() - avui.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays <= 14
  }

  const urgentRecordatorisCount = computed(() => {
    return recordatoris.value.filter(t => isUrgent(t.data_recordatori)).length
  })

  const hasNotifications = computed(() => {
    return pendingTests.value.length > 0 || urgentRecordatorisCount.value > 0
  })

  const notificationCount = computed(() => {
    return pendingTests.value.length + urgentRecordatorisCount.value
  })

  function decrementPending() {
    // Si s'ha traspassat un test, el traiem de pendents
    // Només es fa fake per l'UI de moment fins que no es cridi loadData de nou
    if (pendingTests.value.length > 0) {
      pendingTests.value.pop()
    }
  }

  return {
    pendingTests,
    recordatoris,
    loading,
    loadData,
    hasNotifications,
    notificationCount,
    urgentRecordatorisCount,
    isUrgent,
    decrementPending
  }
})
