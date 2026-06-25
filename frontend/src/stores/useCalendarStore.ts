import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getMySubmission, createSubmission } from '@/api/submissions'
import type { SlotData, Activitat } from '@/types'

function getThisMonday(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

export const useCalendarStore = defineStore('calendar', () => {
  const currentWeekStart = ref<string>(getThisMonday())
  const slotsByDay = ref<Record<number, SlotData[]>>({
    0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
  })
  const notesSetmana = ref<string>('')
  const estat = ref<string>('esborrany')
  const loading = ref<boolean>(false)
  const selectedMobileActivities = ref<Activitat[]>([])
  
  const horesDisponiblesPerDia = ref<Record<number, number>>({
    0: 1.0, 1: 1.0, 2: 1.0, 3: 1.0, 4: 1.0, 5: 1.0, 6: 1.0
  })

  function addSlotToDay(dia: number, data: SlotData) {
    slotsByDay.value[dia].push(data)
  }

  function removeSlotFromDay(dia: number, index: number) {
    slotsByDay.value[dia].splice(index, 1)
  }

  function updateSlotInDay(dia: number, index: number, data: SlotData) {
    slotsByDay.value[dia][index] = data
  }

  function setHoresDia(dia: number, hores: number) {
    horesDisponiblesPerDia.value[dia] = hores
    slotsByDay.value[dia].forEach(slot => {
      slot.durada_hores = hores
    })
  }

  function moveSlot(dia: number, fromIndex: number, toIndex: number) {
    const list = slotsByDay.value[dia]
    const [item] = list.splice(fromIndex, 1)
    list.splice(toIndex, 0, item)
  }

  function clearSlots() {
    slotsByDay.value = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
    notesSetmana.value = ''
  }

  async function loadSubmission() {
    loading.value = true
    try {
      const data = await getMySubmission(currentWeekStart.value)
      clearSlots()
      notesSetmana.value = data.notes_setmana || ''
      estat.value = (data as any).estat || 'esborrany'
      
      // Initialize available hours
      for (let dia = 0; dia < 7; dia++) {
        const slotsDia = data.slots.filter(s => s.dia === dia)
        if (slotsDia.length > 0) {
          horesDisponiblesPerDia.value[dia] = slotsDia[0].durada_hores
        } else {
          horesDisponiblesPerDia.value[dia] = 1.0
        }
      }
      
      for (const s of data.slots) {
        addSlotToDay(s.dia, {
          activitat_id: s.activitat_id,
          competicio_id: s.competicio_id,
          test_id: s.test_id,
          activitat_nom: s.activitat_nom || '',
          activitat_icona: s.activitat_icona || '',
          activitat_color: s.activitat_color || '',
          durada_hores: s.durada_hores,
          notes: s.notes || ''
        })
      }
    } finally {
      loading.value = false
    }
  }

  async function saveSubmission() {
    const payloadSlots: any[] = []
    
    for (let dia = 0; dia < 7; dia++) {
      slotsByDay.value[dia].forEach((data, index) => {
        payloadSlots.push({
          dia,
          ordre: index,
          activitat_id: data.activitat_id,
          competicio_id: data.competicio_id,
          test_id: data.test_id,
          durada_hores: data.durada_hores,
          notes: data.notes
        })
      })
    }

    await createSubmission({
      week_start: currentWeekStart.value,
      notes_setmana: notesSetmana.value,
      estat: estat.value,
      slots: payloadSlots
    } as any)
  }

  async function navigateWeek(direction: 1 | -1) {
    const d = new Date(currentWeekStart.value)
    d.setDate(d.getDate() + (direction * 7))
    currentWeekStart.value = d.toISOString().split('T')[0]
    await loadSubmission()
  }

  return {
    currentWeekStart,
    slotsByDay,
    notesSetmana,
    estat,
    loading,
    selectedMobileActivities,
    horesDisponiblesPerDia,
    addSlotToDay,
    removeSlotFromDay,
    updateSlotInDay,
    setHoresDia,
    moveSlot,
    clearSlots,
    loadSubmission,
    saveSubmission,
    navigateWeek
  }
})
