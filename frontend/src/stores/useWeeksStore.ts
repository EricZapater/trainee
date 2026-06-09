import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getOpenWeeks } from '@/api/weeks'
import type { ManagedWeek } from '@/types'

export const useWeeksStore = defineStore('weeks', () => {
  const weeks = ref<ManagedWeek[]>([])

  async function load() {
    weeks.value = await getOpenWeeks()
  }

  return {
    weeks,
    load
  }
})
