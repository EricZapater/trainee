import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getMySubmission, createSubmission } from '@/api/submissions'
import { listWeekTemplates, createWeekTemplate, deleteWeekTemplate } from '@/api/templates'
import { useActivitatsStore } from './useActivitatsStore'
import type { SlotData, Activitat, WeekTemplate } from '@/types'

function getThisMonday(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
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

  function copyDayToAll(diaIndex: number) {
    const slotsToCopy = slotsByDay.value[diaIndex]
    const hoursToCopy = horesDisponiblesPerDia.value[diaIndex]
    
    for (let d = 0; d < 7; d++) {
      if (d !== diaIndex) {
        slotsByDay.value[d] = slotsToCopy.map(s => ({ ...s }))
        horesDisponiblesPerDia.value[d] = hoursToCopy
      }
    }
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

  async function loadSubmission(force: boolean = false) {
    loading.value = true
    try {
      const data = await getMySubmission(currentWeekStart.value, force)
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
      
      const activitatsStore = useActivitatsStore()
      const activeIds = new Set(activitatsStore.activitats.map(a => a.id))

      for (const s of data.slots) {
        // If the week is open (editable) and the activity is not active, skip loading it
        if (estat.value !== 'completada' && !activeIds.has(s.activitat_id)) {
          continue
        }

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
    const d = new Date(currentWeekStart.value + 'T00:00:00')
    d.setDate(d.getDate() + (direction * 7))
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    currentWeekStart.value = `${yyyy}-${mm}-${dd}`
    await loadSubmission()
  }

  const templates = ref<WeekTemplate[]>([])

  async function loadTemplates() {
    try {
      templates.value = await listWeekTemplates()
    } catch (e) {
      console.error('Error carregant plantilles', e)
    }
  }

  async function saveAsTemplate(nom: string) {
    const payloadSlots: any[] = []
    for (let dia = 0; dia < 7; dia++) {
      slotsByDay.value[dia].forEach((data, index) => {
        payloadSlots.push({
          dia,
          ordre: index,
          activitat_id: data.activitat_id,
          durada_hores: data.durada_hores,
          notes: data.notes
        })
      })
    }
    const newTemplate = await createWeekTemplate({ nom, slots: payloadSlots })
    templates.value.push(newTemplate)
  }

  async function deleteTemplate(id: string) {
    await deleteWeekTemplate(id)
    templates.value = templates.value.filter(t => t.id !== id)
  }

  function applyTemplate(template: WeekTemplate, activitats: Activitat[]) {
    clearSlots()
    
    // Set hours for each day based on template slots
    for (let dia = 0; dia < 7; dia++) {
      const slotsDia = template.slots.filter(s => s.dia === dia)
      if (slotsDia.length > 0) {
        horesDisponiblesPerDia.value[dia] = slotsDia[0].durada_hores
      } else {
        horesDisponiblesPerDia.value[dia] = 1.0
      }
    }

    for (const s of template.slots) {
      const act = activitats.find(a => a.id === s.activitat_id)
      if (!act || !act.activa) continue
      addSlotToDay(s.dia, {
        activitat_id: s.activitat_id,
        activitat_nom: act.nom,
        activitat_icona: act.icona,
        activitat_color: act.color,
        durada_hores: s.durada_hores,
        notes: s.notes || ''
      })
    }
  }

  return {
    currentWeekStart,
    slotsByDay,
    notesSetmana,
    estat,
    loading,
    selectedMobileActivities,
    horesDisponiblesPerDia,
    templates,
    addSlotToDay,
    removeSlotFromDay,
    updateSlotInDay,
    setHoresDia,
    copyDayToAll,
    moveSlot,
    clearSlots,
    loadSubmission,
    saveSubmission,
    navigateWeek,
    loadTemplates,
    saveAsTemplate,
    deleteTemplate,
    applyTemplate
  }
})
