<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { getAtletes } from '@/api/entrenador'
import { getAtletaCompeticionsByEntrenador } from '@/api/competicions'
import type { Atleta, Competicio } from '@/types'
import { useToast } from 'primevue/usetoast'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import { useI18n } from 'vue-i18n'

const toast = useToast()
const { t } = useI18n()

const atletes = ref<any[]>([])
const selectedAtletaId = ref<string | null>(null)
const startDate = ref<Date>(new Date())
const selectedPeriod = ref<number>(6) // months
const loading = ref(false)
const hideDiscarded = ref(false)

const periodOptions = computed(() => [
  { label: t('planningManager.months3'), value: 3 },
  { label: t('planningManager.months6'), value: 6 },
  { label: t('planningManager.months9'), value: 9 },
  { label: t('planningManager.months12'), value: 12 }
])

const competicions = ref<Competicio[]>([])

const loadAtletes = async () => {
  try {
    atletes.value = await getAtletes()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'han pogut carregar els atletes', life: 3000 })
  }
}

const fetchCompeticions = async () => {
  if (!selectedAtletaId.value) return
  loading.value = true
  try {
    competicions.value = await getAtletaCompeticionsByEntrenador(selectedAtletaId.value)
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'han pogut carregar les competicions', life: 3000 })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadAtletes()
  // Set start date to today's monday
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
  startDate.value = new Date(today.setDate(diff))
})

watch([selectedAtletaId], () => {
  fetchCompeticions()
})

// Generate weeks from start date up to period months
const weeks = computed(() => {
  if (!startDate.value) return []
  const result = []
  
  const start = new Date(startDate.value)
  // Ensure start is Monday
  const day = start.getDay()
  const diff = start.getDate() - day + (day === 0 ? -6 : 1)
  start.setDate(diff)
  start.setHours(0,0,0,0)

  const end = new Date(start)
  end.setMonth(end.getMonth() + selectedPeriod.value)

  let current = new Date(start)
  let weekNum = 1
  while (current < end) {
    const weekStart = new Date(current)
    const weekEnd = new Date(current)
    weekEnd.setDate(weekEnd.getDate() + 6)
    weekEnd.setHours(23,59,59,999)

    const labelWeek = `W${weekNum}`
    const labelDate = `(${weekStart.getDate().toString().padStart(2, '0')}/${(weekStart.getMonth()+1).toString().padStart(2, '0')})`
    result.push({ start: weekStart, end: weekEnd, labelWeek, labelDate })
    
    current.setDate(current.getDate() + 7)
    weekNum++
  }
  return result
})

const getCompeticionsForWeek = (weekStart: Date, weekEnd: Date) => {
  return competicions.value.filter(comp => {
    if (hideDiscarded.value && comp.estat === 'descartada') return false
    const compDate = new Date(comp.data)
    return compDate >= weekStart && compDate <= weekEnd
  })
}

// Dialog
const selectedComp = ref<Competicio | null>(null)
const dialogVisible = ref(false)

const openCompDetails = (comp: Competicio) => {
  selectedComp.value = comp
  dialogVisible.value = true
}

const getBadgeClass = (comp: Competicio) => {
  if (comp.estat === 'descartada') return 'badge-descartada'
  if (comp.tipus === 'A') return 'badge-a'
  if (comp.tipus === 'B') return 'badge-b'
  return 'badge-c'
}
</script>

