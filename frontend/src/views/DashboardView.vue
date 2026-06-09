<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getEntrenadorWeeks, getEntrenadorSubmissions } from '@/api/entrenador'
import { useToast } from 'primevue/usetoast'
import type { ManagedWeekWithCount, EntrenadorSubmissionsResponse, AtletaSubmissionSummary } from '@/types'
import Select from 'primevue/select'
import Button from 'primevue/button'
import Paginator from 'primevue/paginator'
import AthleteDrawer from '@/components/AthleteDrawer.vue'

const router = useRouter()
const toast = useToast()

const weeks = ref<ManagedWeekWithCount[]>([])
const selectedWeek = ref<string>('')
const submissionsData = ref<EntrenadorSubmissionsResponse | null>(null)
const loading = ref(false)

const drawerVisible = ref(false)
const selectedAthlete = ref<AtletaSubmissionSummary | null>(null)

const first = ref(0)
const rows = ref(10)
const showOnlyPending = ref(false)

const loadWeeks = async () => {
  try {
    weeks.value = await getEntrenadorWeeks()
    if (weeks.value.length > 0 && !selectedWeek.value) {
      selectedWeek.value = weeks.value[0].week_start
      await loadSubmissions()
    }
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'han pogut carregar les setmanes', life: 3000 })
  }
}

const loadSubmissions = async () => {
  if (!selectedWeek.value) return
  
  loading.value = true
  try {
    submissionsData.value = await getEntrenadorSubmissions(selectedWeek.value)
    first.value = 0 // Reset pagination on week change
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'han pogut carregar les respostes', life: 3000 })
  } finally {
    loading.value = false
  }
}

const onPage = (event: any) => {
  first.value = event.first
  rows.value = event.rows
}

onMounted(() => {
  loadWeeks()
})

const getDaySlots = (slots: any[], dia: number) => {
  return slots.filter(s => s.dia === dia).sort((a, b) => a.ordre - b.ordre)
}

const openAthleteDrawer = (athlete: AtletaSubmissionSummary) => {
  selectedAthlete.value = athlete
  drawerVisible.value = true
}

const togglePendingFilter = () => {
  showOnlyPending.value = !showOnlyPending.value
  first.value = 0
}

const filteredAtletes = computed(() => {
  if (!submissionsData.value) return []
  if (showOnlyPending.value) {
    return submissionsData.value.atletes.filter(a => !a.ha_respost)
  }
  return submissionsData.value.atletes
})

const paginatedAtletes = computed(() => {
  return filteredAtletes.value.slice(first.value, first.value + rows.value)
})

const handleSpecialClick = (slot: any) => {
  if (slot.competicio_id) {
    router.push(`/competicions/${slot.competicio_id}`)
  } else if (slot.test_id) {
    router.push(`/tests/${slot.test_id}`)
  }
}
</script>

<template>
  <div class="dashboard-layout max-w-7xl mx-auto">
    <div class="dashboard-header glass-card">
      <h1 class="page-title">Dashboard</h1>
      
      <div class="header-actions">
        <Select 
          v-model="selectedWeek" 
          :options="weeks" 
          optionLabel="week_start" 
          optionValue="week_start"
          placeholder="Selecciona una setmana" 
          class="week-select"
          @change="loadSubmissions"
        >
          <template #value="slotProps">
            <div v-if="slotProps.value" class="flex align-items-center">
              Setmana del {{ slotProps.value }}
            </div>
            <span v-else>{{ slotProps.placeholder }}</span>
          </template>
          <template #option="slotProps">
            <div class="flex flex-column">
              <span>Setmana del {{ slotProps.option.week_start }}</span>
              <small class="text-muted">{{ slotProps.option.estat }}</small>
            </div>
          </template>
        </Select>
        
        <Button 
          :icon="showOnlyPending ? 'ti ti-filter-off' : 'ti ti-filter'" 
          :severity="showOnlyPending ? 'info' : 'secondary'"
          :text="!showOnlyPending"
          rounded 
          v-tooltip="'Mostrar només atletes pendents'"
          @click="togglePendingFilter" 
        />
        <Button icon="ti ti-refresh" text rounded @click="loadSubmissions" :loading="loading" />
      </div>
    </div>

    <div v-if="!selectedWeek && weeks.length === 0" class="empty-state glass-card mt-4">
      <i class="ti ti-calendar-off text-4xl mb-4 text-muted"></i>
      <p>No tens cap setmana creada.</p>
      <router-link to="/weeks">
        <Button label="Gestionar setmanes" class="mt-4" />
      </router-link>
    </div>

    <div v-else-if="submissionsData" class="submissions-card glass-card mt-4">
      <div class="table-responsive">
        <table class="dashboard-table">
          <thead>
            <tr>
              <th class="col-name">Atleta</th>
              <th>Dl</th>
              <th>Dt</th>
              <th>Dc</th>
              <th>Dj</th>
              <th>Dv</th>
              <th>Ds</th>
              <th>Dg</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="atleta in paginatedAtletes" 
              :key="atleta.atleta_id"
              class="athlete-row"
              :class="{ 'has-response': atleta.ha_respost }"
              @click="openAthleteDrawer(atleta)"
            >
              <td class="col-name">
                <div class="athlete-info">
                  <span class="athlete-name">{{ atleta.nom }}</span>
                  <span v-if="!atleta.ha_respost" class="status-badge pending">Pendent</span>
                  <span v-else class="status-badge done">Rebut</span>
                </div>
              </td>
              
              <td v-for="dia in 7" :key="dia" class="day-cell">
                <div class="slots-stack">
                  <div 
                    v-for="slot in getDaySlots(atleta.slots, dia-1)" 
                    :key="slot.id"
                    class="mini-slot"
                    :class="{ 'cursor-pointer hover-highlight': slot.competicio_id || slot.test_id }"
                    :style="{ backgroundColor: slot.activitat_color }"
                    v-tooltip.top="`${slot.activitat_nom}${slot.notes ? ' - Tinc notes' : ''}`"
                    @click.stop="handleSpecialClick(slot)"
                  >
                    <i :class="['ti', slot.activitat_icona]"></i>
                    <i v-if="slot.competicio_id" class="ti ti-trophy trophy-indicator"></i>
                    <i v-if="slot.test_id" class="ti ti-clipboard-data test-indicator"></i>
                    <span class="slot-duration">{{ slot.durada_hores }}h</span>
                    <i v-if="slot.notes" class="ti ti-message-circle notes-indicator"></i>
                  </div>
                </div>
              </td>
            </tr>
            <tr v-if="filteredAtletes.length === 0">
              <td colspan="8" class="text-center py-4 text-muted">
                <span v-if="submissionsData.atletes.length === 0">No tens atletes assignats encara.</span>
                <span v-else>No hi ha atletes pendents. Tots han respost! 🎉</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Paginator 
        v-if="filteredAtletes.length > 0"
        :rows="rows" 
        :totalRecords="filteredAtletes.length" 
        :first="first"
        :rowsPerPageOptions="[10, 25, 50]" 
        @page="onPage"
        class="border-top-1"
        style="border-top: 1px solid var(--border);"
      />
    </div>
    
    <AthleteDrawer v-model:visible="drawerVisible" :atleta="selectedAthlete" />
  </div>
