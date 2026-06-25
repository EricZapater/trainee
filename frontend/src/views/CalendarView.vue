<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useCalendarStore } from '@/stores/useCalendarStore'
import { useActivitatsStore } from '@/stores/useActivitatsStore'
import { useWeeksStore } from '@/stores/useWeeksStore'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Textarea from 'primevue/textarea'
import ActivityPalette from '@/components/ActivityPalette.vue'
import ActivityItem from '@/components/ActivityItem.vue'
import WeekStatusBadge from '@/components/WeekStatusBadge.vue'

const { t, tm } = useI18n()
const calendarStore = useCalendarStore()
const activitatsStore = useActivitatsStore()
const weeksStore = useWeeksStore()
const toast = useToast()

const isSaving = ref(false)
const expandedDays = ref<number[]>([0, 1, 2, 3, 4, 5, 6]) // Tots els dies oberts per defecte

const toggleDay = (dia: number) => {
  if (expandedDays.value.includes(dia)) {
    expandedDays.value = expandedDays.value.filter(d => d !== dia)
  } else {
    expandedDays.value.push(dia)
  }
}

const dies = computed(() => tm('calendar.days') as string[])

const formatDate = (dateStr: string, offsetDays: number = 0) => {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + offsetDays)
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`
}

const currentWeekLabel = computed(() => {
  const start = calendarStore.currentWeekStart
  return t('calendar.weekOf', { start: formatDate(start), end: formatDate(start, 6) })
})

const weekStatus = computed(() => {
  const week = weeksStore.weeks.find(w => w.week_start === calendarStore.currentWeekStart)
  return week ? week.estat : 'tancada'
})

const isWeekOpen = computed(() => weekStatus.value === 'oberta')
const isWeekTraspassada = computed(() => weekStatus.value === 'traspassada')

const loadData = async () => {
  try {
    await Promise.all([
      activitatsStore.load(),
      weeksStore.load(),
      calendarStore.loadSubmission()
    ])
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error carregant les dades', life: 3000 })
  }
}

const handleColumnDragOver = (e: DragEvent) => {
  if (!isWeekOpen.value) return
}

const handleColumnDragLeave = (e: DragEvent) => {
}

const handleColumnDrop = (e: DragEvent, dia: number) => {
  if (!isWeekOpen.value) return
  
  const dataString = e.dataTransfer?.getData('application/json')
  if (dataString) {
    try {
      const payload = JSON.parse(dataString)
      if (payload.type === 'multi' && Array.isArray(payload.activities)) {
        payload.activities.forEach((act: any) => {
          calendarStore.addSlotToDay(dia, {
            activitat_id: act.id,
            activitat_nom: act.nom,
            activitat_icona: act.icona,
            activitat_color: act.color,
            durada_hores: calendarStore.horesDisponiblesPerDia[dia] || 1.0,
            notes: ''
          })
        })
        // Clear selection after dropping successfully
        calendarStore.selectedMobileActivities = []
      }
    } catch (err) {}
    return
  }

  const reorderData = e.dataTransfer?.getData('application/x-trainee-reorder')
  if (reorderData) {
    const { dia: fromDia, index: fromIndex } = JSON.parse(reorderData)
    if (fromDia !== dia) {
      const item = calendarStore.slotsByDay[fromDia][fromIndex]
      calendarStore.removeSlotFromDay(fromDia, fromIndex)
      calendarStore.addSlotToDay(dia, item)
    }
  }
}

const handleMobileAdd = (dia: number) => {
  if (!isWeekOpen.value) return
  if (calendarStore.selectedMobileActivities.length > 0) {
    calendarStore.selectedMobileActivities.forEach(act => {
      calendarStore.addSlotToDay(dia, {
        activitat_id: act.id,
        activitat_nom: act.nom,
        activitat_icona: act.icona,
        activitat_color: act.color,
        durada_hores: calendarStore.horesDisponiblesPerDia[dia] || 1.0,
        notes: ''
      })
    })
    calendarStore.selectedMobileActivities = []
  }
}

onMounted(() => {
  const route = useRoute()
  if (route.query.week) {
    calendarStore.currentWeekStart = route.query.week as string
  }
  loadData()
})

const handleNavigate = async (direction: 1 | -1) => {
  await calendarStore.navigateWeek(direction)
}

const handleSave = async (isCompleted: boolean = false) => {
  isSaving.value = true
  if (isCompleted) {
    calendarStore.estat = 'completada'
  } else {
    calendarStore.estat = 'esborrany'
  }
  try {
    await calendarStore.saveSubmission()
    if (isCompleted) {
      toast.add({ severity: 'success', summary: 'Completada', detail: 'La setmana s\'ha marcat com a completada', life: 3000 })
    } else {
      toast.add({ severity: 'success', summary: 'Guardat', detail: 'L\'esborrany s\'ha guardat correctament', life: 3000 })
    }
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error en guardar la disponibilitat', life: 3000 })
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="calendar-layout">
    <aside class="sidebar">
      <ActivityPalette 
        :activitats="activitatsStore.activitats" 
        :disabled="!isWeekOpen" 
      />
    </aside>
    
    <div class="main-content">
      <div class="calendar-header glass-card">
        <div class="nav-controls">
          <Button icon="ti ti-chevron-left" text rounded @click="handleNavigate(-1)" />
          <h2 class="week-title">{{ currentWeekLabel }}</h2>
          <Button icon="ti ti-chevron-right" text rounded @click="handleNavigate(1)" />
        </div>
        
        <WeekStatusBadge :estat="weekStatus" />
      </div>

      <div v-if="calendarStore.loading" class="loading-state glass-card">
        <i class="ti ti-loader ti-spin text-4xl mb-4 text-primary"></i>
        <p>{{ $t('calendar.loading') }}</p>
      </div>

      <div v-else class="calendar-grid-container glass-card desktop-only">
        <div class="calendar-grid">
          <!-- Day headers -->
          <div v-for="(dia, i) in dies" :key="dia" class="grid-header-cell day-header">
            <span class="day-name">{{ typeof dia === 'string' ? dia.substring(0, 3) : '' }}</span>
            <span class="day-date">{{ formatDate(calendarStore.currentWeekStart, i) }}</span>
            <div class="day-hours-selector">
              <i class="ti ti-clock"></i>
              <select 
                v-model="calendarStore.horesDisponiblesPerDia[i]"
                @change="calendarStore.setHoresDia(i, calendarStore.horesDisponiblesPerDia[i])"
                class="duration-select-header"
                :disabled="!isWeekOpen"
              >
                <option :value="1.0">1h</option>
                <option :value="1.5">1.5h</option>
                <option :value="2.0">2h</option>
                <option :value="2.5">2.5h</option>
                <option :value="3.0">3h</option>
                <option :value="4.0">>3h</option>
              </select>
            </div>
          </div>

          <!-- 7 Columns -->
          <div 
            v-for="dia in 7" 
            :key="`col-${dia-1}`" 
            class="day-column"
            @dragover.prevent="handleColumnDragOver"
            @dragleave.prevent="handleColumnDragLeave"
            @drop.prevent="handleColumnDrop($event, dia-1)"
            :class="{ 'disabled': !isWeekOpen }"
          >
            <ActivityItem 
              v-for="(slot, idx) in calendarStore.slotsByDay[dia-1]"
              :key="slot.activitat_id + '-' + idx"
              :dia="dia-1"
              :index="idx"
              :disabled="!isWeekOpen"
            />
            
            <div class="column-drop-zone" :class="{'is-active': isWeekOpen}">
               <i class="ti ti-plus"></i> {{ $t('calendar.dropHere') }}
            </div>
          </div>
        </div>
      </div>

      <!-- Llista vertical per a Mòbils -->
      <div v-if="!calendarStore.loading" class="calendar-mobile mobile-only">
        <div v-for="dia in 7" :key="dia" class="mobile-day-card glass-card">
          <div class="mobile-day-header" @click="toggleDay(dia-1)">
            <div class="mobile-day-title">
              <h3>{{ typeof dies[dia-1] === 'string' ? dies[dia-1] : '' }}</h3>
              <span class="mobile-date">{{ formatDate(calendarStore.currentWeekStart, dia-1) }}</span>
            </div>
            <div class="mobile-day-hours" @click.stop>
              <select 
                v-model="calendarStore.horesDisponiblesPerDia[dia-1]"
                @change="calendarStore.setHoresDia(dia-1, calendarStore.horesDisponiblesPerDia[dia-1])"
                class="duration-select-header"
                :disabled="!isWeekOpen"
              >
                <option :value="1.0">1h</option>
                <option :value="1.5">1.5h</option>
                <option :value="2.0">2h</option>
                <option :value="2.5">2.5h</option>
                <option :value="3.0">3h</option>
                <option :value="4.0">>3h</option>
              </select>
            </div>
            <i :class="expandedDays.includes(dia-1) ? 'ti ti-chevron-up' : 'ti ti-chevron-down'" class="text-secondary text-xl"></i>
          </div>
          <div v-show="expandedDays.includes(dia-1)" class="mobile-moments-list">
            <div class="mobile-activities-stack">
              <ActivityItem 
                v-for="(slot, idx) in calendarStore.slotsByDay[dia-1]"
                :key="slot.activitat_id + '-' + idx"
                :dia="dia-1"
                :index="idx"
                :disabled="!isWeekOpen"
              />
            </div>
            
            <div 
              v-if="isWeekOpen"
              class="mobile-add-zone"
              :class="{ 'can-tap': calendarStore.selectedMobileActivities.length > 0 }"
              @click="handleMobileAdd(dia-1)"
            >
              <i class="ti ti-plus"></i>
              <span>
                {{ calendarStore.selectedMobileActivities.length > 0 
                  ? `${$t('calendar.tapToPlace')} (${calendarStore.selectedMobileActivities.length})` 
                  : $t('calendar.chooseActivityTop') }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="isWeekOpen && !calendarStore.loading" class="calendar-footer glass-card">
        <div class="notes-section">
          <h3>{{ $t('calendar.weekNotesTitle') }}</h3>
          <Textarea 
            v-model="calendarStore.notesSetmana" 
            :placeholder="$t('calendar.weekNotesPlaceholder')"
            rows="3" 
            style="width: 100%; resize: vertical;" 
          />
        </div>
        
        <div class="actions-section flex gap-4">
          <Button 
            v-if="calendarStore.estat === 'completada'"
            label="Marcar com a Esborrany" 
            icon="ti ti-edit" 
            @click="handleSave(false)" 
            :loading="isSaving" 
            severity="secondary"
            size="large"
          />
          <Button 
            v-else
            label="Desar Esborrany" 
            icon="ti ti-device-floppy" 
            @click="handleSave(false)" 
            :loading="isSaving" 
            severity="secondary"
            size="large"
          />
          <Button 
            v-if="calendarStore.estat !== 'completada'"
            label="Completar Setmana" 
            icon="ti ti-check" 
            @click="handleSave(true)" 
            :loading="isSaving" 
            size="large"
            severity="success"
          />
        </div>
      </div>
      
      <div v-else-if="isWeekTraspassada && !calendarStore.loading" class="closed-notice glass-card" style="border-color: #3b82f6; background: rgba(59, 130, 246, 0.05);">
        <i class="ti ti-confetti text-4xl mb-2" style="color: #3b82f6;"></i>
        <h3 class="text-xl mb-2" style="color: #3b82f6; margin: 0;">{{ $t('calendar.trainingAvailableTitle') }}</h3>
        <p>{{ $t('calendar.trainingAvailableDesc') }}</p>
      </div>
      
      <div v-else-if="!isWeekOpen && !calendarStore.loading" class="closed-notice glass-card">
        <i class="ti ti-lock text-3xl mb-2 text-muted"></i>
        <p>{{ $t('calendar.weekClosedDesc') }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar-layout {
  display: flex;
  gap: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.sidebar {
  flex-shrink: 0;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.week-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
}

.loading-state, .closed-notice {
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--text-secondary);
}

.ti-spin {
  animation: spin 2s linear infinite;
}
@keyframes spin { 100% { transform: rotate(360deg); } }

.calendar-grid-container {
  padding: 24px;
  overflow-x: auto;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(160px, 1fr));
  gap: 8px;
  min-width: 1000px;
}

.grid-header-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: var(--text-secondary);
  padding: 12px 8px;
}

.day-header {
  flex-direction: column;
  gap: 4px;
  background: var(--bg-surface);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.day-name {
  font-size: 0.9rem;
  color: var(--text-primary);
}

.day-date {
  font-size: 0.8rem;
}

.day-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 400px;
  border-radius: var(--radius-sm);
  background: rgba(19, 20, 27, 0.3);
  padding: 8px;
  transition: background var(--transition-fast);
}

.day-column.disabled {
  background: transparent;
}

.column-drop-zone {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px dashed transparent;
  color: var(--text-muted);
  font-size: 0.85rem;
  border-radius: var(--radius-sm);
  opacity: 0;
  min-height: 80px;
  transition: all var(--transition-fast);
}

.day-column:not(.disabled):hover .column-drop-zone {
  border-color: var(--border);
  opacity: 0.5;
}

.column-drop-zone.is-active {
  background: rgba(99, 102, 241, 0.05);
  border-color: var(--accent-primary);
  opacity: 1;
}

.calendar-footer {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.notes-section h3 {
  margin: 0 0 12px 0;
  font-size: 1rem;
  color: var(--text-primary);
}

.actions-section {
  display: flex;
  justify-content: flex-end;
}

.mobile-only {
  display: none;
}

@media (max-width: 768px) {
  .calendar-layout {
    flex-direction: column;
  }
  
  .desktop-only {
    display: none;
  }
  
  .mobile-only {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .mobile-day-card {
    background: var(--bg-surface);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }
  
  .mobile-day-header {
    background: rgba(99, 102, 241, 0.08);
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
  }
  
  .mobile-day-title {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  
  .mobile-day-header h3 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--text-primary);
  }
  
  .mobile-date {
    font-size: 0.9rem;
    color: var(--text-secondary);
  }
  
  .mobile-moments-list {
    display: flex;
    flex-direction: column;
  }
  
  .mobile-activities-stack {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
  }
  
  .mobile-add-zone {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 16px;
    margin: 0 12px 12px 12px;
    border: 1px dashed var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    font-size: 0.9rem;
    transition: all var(--transition-fast);
  }
  
  .mobile-add-zone.can-tap {
    border-color: var(--accent-primary);
    color: var(--accent-primary);
    background: rgba(99, 102, 241, 0.05);
    cursor: pointer;
  }
  
  .calendar-footer {
    padding: 16px;
  }
  
  .actions-section {
    display: flex;
    justify-content: center;
  }
  
  .actions-section :deep(.p-button) {
    width: auto;
    min-width: 250px;
  }
}

/* Styles for header selectors */
.day-hours-selector {
  margin-top: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.day-hours-selector i {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.mobile-day-hours {
  display: flex;
  align-items: center;
  margin-left: auto;
  margin-right: 12px;
}

.duration-select-header {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  padding: 2px 4px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  transition: all var(--transition-fast);
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 4px top 50%;
  background-size: 8px auto;
  padding-right: 16px;
}

.duration-select-header:hover:not(:disabled) {
  border-color: var(--accent-primary);
  background-color: var(--bg-hover);
}

.duration-select-header:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px rgba(var(--accent-primary-rgb), 0.2);
}

.duration-select-header:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
