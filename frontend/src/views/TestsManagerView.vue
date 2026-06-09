<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getAtletes } from '@/api/entrenador'
import { useTestsStore } from '@/stores/useTestsStore'
import { createTest, traspassarTest, updateRecordatoriTest } from '@/api/tests'
import type { Atleta, CreateTestRequest } from '@/types'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'

const toast = useToast()
const testsStore = useTestsStore()
const atletes = ref<{ id: string; nom: string; email: string }[]>([])

const activeTab = ref<'pendents' | 'recordatoris'>('pendents')
const createDialogVisible = ref(false)
const isSubmitting = ref(false)

const form = ref<CreateTestRequest>({
  atleta_id: '',
  titol: '',
  data_test: '',
  comentaris: '',
  data_recordatori: ''
})

const dataTestObj = ref<Date | null>(null)
const dataRecordatoriObj = ref<Date | null>(null)
const resolentRecordatoriId = ref<string | null>(null)

const loadData = async () => {
  try {
    atletes.value = await getAtletes()
    await testsStore.loadData()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error carregant les dades' })
  }
}

onMounted(() => {
  loadData()
})

const openCreateModal = (recordatoriId?: string, atletaId?: string, oldTitol?: string) => {
  form.value = {
    atleta_id: atletaId || '',
    titol: oldTitol || '',
    data_test: '',
    comentaris: '',
    data_recordatori: ''
  }
  dataTestObj.value = new Date()
  dataRecordatoriObj.value = null
  resolentRecordatoriId.value = recordatoriId || null
  createDialogVisible.value = true
}

const submitCreate = async () => {
  if (!form.value.atleta_id || !form.value.titol || !dataTestObj.value) {
    toast.add({ severity: 'warn', summary: 'Avís', detail: 'Omple els camps obligatoris' })
    return
  }

  isSubmitting.value = true
  try {
    const tzOffset = dataTestObj.value.getTimezoneOffset() * 60000
    const localDateTest = new Date(dataTestObj.value.getTime() - tzOffset).toISOString().split('T')[0]
    
    let localDateRecordatori = ''
    if (dataRecordatoriObj.value) {
      const tzOffset2 = dataRecordatoriObj.value.getTimezoneOffset() * 60000
      localDateRecordatori = new Date(dataRecordatoriObj.value.getTime() - tzOffset2).toISOString().split('T')[0]
    }

    await createTest({
      ...form.value,
      data_test: localDateTest,
      data_recordatori: localDateRecordatori || undefined,
      comentaris: form.value.comentaris || undefined
    })

    // Si venim d'un recordatori, el tanquem
    if (resolentRecordatoriId.value) {
      await updateRecordatoriTest(resolentRecordatoriId.value, { estat: 'resolt' })
    }

    toast.add({ severity: 'success', summary: 'Test creat', detail: 'S\'ha afegit a la safata per planificar', life: 3000 })
    createDialogVisible.value = false
    testsStore.loadData()
    activeTab.value = 'pendents'
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.error || 'Error creant el test', life: 3000 })
  } finally {
    isSubmitting.value = false
  }
}

const handleTraspassar = async (testId: string) => {
  try {
    await traspassarTest(testId)
    toast.add({ severity: 'success', summary: 'Èxit', detail: 'Test programat al calendari', life: 3000 })
    testsStore.loadData() // actualitza la llista
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.error || 'Error al traspassar', life: 3000 })
  }
}

const handleCancelRecordatori = async (testId: string) => {
  try {
    await updateRecordatoriTest(testId, { estat: 'cancelat' })
    toast.add({ severity: 'success', summary: 'Cancel·lat', detail: 'S\'ha anul·lat el recordatori', life: 2000 })
    testsStore.loadData()
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.error || 'Error al cancel·lar', life: 3000 })
  }
}

const sortedPendents = computed(() => {
  return [...testsStore.pendingTests].sort((a, b) => new Date(a.data_test).getTime() - new Date(b.data_test).getTime())
})
</script>

