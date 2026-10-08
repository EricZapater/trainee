<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getAtletes } from '@/api/entrenador'
import { getAtletaCompeticionsByEntrenador } from '@/api/competicions'
import { getNutricioPlans, type NutricioPlanWithDetails } from '@/api/nutricio'
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
const router = useRouter()
const { t } = useI18n()

const atletes = ref<any[]>([])
const selectedAtletaId = ref<string | null>(null)
const startDate = ref<Date>(new Date())
const selectedPeriod = ref<number>(6) // months
const loading = ref(false)
const hideDiscarded = ref(false)

const atletaStatusFilter = ref<'actius' | 'inactius' | 'tots'>('actius')
const statusFilterOptions = computed(() => [
  { label: 'Atletes actius', value: 'actius' },
  { label: 'Atletes inactius', value: 'inactius' },
  { label: 'Tots els atletes', value: 'tots' }
])

const periodOptions = computed(() => [
  { label: t('planningManager.months3'), value: 3 },
  { label: t('planningManager.months6'), value: 6 },
  { label: t('planningManager.months9'), value: 9 },
  { label: t('planningManager.months12'), value: 12 }
])

const competicions = ref<Competicio[]>([])
const nutricioPlans = ref<NutricioPlanWithDetails[]>([])

const loadAtletes = async () => {
  try {
    const raw = await getAtletes()
    atletes.value = raw.map(a => ({
      ...a,
      nomComplet: a.cognoms ? `${a.nom} ${a.cognoms}` : a.nom
    }))
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'han pogut carregar els atletes', life: 3000 })
  }
}

const filteredAtletes = computed(() => {
  if (atletaStatusFilter.value === 'actius') {
    return atletes.value.filter(a => a.actiu)
  }
  if (atletaStatusFilter.value === 'inactius') {
    return atletes.value.filter(a => !a.actiu)
  }
  return atletes.value
})

watch(filteredAtletes, (newList) => {
  if (selectedAtletaId.value && !newList.some(a => a.id === selectedAtletaId.value)) {
    selectedAtletaId.value = null
    competicions.value = []
    nutricioPlans.value = []
  }
})

const fetchAthleteData = async () => {
  if (!selectedAtletaId.value) {
    competicions.value = []
    nutricioPlans.value = []
    return
  }
  loading.value = true
  try {
    const [comps, plans] = await Promise.all([
      getAtletaCompeticionsByEntrenador(selectedAtletaId.value).catch(err => {
        console.error('Error carregant competicions:', err)
        return []
      }),
      getNutricioPlans(selectedAtletaId.value).catch(err => {
        console.error('Error carregant plans nutricionals:', err)
        return []
      })
    ])
    competicions.value = comps || []
    nutricioPlans.value = plans || []
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'han pogut carregar les dades de l\'atleta', life: 3000 })
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
  fetchAthleteData()
})

const activeNutricioPlan = computed(() => {
  if (!nutricioPlans.value || nutricioPlans.value.length === 0) return null
  return nutricioPlans.value.find(p => p.estat === 'actiu') || nutricioPlans.value[0] || null
})

