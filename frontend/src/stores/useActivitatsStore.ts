import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getActivitats } from '@/api/activitats'
import type { Activitat } from '@/types'

export const useActivitatsStore = defineStore('activitats', () => {
  const activitats = ref<Activitat[]>([])

  async function load(force: boolean = false) {
    activitats.value = await getActivitats(force)
  }

  return {
    activitats,
    load
  }
})
