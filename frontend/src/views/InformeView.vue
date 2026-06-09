<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/useAuthStore'
import { getAtletes, getInformeAtleta } from '@/api/entrenador'
import { getInformeMe } from '@/api/submissions'
import { useToast } from 'primevue/usetoast'
import type { InformeResponse } from '@/types'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'

const authStore = useAuthStore()
const toast = useToast()

const isEntrenador = computed(() => authStore.isEntrenador)
const loading = ref(false)
const informe = ref<InformeResponse | null>(null)

// Form fields
const atletes = ref<{ id: string; nom: string }[]>([])
const selectedAtletaID = ref<string>('')
const startDate = ref<Date | null>(null)
const endDate = ref<Date | null>(null)

// Initialize dates to last 30 days
onMounted(async () => {
  const dEnd = new Date()
  const dStart = new Date()
  dStart.setDate(dStart.getDate() - 30)
  startDate.value = dStart
  endDate.value = dEnd

  if (isEntrenador.value) {
    try {
      atletes.value = await getAtletes()
    } catch (e) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'Error carregant atletes', life: 3000 })
    }
  }
})

const formatDate = (d: Date) => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const formatDisplayDate = (dateStr: string) => {
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dateStr
}

const generateReport = async () => {
  if (!startDate.value || !endDate.value) {
    toast.add({ severity: 'warn', summary: 'Avís', detail: 'Has d\'escollir les dates d\'inici i fi', life: 3000 })
    return
  }
  if (isEntrenador.value && !selectedAtletaID.value) {
    toast.add({ severity: 'warn', summary: 'Avís', detail: 'Has de seleccionar un atleta', life: 3000 })
    return
  }

  const s = formatDate(startDate.value)
  const e = formatDate(endDate.value)
  
  loading.value = true
  informe.value = null
  try {
    if (isEntrenador.value) {
      informe.value = await getInformeAtleta(selectedAtletaID.value, s, e)
    } else {
      informe.value = await getInformeMe(s, e)
    }
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'ha pogut generar l\'informe', life: 3000 })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="informe-layout max-w-5xl mx-auto">
    <div class="page-header glass-card">
      <h1 class="page-title">Històric i Informes</h1>
      
      <div class="filters-bar mt-4">
        <div v-if="isEntrenador" class="filter-group">
          <label>Atleta</label>
          <Select 
            v-model="selectedAtletaID" 
            :options="atletes" 
            optionLabel="nom" 
            optionValue="id"
            placeholder="Selecciona un atleta" 
            class="w-full md:w-15rem"
          />
        </div>
        
        <div class="filter-group">
          <label>Data Inici</label>
          <DatePicker v-model="startDate" dateFormat="dd/mm/yy" showIcon />
        </div>
        
        <div class="filter-group">
          <label>Data Fi</label>
          <DatePicker v-model="endDate" dateFormat="dd/mm/yy" showIcon />
        </div>
        
        <div class="filter-group generate-btn-wrapper">
          <Button 
            label="Generar Informe" 
            icon="ti ti-report-analytics" 
            @click="generateReport" 
            :loading="loading" 
          />
        </div>
      </div>
    </div>

    <div v-if="informe" class="informe-content mt-6">
      <h2 class="section-title">Resum d'hores d'entrenament</h2>
      
      <div v-if="informe.resum_activitats.length === 0" class="empty-state glass-card">
        <i class="ti ti-chart-bar text-4xl mb-4 text-muted"></i>
        <p>No hi ha dades d'entrenament en aquest període.</p>
      </div>
      
      <div v-else class="resum-grid">
        <div 
          v-for="act in informe.resum_activitats" 
          :key="act.activitat_nom"
          class="resum-card glass-card"
          :style="{ borderTop: '4px solid ' + act.activitat_color }"
        >
          <i :class="['ti', act.activitat_icona]" :style="{ color: act.activitat_color }"></i>
          <div class="resum-info">
            <span class="act-nom">{{ act.activitat_nom }}</span>
            <span class="act-hores">{{ act.total_hores }} hores</span>
          </div>
        </div>
      </div>

      <h2 class="section-title mt-6">Detall dia a dia</h2>
      <div class="timeline glass-card p-4">
        <div v-if="informe.detall_per_dies.length === 0" class="text-muted text-center py-4">
          Sense registres.
        </div>
        
        <div v-for="dia in informe.detall_per_dies" :key="dia.data" class="timeline-day">
          <div class="day-date">{{ formatDisplayDate(dia.data) }}</div>
          <div class="day-slots">
            <div 
              v-for="slot in dia.slots" 
              :key="slot.id"
              class="timeline-slot"
              :style="{ borderLeftColor: slot.activitat_color }"
            >
              <div class="slot-time">Activitat {{ slot.ordre + 1 }}</div>
              <div class="slot-details">
                <div class="slot-title">
                  <i :class="['ti', slot.activitat_icona]" :style="{ color: slot.activitat_color }"></i>
                  <span class="font-medium">{{ slot.activitat_nom }}</span>
                  <span class="badge">{{ slot.durada_hores }}h</span>
                </div>
                <div v-if="slot.notes" class="slot-notes">
                  <i class="ti ti-message-circle"></i>
                  {{ slot.notes }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  padding: 24px;
}

.page-title {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
}

.mt-4 { margin-top: 16px; }
.mt-6 { margin-top: 32px; }
.p-4 { padding: 16px; }
.py-4 { padding-top: 16px; padding-bottom: 16px; }
.font-medium { font-weight: 500; }
.text-center { text-align: center; }

.filters-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-group label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.section-title {
  font-size: 1.25rem;
  margin: 0 0 16px 0;
  color: var(--text-primary);
}

.empty-state {
  padding: 40px;
  text-align: center;
}

.resum-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.resum-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  transition: transform var(--transition-fast);
}

.resum-card:hover {
  transform: translateY(-2px);
}

.resum-card i {
  font-size: 2.5rem;
}

.resum-info {
  display: flex;
  flex-direction: column;
}

.act-nom {
  font-size: 0.9rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.act-hores {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
}

/* Timeline */
.timeline {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.timeline-day {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.day-date {
  font-weight: 600;
  color: var(--accent-primary);
  border-bottom: 1px solid var(--border);
  padding-bottom: 4px;
  font-size: 1.1rem;
}

.day-slots {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.timeline-slot {
  display: flex;
  gap: 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-left: 4px solid transparent;
  border-radius: var(--radius-sm);
  padding: 12px 16px;
}

.slot-time {
  width: 70px;
  font-size: 0.8rem;
  text-transform: uppercase;
  color: var(--text-muted);
  font-weight: 600;
  padding-top: 2px;
}

.slot-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slot-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slot-title i {
  font-size: 1.25rem;
}

.badge {
  background: var(--bg-base);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.slot-notes {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  background: var(--bg-base);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
}

.slot-notes i {
  margin-top: 2px;
  color: var(--text-muted);
}

@media (max-width: 768px) {
  .filters-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-group {
    width: 100%;
  }
  
  .filter-group .p-datepicker, .filter-group .p-select {
    width: 100%;
  }
  
  .generate-btn-wrapper {
    margin-top: 8px;
  }
  
  .generate-btn-wrapper .p-button {
    width: 100%;
  }
  
  .resum-grid {
    grid-template-columns: 1fr;
  }
  
  .timeline-slot {
    flex-direction: column;
    gap: 8px;
  }
  
  .slot-time {
    width: 100%;
    border-bottom: 1px dashed var(--border);
    padding-bottom: 8px;
  }
}
</style>
