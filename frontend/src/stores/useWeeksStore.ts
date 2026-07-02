import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getOpenWeeks } from '@/api/weeks'
import type { ManagedWeek } from '@/types'

export const useWeeksStore = defineStore('weeks', () => {
  const weeks = ref<ManagedWeek[]>([])

  async function load(force: boolean = false) {
    weeks.value = await getOpenWeeks(force)
  }

  return {
    weeks,
    load
  }
})
