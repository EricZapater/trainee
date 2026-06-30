<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getHistoricCompeticions } from '@/api/competicions'
import { getAtletes } from '@/api/entrenador'
import type { Competicio } from '@/types'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import InputText from 'primevue/inputtext'

const toast = useToast()

const competicions = ref<Competicio[]>([])
const loading = ref(false)
const atletes = ref<{id: string, nom: string}[]>([])

// Filters
const selectedAtletaId = ref<string | null>(null)
const selectedEstat = ref<string | null>(null)
const dateRange = ref<Date[]>([])
const searchQuery = ref('')

const estatOptions = [
  { label: 'Tots', value: null },
  { label: 'Pendent (Nova)', value: 'pendent' },
  { label: 'Al calendari', value: 'registrat' },
  { label: 'Descartada', value: 'descartada' }
]

const loadData = async () => {
  loading.value = true
  try {
    const [compsData, atletesData] = await Promise.all([
      getHistoricCompeticions(),
      getAtletes()
    ])
    competicions.value = compsData
    atletes.value = [{ id: 'all', nom: 'Tots els atletes' }, ...atletesData]
    selectedAtletaId.value = 'all'
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'han pogut carregar les competicions', life: 3000 })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

const getEstatLabel = (comp: Competicio) => {
  if (comp.estat === 'descartada') return { label: 'Descartada', severity: 'secondary' }
  if (comp.registrat) return { label: 'Al calendari', severity: 'success' }
  return { label: 'Pendent', severity: 'warn' }
}

const getTipusLabel = (tipus: string) => {
  if (tipus === 'A') return { label: 'Tipus A', severity: 'danger' }
  if (tipus === 'B') return { label: 'Tipus B', severity: 'warn' }
  return { label: 'Tipus C', severity: 'info' }
}

const filteredCompeticions = computed(() => {
  return competicions.value.filter(comp => {
    // Filter by text search
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      const matchNom = comp.nom.toLowerCase().includes(query)
      const matchAtleta = comp.atleta_nom?.toLowerCase().includes(query)
      if (!matchNom && !matchAtleta) return false
    }

    // Filter by atleta
    if (selectedAtletaId.value && selectedAtletaId.value !== 'all') {
      if (comp.atleta_id !== selectedAtletaId.value) return false
    }

    // Filter by estat
    if (selectedEstat.value) {
      if (selectedEstat.value === 'descartada' && comp.estat !== 'descartada') return false
      if (selectedEstat.value === 'registrat' && !comp.registrat) return false
      if (selectedEstat.value === 'pendent' && (comp.registrat || comp.estat === 'descartada')) return false
    }

    // Filter by date
    if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
      const compDate = new Date(comp.data)
      const start = new Date(dateRange.value[0])
      start.setHours(0,0,0,0)
      const end = new Date(dateRange.value[1])
      end.setHours(23,59,59,999)
      if (compDate < start || compDate > end) return false
    }

    return true
  })
})

const selectedComp = ref<Competicio | null>(null)
const viewModalVisible = ref(false)

const openDetails = (comp: Competicio) => {
  selectedComp.value = comp
  viewModalVisible.value = true
}
</script>