<template>
  <div class="max-w-5xl mx-auto">
    <div class="page-header glass-card">
      <div>
        <h1 class="page-title">Tests i Avaluacions</h1>
        <p class="text-secondary mt-1">Programa proves de camp, testos FTP i gestiona els seus recordatoris periòdics.</p>
      </div>
      <Button label="Nou Test" icon="ti ti-plus" @click="openCreateModal()" />
    </div>

    <div class="tabs-container mt-6">
      <div class="tabs-header">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'pendents' }" 
          @click="activeTab = 'pendents'"
        >
          <i class="ti ti-calendar-plus"></i> Pendents de Programar
          <span class="badge" v-if="testsStore.pendingTests.length">{{ testsStore.pendingTests.length }}</span>
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'recordatoris' }" 
          @click="activeTab = 'recordatoris'"
        >
          <i class="ti ti-bell-ringing"></i> Recordatoris Actius
          <span class="badge" :class="{ urgent: testsStore.urgentRecordatorisCount > 0 }" v-if="testsStore.recordatoris.length">
            {{ testsStore.recordatoris.length }}
          </span>
        </button>
      </div>

      <div class="tab-content glass-card mt-4 p-4">
        
        <!-- PESTANYA: PENDENTS DE PROGRAMAR -->
        <div v-if="activeTab === 'pendents'">
          <div v-if="testsStore.loading" class="text-center py-6 text-secondary">
            <i class="ti ti-loader ti-spin text-2xl"></i>
          </div>
          <div v-else-if="sortedPendents.length === 0" class="empty-state text-center py-8">
            <i class="ti ti-clipboard-check text-4xl mb-4 text-muted"></i>
            <h3>No hi ha cap test pendent de programar</h3>
            <p class="text-secondary">Pots crear un nou test fent clic al botó de dalt a la dreta.</p>
          </div>
          <div v-else class="grid-list">
            <div v-for="t in sortedPendents" :key="t.id" class="list-card">
              <div class="card-left">
                <div class="card-icon"><i class="ti ti-clipboard-data text-accent"></i></div>
                <div>
                  <h3 class="card-title">{{ t.titol }}</h3>
                  <div class="card-meta">
                    <span class="meta-item"><i class="ti ti-user"></i> {{ t.atleta_nom }}</span>
                    <span class="meta-item"><i class="ti ti-calendar"></i> {{ new Date(t.data_test).toLocaleDateString('ca-ES') }}</span>
                  </div>
                  <p v-if="t.comentaris" class="text-sm text-secondary mt-2 line-clamp-2">{{ t.comentaris }}</p>
                </div>
              </div>
              <div class="card-actions">
                <Button label="Traspassar al calendari" icon="ti ti-arrow-right" severity="secondary" size="small" @click="handleTraspassar(t.id)" />
              </div>
            </div>
          </div>
        </div>

        <!-- PESTANYA: RECORDATORIS ACTIUS -->
        <div v-if="activeTab === 'recordatoris'">
          <div v-if="testsStore.loading" class="text-center py-6 text-secondary">
            <i class="ti ti-loader ti-spin text-2xl"></i>
          </div>
          <div v-else-if="testsStore.recordatoris.length === 0" class="empty-state text-center py-8">
            <i class="ti ti-bell-off text-4xl mb-4 text-muted"></i>
            <h3>No tens cap recordatori actiu</h3>
            <p class="text-secondary">A l'hora de crear un test, pots posar una data de recordatori pel proper.</p>
          </div>
          <div v-else class="grid-list">
            <div v-for="t in testsStore.recordatoris" :key="t.id" class="list-card" :class="{ 'is-urgent': testsStore.isUrgent(t.data_recordatori) }">
              <div class="card-left">
                <div class="card-icon warning-icon">
                  <i :class="testsStore.isUrgent(t.data_recordatori) ? 'ti ti-alert-triangle' : 'ti ti-bell'"></i>
                </div>
                <div>
                  <div class="flex align-items-center gap-2">
                    <h3 class="card-title">Re-avaluar: {{ t.titol }}</h3>
                    <span v-if="testsStore.isUrgent(t.data_recordatori)" class="badge urgent-badge">Vençut o Proper!</span>
                  </div>
                  <div class="card-meta mt-1">
                    <span class="meta-item"><i class="ti ti-user"></i> {{ t.atleta_nom }}</span>
                    <span class="meta-item">
                      <i class="ti ti-calendar-due"></i> 
                      Data prevista: {{ new Date(t.data_recordatori!).toLocaleDateString('ca-ES') }}
                    </span>
                  </div>
                  <p class="text-sm text-secondary mt-2">Test anterior realitzat el {{ new Date(t.data_test).toLocaleDateString('ca-ES') }}</p>
                </div>
              </div>
              <div class="card-actions flex-column align-end">
                <Button label="Nou Test" icon="ti ti-clipboard-plus" size="small" @click="openCreateModal(t.id, t.atleta_id, t.titol)" />
                <Button label="Cancel·lar Avís" icon="ti ti-x" text severity="danger" size="small" @click="handleCancelRecordatori(t.id)" class="mt-2" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Modal Crear Test -->
    <Dialog v-model:visible="createDialogVisible" modal header="Crear Test / Avaluació" :style="{ width: '600px' }">
      <div class="form-layout mt-2">
        
        <!-- Fila 1: Atleta -->
        <div class="field">
          <label>Atleta <span class="text-danger">*</span></label>
          <Select 
            v-model="form.atleta_id" 
            :options="atletes" 
            optionLabel="nom" 
            optionValue="id"
            placeholder="Selecciona l'atleta" 
            class="w-full"
            :disabled="!!resolentRecordatoriId"
          />
        </div>
        
        <!-- Fila 2: Títol -->
        <div class="field">
          <label>Títol del test <span class="text-danger">*</span></label>
          <InputText v-model="form.titol" class="w-full" placeholder="Ex: Test de Cooper" />
        </div>

        <!-- Fila 3: Dates -->
        <div class="dates-row">
          <div class="field w-half">
            <label>Data de realització <span class="text-danger">*</span></label>
            <DatePicker v-model="dataTestObj" dateFormat="dd/mm/yy" class="w-full" showIcon />
          </div>

          <div class="field w-half">
            <label>Proper recordatori (Opcional)</label>
            <DatePicker v-model="dataRecordatoriObj" dateFormat="dd/mm/yy" class="w-full" showIcon placeholder="Per ex. d'aquí a 3 mesos" />
          </div>
        </div>

        <!-- Fila 4: Comentaris -->
        <div class="field">
          <label>Comentaris o Instruccions</label>
          <Textarea v-model="form.comentaris" rows="3" class="w-full" placeholder="Què s'ha de fer en aquest test? Objectius?" />
        </div>
      </div>

      <template #footer>
        <Button label="Cancel·lar" icon="ti ti-x" text @click="createDialogVisible = false" />
        <Button label="Guardar" icon="ti ti-check" @click="submitCreate" :loading="isSubmitting" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.page-header {
  padding: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.page-title {
  margin: 0;
  font-size: 1.8rem;
  color: var(--text-primary);
}

.tabs-header {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 12px;
}
.tab-btn {
  background: none;
  border: none;
  padding: 12px 24px;
  color: var(--text-secondary);
  font-size: 1.1rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}
.tab-btn:hover {
  background: rgba(255, 255, 255, 0.05);
}
.tab-btn.active {
  color: var(--text-primary);
  background: var(--bg-hover);
  box-shadow: inset 0 -3px 0 var(--accent-primary);
}

.badge {
  background: var(--bg-surface);
  color: var(--text-secondary);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  border: 1px solid var(--border);
}
.badge.urgent {
  background: var(--accent-danger);
  color: white;
  border-color: transparent;
}
.urgent-badge {
  background: rgba(239, 68, 68, 0.2);
  color: var(--accent-danger);
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.grid-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.list-card {
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: transform 0.2s, box-shadow 0.2s;
}
.list-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
.list-card.is-urgent {
  border-left: 4px solid var(--accent-danger);
}

.card-left {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}
.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(99, 102, 241, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}
.warning-icon {
  background: rgba(239, 68, 68, 0.1);
  color: var(--accent-danger);
}
.card-title {
  margin: 0;
  font-size: 1.2rem;
  color: var(--text-primary);
}
.card-meta {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.card-actions {
  display: flex;
}
.flex-column {
  flex-direction: column;
}
.align-end {
  align-items: flex-end;
}
.flex { display: flex; }
.gap-2 { gap: 8px; }
.gap-4 { gap: 16px; }
.w-full { width: 100%; }
.w-half { flex: 1; }
.mt-1 { margin-top: 4px; }
.mt-2 { margin-top: 8px; }
.mt-4 { margin-top: 16px; }
.mt-6 { margin-top: 24px; }
.block { display: block; }
.form-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.dates-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.field label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary);
}
.text-danger { color: var(--accent-danger); }
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;  
  overflow: hidden;
}
</style>