const activeNutricioRevision = computed(() => {
  if (!activeNutricioPlan.value || !activeNutricioPlan.value.revisions || activeNutricioPlan.value.revisions.length === 0) return null
  return activeNutricioPlan.value.revisions[0]
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

interface NutricioTimelineEvent {
  id: string
  type: 'revision_created' | 'revision_scheduled'
  planId: string
  planTitle: string
  versio: number
  ch?: number
  sodi?: number
  fluid?: number
  dateStr?: string
}

const getNutricioEventsForWeek = (weekStart: Date, weekEnd: Date): NutricioTimelineEvent[] => {
  const events: NutricioTimelineEvent[] = []

  nutricioPlans.value.forEach(plan => {
    if (!plan.revisions) return

    plan.revisions.forEach(rev => {
      // Event 1: Creation / Revision applied date
      if (rev.created_at) {
        const cDate = new Date(rev.created_at)
        if (cDate >= weekStart && cDate <= weekEnd) {
          events.push({
            id: `created-${rev.id}`,
            type: 'revision_created',
            planId: plan.id,
            planTitle: plan.titol,
            versio: rev.versio,
            ch: rev.objectiu_ch_g_h,
            sodi: rev.objectiu_sodi_mg_h,
            fluid: rev.objectiu_fluid_ml_h
          })
        }
      }

      // Event 2: Scheduled next revision date
      if (rev.data_revisio) {
        const sDate = new Date(rev.data_revisio + 'T12:00:00')
        if (sDate >= weekStart && sDate <= weekEnd) {
          events.push({
            id: `scheduled-${rev.id}`,
            type: 'revision_scheduled',
            planId: plan.id,
            planTitle: plan.titol,
            versio: rev.versio,
            ch: rev.objectiu_ch_g_h,
            sodi: rev.objectiu_sodi_mg_h,
            fluid: rev.objectiu_fluid_ml_h,
            dateStr: rev.data_revisio
          })
        }
      }
    })
  })

  return events
}

const goToNutricioDetail = (planId: string) => {
  router.push({ path: '/nutricio', query: { plan_id: planId } })
}

const formatDate = (dStr?: string) => {
  if (!dStr) return '-'
  const parts = dStr.split('T')[0].split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dStr
}

const isOverdue = (dateStr?: string) => {
  if (!dateStr) return false
  const today = new Date().toISOString().split('T')[0]
  return dateStr <= today
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

const getTipusTagSeverity = (tipus?: string) => {
  if (tipus === 'A') return 'danger'
  if (tipus === 'B') return 'warn'
  if (tipus === 'C') return 'success'
  return 'info'
}
</script>

<template>
  <div class="planning-layout max-w-7xl mx-auto">
    <div class="page-header glass-card flex justify-between items-center flex-wrap gap-4">
      <div>
        <h1 class="page-title">{{ $t('planningManager.title') }}</h1>
        <p class="text-secondary mt-2">{{ $t('planningManager.subtitle') }}</p>
      </div>
      <div class="flex items-center gap-3 text-xs font-medium bg-black/5 dark:bg-white/5 p-3 rounded-lg border border-border flex-wrap">
        <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full inline-block bg-[#ef4444]"></span> Tipus A</span>
        <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full inline-block bg-[#f97316]"></span> Tipus B</span>
        <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full inline-block bg-[#22c55e]"></span> Tipus C</span>
        <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full inline-block bg-[#059669]"></span> Revisió Nutrició</span>
        <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full inline-block bg-[#0284c7]"></span> Propera Revisió</span>
      </div>
    </div>

    <div class="filters-card glass-card">
      <div class="filters-row">
        <div class="field">
          <label>Estat atletes</label>
          <Select 
            v-model="atletaStatusFilter" 
            :options="statusFilterOptions" 
            optionLabel="label" 
            optionValue="value" 
            class="w-full"
          />
        </div>
        <div class="field">
          <label>{{ $t('planningManager.athlete') }}</label>
          <Select 
            v-model="selectedAtletaId" 
            :options="filteredAtletes" 
            optionLabel="nomComplet" 
            optionValue="id" 
            :placeholder="$t('planningManager.selectAthlete')" 
            filter
            filterBy="nomComplet"
            :filterPlaceholder="'Cercar atleta...'"
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

    <!-- Banner Resum Nutrició Activa de l'Atleta -->
    <div v-if="selectedAtletaId && !loading" class="nutricio-summary-banner glass-card">
      <div v-if="activeNutricioPlan && activeNutricioRevision" class="nutricio-banner-content flex justify-between items-center flex-wrap gap-4">
        <div class="flex items-center gap-3">
          <div class="nutri-icon-box">
            <i class="ti ti-tools-kitchen-2 text-xl"></i>
            <i class="ti ti-bottle text-lg -ml-1"></i>
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-bold text-primary text-base">{{ activeNutricioPlan.titol }}</span>
              <Tag severity="success" :value="'v' + activeNutricioRevision.versio + ' ACTIVA'" class="text-xs" />
              <Tag v-if="activeNutricioPlan.estat !== 'actiu'" severity="secondary" :value="activeNutricioPlan.estat.toUpperCase()" class="text-xs" />
            </div>
            <div class="flex items-center gap-3 text-xs text-secondary mt-1 flex-wrap">
              <span v-if="activeNutricioRevision.objectiu_ch_g_h" class="text-orange-600 font-semibold flex items-center gap-1">
                <i class="ti ti-flame"></i> {{ activeNutricioRevision.objectiu_ch_g_h }} g/h
              </span>
              <span v-if="activeNutricioRevision.objectiu_sodi_mg_h" class="text-purple-600 font-semibold flex items-center gap-1">
                <i class="ti ti-atom"></i> {{ activeNutricioRevision.objectiu_sodi_mg_h }} mg/h
              </span>
              <span v-if="activeNutricioRevision.objectiu_fluid_ml_h" class="text-blue-600 font-semibold flex items-center gap-1">
                <i class="ti ti-droplet"></i> {{ activeNutricioRevision.objectiu_fluid_ml_h }} ml/h
              </span>
              <span v-if="activeNutricioRevision.data_revisio" class="flex items-center gap-1 font-medium" :class="isOverdue(activeNutricioRevision.data_revisio) ? 'text-red-500 font-bold' : 'text-primary'">
                <i class="ti ti-calendar-event"></i> Propera revisió: {{ formatDate(activeNutricioRevision.data_revisio) }}
                <span v-if="isOverdue(activeNutricioRevision.data_revisio)" class="text-red-500">(Vencuda!)</span>
              </span>
            </div>
          </div>
        </div>

        <Button
          label="Veure Detall Nutricional"
          icon="ti ti-arrow-right"
          class="p-button-sm p-button-outlined p-button-accent"
          @click="goToNutricioDetail(activeNutricioPlan.id)"
        />
      </div>

      <div v-else class="nutricio-banner-empty flex justify-between items-center flex-wrap gap-3">
        <div class="flex items-center gap-2 text-secondary text-sm">
          <i class="ti ti-tools-kitchen-2 text-muted text-lg"></i>
          <span>Aquest atleta no té cap pla nutricional registrat.</span>
        </div>
        <Button
          label="Crear Pla Nutricional"
          icon="ti ti-plus"
          class="p-button-sm p-button-text p-button-accent"
          @click="router.push('/nutricio')"
        />
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
              <!-- Competicions -->
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

              <!-- Revisions Nutricionals -->
              <div
                v-for="nutri in getNutricioEventsForWeek(week.start, week.end)"
                :key="nutri.id"
                class="nutri-badge"
                :class="nutri.type === 'revision_scheduled' ? 'badge-nutri-scheduled' : 'badge-nutri-created'"
                @click="goToNutricioDetail(nutri.planId)"
                :title="(nutri.type === 'revision_scheduled' ? 'Propera revisió nutricional: ' : 'Revisió nutricional: ') + nutri.planTitle + ' (v' + nutri.versio + ') - Clic per anar al detall'"
              >
                <div class="badge-type flex items-center justify-center gap-0.5">
                  <i :class="nutri.type === 'revision_scheduled' ? 'ti ti-calendar-event' : 'ti ti-tools-kitchen-2'" style="font-size: 0.75rem;"></i>
                  <span>v{{ nutri.versio }}</span>
                </div>
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
          <Tag :value="$t('planningManager.type') + ' ' + selectedComp.tipus" :severity="getTipusTagSeverity(selectedComp.tipus)" />
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
  background-color: #ef4444;
  color: white;
}
.badge-b {
  background-color: #f97316;
  color: white;
}
.badge-c {
  background-color: #22c55e;
  color: white;
}
.badge-descartada {
  background-color: #f3f4f6;
  color: #9ca3af;
  border: 1px dashed #d1d5db;
  box-shadow: none;
  opacity: 0.7;
}

/* Nutricio Summary Banner */
.nutricio-summary-banner {
  padding: 14px 20px;
  border-radius: var(--radius-lg);
  border-left: 4px solid #10b981;
  background: var(--bg-card);
}
.nutri-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

/* Nutricio Badges in Timeline */
.nutri-badge {
  display: flex;
  flex-direction: column;
  padding: 4px 2px;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  text-align: center;
}
.nutri-badge:hover {
  transform: translateY(-2px);
  box-shadow: 0 3px 6px rgba(0,0,0,0.15);
}
.badge-nutri-created {
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  color: white;
}
.badge-nutri-scheduled {
  background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%);
  color: white;
  border: 1px dashed rgba(255,255,255,0.8);
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