<template>
  <div class="historic-layout max-w-6xl mx-auto">
    <div class="page-header glass-card">
      <div class="flex justify-between align-center">
        <h1 class="page-title"><i class="ti ti-history text-accent mr-2"></i>Històric de Competicions</h1>
      </div>
    </div>

    <div class="filters-card glass-card mt-4">
      <div class="filters-grid">
        <div class="field search-field">
          <label>Cercar</label>
          <span class="p-input-icon-left w-full">
            <InputText v-model="searchQuery" placeholder="Cerca per nom o atleta..." class="w-full" />
          </span>
        </div>
        <div class="field">
          <label>Atleta</label>
          <Select 
            v-model="selectedAtletaId" 
            :options="atletes" 
            optionLabel="nom" 
            optionValue="id" 
            class="w-full"
          />
        </div>
        <div class="field">
          <label>Dates</label>
          <DatePicker 
            v-model="dateRange" 
            selectionMode="range" 
            :manualInput="false" 
            placeholder="Totes les dates"
            showIcon 
            iconDisplay="input"
            class="w-full"
          />
        </div>
        <div class="field">
          <label>Estat</label>
          <Select 
            v-model="selectedEstat" 
            :options="estatOptions" 
            optionLabel="label" 
            optionValue="value" 
            class="w-full"
          />
        </div>
      </div>
    </div>

    <div class="table-container glass-card mt-4 p-0 overflow-hidden">
      <DataTable 
        :value="filteredCompeticions" 
        :loading="loading"
        paginator 
        :rows="10" 
        :rowsPerPageOptions="[10, 20, 50]"
        tableStyle="min-width: 50rem"
        stripedRows
        hoverableRows
        class="custom-table"
        @row-click="event => openDetails(event.data)"
      >
        <template #empty>
          <div class="text-center p-4 text-secondary">
            <i class="ti ti-inbox text-3xl mb-2"></i>
            <p>No s'han trobat competicions amb aquests filtres.</p>
          </div>
        </template>
        
        <Column field="nom" header="Competició" sortable>
          <template #body="slotProps">
            <span class="font-bold">{{ slotProps.data.nom }}</span>
          </template>
        </Column>
        <Column field="atleta_nom" header="Atleta" sortable>
          <template #body="slotProps">
            <div class="flex align-center gap-2">
              <i class="ti ti-user text-secondary"></i>
              {{ slotProps.data.atleta_nom }}
            </div>
          </template>
        </Column>
        <Column field="data" header="Data" sortable></Column>
        <Column header="Distància" sortable sortField="kms">
          <template #body="slotProps">
            <div class="distance-info">
              <span v-if="slotProps.data.kms">{{ slotProps.data.kms }} km</span>
              <span v-else class="text-muted">-</span>
              <span v-if="slotProps.data.desnivell" class="ml-2 text-sm text-secondary">{{ slotProps.data.desnivell }}m+</span>
            </div>
          </template>
        </Column>
        <Column field="tipus" header="Tipus" sortable>
          <template #body="slotProps">
            <Tag v-if="slotProps.data.tipus" :severity="getTipusLabel(slotProps.data.tipus).severity as any" :value="getTipusLabel(slotProps.data.tipus).label" />
            <span v-else class="text-muted">-</span>
          </template>
        </Column>
        <Column header="Estat">
          <template #body="slotProps">
            <Tag :severity="getEstatLabel(slotProps.data).severity as any" :value="getEstatLabel(slotProps.data).label" />
          </template>
        </Column>
        <Column :exportable="false" style="min-width:4rem">
          <template #body="slotProps">
            <Button icon="ti ti-eye" outlined rounded severity="secondary" @click.stop="openDetails(slotProps.data)" />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Detalls Modal -->
    <Dialog v-model:visible="viewModalVisible" header="Detall de la Competició" modal :style="{ width: '500px' }">
      <div v-if="selectedComp" class="comp-details flex flex-col gap-4 mt-2">
        <div class="bg-surface border rounded p-4 mb-2">
          <div class="flex justify-between align-start mb-2">
            <h3 class="font-bold text-lg m-0">{{ selectedComp.nom }}</h3>
            <Tag :severity="getEstatLabel(selectedComp).severity as any" :value="getEstatLabel(selectedComp).label" />
          </div>
          <div class="text-secondary flex align-center gap-2 mb-1">
            <i class="ti ti-user"></i> {{ selectedComp.atleta_nom }}
          </div>
          <div class="text-secondary flex align-center gap-2">
            <i class="ti ti-calendar"></i> {{ selectedComp.data }}
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="detail-box">
            <span class="detail-label">Tipus</span>
            <span class="detail-value font-bold" :class="'text-' + getTipusLabel(selectedComp.tipus).severity">
              {{ selectedComp.tipus || '-' }}
            </span>
          </div>
          <div class="detail-box">
            <span class="detail-label">Distància</span>
            <span class="detail-value font-bold">
              <template v-if="selectedComp.kms">{{ selectedComp.kms }} km</template>
              <template v-else>-</template>
            </span>
          </div>
          <div class="detail-box">
            <span class="detail-label">Desnivell</span>
            <span class="detail-value font-bold">
              <template v-if="selectedComp.desnivell">{{ selectedComp.desnivell }} m+</template>
              <template v-else>-</template>
            </span>
          </div>
          <div class="detail-box" v-if="selectedComp.enllac">
            <span class="detail-label">Enllaç web</span>
            <a :href="selectedComp.enllac" target="_blank" class="text-primary hover-underline flex align-center gap-1 mt-1">
              Obrir link <i class="ti ti-external-link"></i>
            </a>
          </div>
        </div>

        <div v-if="selectedComp.comentaris" class="mt-2">
          <h4 class="font-bold mb-2">Comentaris de l'atleta</h4>
          <div class="bg-surface p-3 rounded border whitespace-pre-wrap text-sm">
            {{ selectedComp.comentaris }}
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Tancar" icon="ti ti-x" text @click="viewModalVisible = false" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.page-header {
  padding: 20px 24px;
}
.page-title {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
}

.filters-card {
  padding: 16px 24px;
}
.filters-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 16px;
  align-items: flex-end;
}
@media (max-width: 900px) {
  .filters-grid {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 500px) {
  .filters-grid {
    grid-template-columns: 1fr;
  }
}

.field {
  display: flex;
  flex-direction: column;
}
.field label {
  display: block;
  margin-bottom: 6px;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
}

/* Utils */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.align-center { align-items: center; }
.align-start { align-items: flex-start; }
.justify-between { justify-content: space-between; }
.gap-1 { gap: 4px; }
.gap-2 { gap: 8px; }
.gap-4 { gap: 16px; }
.mt-1 { margin-top: 4px; }
.mt-2 { margin-top: 8px; }
.mt-4 { margin-top: 16px; }
.mb-1 { margin-bottom: 4px; }
.mb-2 { margin-bottom: 8px; }
.m-0 { margin: 0; }
.w-full { width: 100%; }
.ml-2 { margin-left: 8px; }
.text-center { text-align: center; }
.text-sm { font-size: 0.875rem; }
.text-lg { font-size: 1.125rem; }
.font-bold { font-weight: 700; }
.text-secondary { color: var(--text-secondary); }
.text-muted { color: #9ca3af; }
.text-primary { color: var(--accent-primary); }
.bg-surface { background-color: var(--bg-surface); }
.border { border: 1px solid var(--border); }
.rounded { border-radius: var(--radius-sm); }
.p-0 { padding: 0; }
.p-3 { padding: 12px; }
.p-4 { padding: 16px; }
.overflow-hidden { overflow: hidden; }
.whitespace-pre-wrap { white-space: pre-wrap; }
.hover-underline:hover { text-decoration: underline; }

.grid { display: grid; }
.grid-cols-2 { grid-template-columns: repeat(2, 1fr); }

.detail-box {
  background: rgba(0,0,0,0.02);
  border: 1px solid var(--border);
  padding: 12px;
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.detail-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.detail-value {
  font-size: 1.1rem;
}

.distance-info {
  display: flex;
  align-items: baseline;
}
</style>