<template>
  <div class="planning-layout max-w-7xl mx-auto">
    <div class="page-header glass-card">
      <h1 class="page-title">{{ $t('planningManager.title') }}</h1>
      <p class="text-secondary mt-2">{{ $t('planningManager.subtitle') }}</p>
    </div>

    <div class="filters-card glass-card">
      <div class="filters-row">
        <div class="field">
          <label>{{ $t('planningManager.athlete') }}</label>
          <Select 
            v-model="selectedAtletaId" 
            :options="atletes" 
            optionLabel="nom" 
            optionValue="id" 
            :placeholder="$t('planningManager.selectAthlete')" 
            class="w-full"
          />
        </div>
        <div class="field">
          <label>{{ $t('planningManager.startDate') }}</label>
          <DatePicker v-model="startDate" dateFormat="dd/mm/yy" class="w-full" />
        </div>
        <div class="field">
          <label>{{ $t('planningManager.period') }}</label>
          <Select v-model="selectedPeriod" :options="periodOptions" optionLabel="label" optionValue="value" class="w-full" />
        </div>
        <div class="checkbox-wrapper" style="display: flex; align-items: center; gap: 8px; margin-top: 1.8rem;">
          <Checkbox v-model="hideDiscarded" binary inputId="hideDiscarded" />
          <label for="hideDiscarded" style="margin-bottom: 0; cursor: pointer;">Amagar descartades</label>
        </div>
      </div>
    </div>

    <div v-if="selectedAtletaId" class="timeline-container glass-card p-4">
      <div v-if="loading" class="text-center py-8 text-secondary">
        <i class="ti ti-loader ti-spin text-3xl mb-2"></i>
        <p>{{ $t('planningManager.loading') }}</p>
      </div>

      <div v-else class="timeline-wrapper">
        <div class="timeline-scroll">
          <div v-for="(week, index) in weeks" :key="index" class="week-column">
            <div class="week-header">
              <span class="week-name">{{ week.labelWeek }}</span>
              <span class="week-date">{{ week.labelDate }}</span>
            </div>
            <div class="week-body">
              <div 
                v-for="comp in getCompeticionsForWeek(week.start, week.end)" 
                :key="comp.id"
                class="comp-badge"
                :class="getBadgeClass(comp)"
                @click="openCompDetails(comp)"
              >
                <div class="badge-type">{{ comp.tipus }}</div>
                <div class="badge-name truncate" :title="comp.nom">{{ comp.nom }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state glass-card text-center">
      <i class="ti ti-user-search text-4xl mb-4 text-muted"></i>
      <p>{{ $t('planningManager.emptyState') }}</p>
    </div>

    <!-- Dialog Detalls Competició -->
    <Dialog v-model:visible="dialogVisible" :header="$t('planningManager.detailsTitle')" modal :style="{ width: '450px' }">
      <div v-if="selectedComp" class="comp-details flex flex-col gap-3">
        <div class="detail-row">
          <span class="detail-label">{{ $t('planningManager.name') }}</span>
          <span class="detail-value font-semibold">{{ selectedComp.nom }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ $t('planningManager.date') }}</span>
          <span class="detail-value">{{ selectedComp.data }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ $t('planningManager.type') }}</span>
          <Tag :value="$t('planningManager.type') + ' ' + selectedComp.tipus" />
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ $t('planningManager.status') }}</span>
          <Tag v-if="selectedComp.estat === 'descartada'" severity="secondary" :value="$t('planningManager.discarded')" />
          <Tag v-else :severity="selectedComp.registrat ? 'success' : 'info'" :value="selectedComp.registrat ? $t('planningManager.inCalendar') : $t('planningManager.pending')" />
        </div>
        <div class="flex gap-4 mt-2">
          <div class="detail-row flex-1">
            <span class="detail-label">{{ $t('planningManager.kms') }}</span>
            <span class="detail-value">{{ selectedComp.kms || '-' }}</span>
          </div>
          <div class="detail-row flex-1">
            <span class="detail-label">{{ $t('planningManager.elevation') }}</span>
            <span class="detail-value">{{ selectedComp.desnivell ? selectedComp.desnivell + 'm+' : '-' }}</span>
          </div>
        </div>
        <div v-if="selectedComp.enllac" class="detail-row mt-2">
          <span class="detail-label">{{ $t('planningManager.link') }}</span>
          <a :href="selectedComp.enllac" target="_blank" class="text-primary hover:underline flex items-center gap-1">
            {{ $t('planningManager.openLink') }} <i class="ti ti-external-link"></i>
          </a>
        </div>
        <div v-if="selectedComp.comentaris" class="detail-row mt-2">
          <span class="detail-label">{{ $t('planningManager.comments') }}</span>
          <div class="detail-box">{{ selectedComp.comentaris }}</div>
        </div>
      </div>
      <template #footer>
        <Button :label="$t('planningManager.close')" icon="ti ti-check" @click="dialogVisible = false" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.planning-layout {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.page-header {
  padding: 20px 24px;
}
.page-title {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
}
.filters-card {
  padding: 20px 24px;
}
.field label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}
.empty-state {
  padding: 60px 20px;
}
.text-center { text-align: center; }
.py-8 { padding-top: 32px; padding-bottom: 32px; }

.filters-row {
  display: flex;
  gap: 16px;
  align-items: flex-end;
}
.filters-row .field {
  flex: 1;
}

/* Timeline Horizontal Layout */
.timeline-wrapper {
  overflow-x: auto;
  padding-bottom: 12px;
}
.timeline-scroll {
  display: flex;
  min-width: max-content;
  border-top: 1px solid var(--border);
  border-left: 1px solid var(--border);
}
.week-column {
  width: 40px;
  min-height: 150px;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}
.week-header {
  background: rgba(0,0,0,0.02);
  padding: 6px 2px;
  text-align: center;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1.2;
}
.week-name {
  font-weight: 700;
  font-size: 0.75rem;
  color: var(--text-primary);
}
.week-date {
  font-size: 0.65rem;
  color: var(--text-secondary);
  opacity: 0.8;
}
.week-body {
  padding: 6px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Badges */
.comp-badge {
  display: flex;
  flex-direction: column;
  padding: 4px 2px;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  text-align: center;
}
.comp-badge:hover {
  transform: translateY(-2px);
}
.badge-type {
  font-size: 0.75rem;
  font-weight: 800;
  opacity: 0.9;
}
.badge-name {
  display: none;
}

/* Colors by Tipus */
.badge-a {
  background-color: var(--accent-danger);
  color: white;
}
.badge-b {
  background-color: var(--accent-warning);
  color: white;
}
.badge-c {
  background-color: var(--accent-info);
  color: white;
}
.badge-descartada {
  background-color: #f3f4f6;
  color: #9ca3af;
  border: 1px dashed #d1d5db;
  box-shadow: none;
  opacity: 0.7;
}

/* Dialog Details */
.detail-row {
  display: flex;
  flex-direction: column;
}
.detail-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 2px;
}
.detail-box {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px;
  font-size: 0.95rem;
  white-space: pre-wrap;
}
.font-semibold { font-weight: 600; }
.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