</template>

<style scoped>
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
}

.page-title {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.week-select {
  width: 280px;
}

.mt-4 { margin-top: 24px; }
.py-4 { padding-top: 24px; padding-bottom: 24px; }
.text-center { text-align: center; }

.empty-state {
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  color: var(--text-secondary);
}

.submissions-card {
  padding: 0;
  overflow: hidden;
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
}

.dashboard-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.dashboard-table th {
  padding: 16px;
  font-weight: 600;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
  background: rgba(19, 20, 27, 0.5);
  text-align: center;
}

.dashboard-table th.col-name {
  text-align: left;
  width: 250px;
}

.dashboard-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.dashboard-table td:not(.col-name) {
  text-align: center;
  width: calc((100% - 250px) / 7);
  border-left: 1px solid var(--border);
}

.athlete-row {
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.athlete-row:hover {
  background-color: var(--bg-hover);
}

.athlete-row.has-response {
  background-color: rgba(34, 197, 94, 0.03);
}

.athlete-row.has-response:hover {
  background-color: rgba(34, 197, 94, 0.08);
}

.athlete-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.athlete-name {
  font-weight: 500;
  color: var(--text-primary);
}

.status-badge {
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.pending {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
}

.status-badge.done {
  background: rgba(34, 197, 94, 0.15);
  color: var(--accent-success);
}

.slots-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-height: 28px;
}

.mini-slot {
  min-width: 32px;
  min-height: 38px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  position: relative;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  padding: 4px 2px;
}

.mini-slot i {
  font-size: 1.1rem;
}

.slot-duration {
  font-size: 0.65rem;
  font-weight: 700;
  margin-top: 2px;
  line-height: 1;
}

.notes-indicator {
  position: absolute;
  top: -4px;
  right: -4px;
  font-size: 0.7rem !important;
  background: var(--accent-warning);
  color: #000;
  border-radius: 50%;
  padding: 2px;
}

.trophy-indicator {
  position: absolute;
  bottom: -4px;
  right: -4px;
  font-size: 0.75rem !important;
  color: var(--accent-warning);
  background: var(--bg-card);
  border-radius: 50%;
  padding: 2px;
}

.test-indicator {
  position: absolute;
  bottom: -4px;
  right: -4px;
  font-size: 0.75rem !important;
  color: var(--accent-primary);
  background: var(--bg-card);
  border-radius: 50%;
  padding: 2px;
}

.cursor-pointer {
  cursor: pointer;
}
.hover-highlight:hover {
  filter: brightness(1.2);
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
    padding: 16px;
  }
  
  .header-actions {
    flex-wrap: wrap;
    justify-content: space-between;
    width: 100%;
  }
  
  .week-select {
    width: 100%;
    margin-bottom: 8px;
  }

  /* Make the first column sticky */
  .dashboard-table th.col-name,
  .dashboard-table td.col-name {
    position: sticky;
    left: 0;
    z-index: 10;
    background: var(--bg-surface);
    box-shadow: 2px 0 5px rgba(0,0,0,0.2);
  }
  
  .athlete-row:hover td.col-name {
    background: var(--bg-hover);
  }
  
  .athlete-row.has-response td.col-name {
    background: #192b23;
  }
  
  .dashboard-table td:not(.col-name) {
    min-width: 60px;
  }
}
</style>
