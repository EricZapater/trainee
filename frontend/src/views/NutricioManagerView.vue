<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import Accordion from 'primevue/accordion'
import AccordionPanel from 'primevue/accordionpanel'
import AccordionHeader from 'primevue/accordionheader'
import AccordionContent from 'primevue/accordioncontent'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores/useAuthStore'
import { getAtletes } from '@/api/entrenador'
import {
  getNutricioPlans,
  createNutricioPlan,
  createNutricioRevision,
  addNutricioFeedback,
  updateNutricioPlanEstat,
  deleteNutricioPlan,
  type NutricioPlanWithDetails,
  type NutricioRevision,
  type CreateNutricioPlanRequest,
  type CreateNutricioRevisionRequest,
  type CreateNutricioFeedbackRequest
} from '@/api/nutricio'

const authStore = useAuthStore()
const toast = useToast()

const loading = ref(false)
const submitting = ref(false)
const plans = ref<NutricioPlanWithDetails[]>([])
const atletes = ref<{ id: string; nom: string; cognoms: string; email: string }[]>([])
const selectedAtletaFilter = ref<string | null>(null)
const searchQuery = ref('')

// Dialog states
const newPlanVisible = ref(false)
const newRevisionVisible = ref(false)
const newFeedbackVisible = ref(false)

const selectedPlanForRevision = ref<NutricioPlanWithDetails | null>(null)
const selectedRevisionForFeedback = ref<NutricioRevision | null>(null)

// Forms
const newPlanForm = ref<CreateNutricioPlanRequest>({
  atleta_id: '',
  titol: '',
  objectiu_ch_g_h: undefined,
  objectiu_sodi_mg_h: undefined,
  objectiu_fluid_ml_h: undefined,
  productes_propostes: '',
  instruccions: '',
  data_revisio: ''
})

const newRevisionForm = ref<CreateNutricioRevisionRequest>({
  objectiu_ch_g_h: undefined,
  objectiu_sodi_mg_h: undefined,
  objectiu_fluid_ml_h: undefined,
  productes_propostes: '',
  instruccions: '',
  data_revisio: ''
})

const newFeedbackForm = ref<CreateNutricioFeedbackRequest>({
  data_sortida: new Date().toISOString().split('T')[0],
  durada_hores: undefined,
  productes_consumits: '',
  ch_g_h_real: undefined,
  sodi_mg_h_real: undefined,
  fluid_ml_h_real: undefined,
  sensacions: ''
})

const loadData = async () => {
  loading.value = true
  try {
    const plansData = await getNutricioPlans()
    plans.value = plansData

    if (authStore.isEntrenador) {
      const atletesData = await getAtletes()
      atletes.value = atletesData
    }
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'han pogut carregar els plans nutricionals', life: 3000 })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

const atletaOptions = computed(() => {
  return atletes.value.map(a => ({
    label: `${a.nom} ${a.cognoms || ''}`.trim(),
    value: a.id
  }))
})

const filteredPlans = computed(() => {
  return plans.value.filter(p => {
    if (selectedAtletaFilter.value && p.atleta_id !== selectedAtletaFilter.value) {
      return false
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      const titleMatch = p.titol.toLowerCase().includes(q)
      const atletaMatch = (p.atleta_nom || '').toLowerCase().includes(q) || (p.atleta_cognoms || '').toLowerCase().includes(q)
      if (!titleMatch && !atletaMatch) return false
    }
    return true
  })
})

const openNewPlanModal = () => {
  newPlanForm.value = {
    atleta_id: atletes.value.length > 0 ? atletes.value[0].id : '',
    titol: '',
    objectiu_ch_g_h: 60,
    objectiu_sodi_mg_h: 500,
    objectiu_fluid_ml_h: 500,
    productes_propostes: '',
    instruccions: '',
    data_revisio: ''
  }
  newPlanVisible.value = true
}

const handleCreatePlan = async () => {
  if (!newPlanForm.value.atleta_id || !newPlanForm.value.titol.trim()) {
    toast.add({ severity: 'warn', summary: 'Atenció', detail: 'Camp d\'atleta i títol són obligatoris', life: 3000 })
    return
  }

  submitting.value = true
  try {
    await createNutricioPlan(newPlanForm.value)
    toast.add({ severity: 'success', summary: 'Èxit', detail: 'Pla nutricional creat correctament', life: 3000 })
    newPlanVisible.value = false
    await loadData()
  } catch (e: any) {
    const errorMsg = e.response?.data?.error || 'Error al crear el pla nutricional'
    toast.add({ severity: 'error', summary: 'Error', detail: errorMsg, life: 3000 })
  } finally {
    submitting.value = false
  }
}

const openNewRevisionModal = (plan: NutricioPlanWithDetails) => {
  selectedPlanForRevision.value = plan
  const lastRev = plan.revisions && plan.revisions.length > 0 ? plan.revisions[0] : null
  newRevisionForm.value = {
    objectiu_ch_g_h: lastRev?.objectiu_ch_g_h,
    objectiu_sodi_mg_h: lastRev?.objectiu_sodi_mg_h,
    objectiu_fluid_ml_h: lastRev?.objectiu_fluid_ml_h,
    productes_propostes: lastRev?.productes_propostes || '',
    instruccions: lastRev?.instruccions || '',
    data_revisio: ''
  }
  newRevisionVisible.value = true
}

const handleCreateRevision = async () => {
  if (!selectedPlanForRevision.value) return

  submitting.value = true
  try {
    await createNutricioRevision(selectedPlanForRevision.value.id, newRevisionForm.value)
    toast.add({ severity: 'success', summary: 'Èxit', detail: 'Nova revisió del pla creada correctament', life: 3000 })
    newRevisionVisible.value = false
    await loadData()
  } catch (e: any) {
    const errorMsg = e.response?.data?.error || 'Error al crear la revisió'
    toast.add({ severity: 'error', summary: 'Error', detail: errorMsg, life: 3000 })
  } finally {
    submitting.value = false
  }
}

const openNewFeedbackModal = (rev: NutricioRevision) => {
  selectedRevisionForFeedback.value = rev
  newFeedbackForm.value = {
    data_sortida: new Date().toISOString().split('T')[0],
    durada_hores: 2,
    productes_consumits: '',
    ch_g_h_real: rev.objectiu_ch_g_h,
    sodi_mg_h_real: rev.objectiu_sodi_mg_h,
    fluid_ml_h_real: rev.objectiu_fluid_ml_h,
    sensacions: ''
  }
  newFeedbackVisible.value = true
}

const handleAddFeedback = async () => {
  if (!selectedRevisionForFeedback.value) return
  if (!newFeedbackForm.value.data_sortida) {
    toast.add({ severity: 'warn', summary: 'Atenció', detail: 'La data de sortida és obligatòria', life: 3000 })
    return
  }

  submitting.value = true
  try {
    await addNutricioFeedback(selectedRevisionForFeedback.value.id, newFeedbackForm.value)
    toast.add({ severity: 'success', summary: 'Èxit', detail: 'Registre nutricional afegit correctament', life: 3000 })
    newFeedbackVisible.value = false
    await loadData()
  } catch (e: any) {
    const errorMsg = e.response?.data?.error || 'Error al registrar les sensacions'
    toast.add({ severity: 'error', summary: 'Error', detail: errorMsg, life: 3000 })
  } finally {
    submitting.value = false
  }
}

const handleTogglePlanEstat = async (plan: NutricioPlanWithDetails) => {
  const nouEstat = plan.estat === 'actiu' ? 'inactiu' : 'actiu'
  try {
    await updateNutricioPlanEstat(plan.id, nouEstat)
    toast.add({ severity: 'success', summary: 'Estat actualitzat', detail: `El pla ara està ${nouEstat}`, life: 3000 })
    await loadData()
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'ha pogut actualitzar l\'estat', life: 3000 })
  }
}

const handleDeletePlan = async (plan: NutricioPlanWithDetails) => {
  if (!confirm(`Segur que vols eliminar el pla "${plan.titol}"?`)) return
  try {
    await deleteNutricioPlan(plan.id)
    toast.add({ severity: 'success', summary: 'Pla eliminat', detail: 'El pla nutricional s\'ha eliminat', life: 3000 })
    await loadData()
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'ha pogut eliminar el pla', life: 3000 })
  }
}

const isRevisionOverdueOrToday = (dataRevisio?: string) => {
  if (!dataRevisio) return false
  const today = new Date().toISOString().split('T')[0]
  return dataRevisio <= today
}

const formatDate = (dStr?: string) => {
  if (!dStr) return '-'
  const parts = dStr.split('T')[0].split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dStr
}
</script>

<template>
  <div class="nutricio-container">
    <Toast />

    <header class="page-header">
      <div>
        <h1><i class="ti ti-salad text-accent"></i> Preparació Nutricional</h1>
        <p class="subtitle">Disseny i seguiment dels plans de nutrició per competició i entrenament</p>
      </div>

      <div class="actions" v-if="authStore.isEntrenador">
        <Button label="Nou Pla Nutricional" icon="ti ti-plus" class="p-button-primary" @click="openNewPlanModal" />
      </div>
    </header>

    <!-- Filters Bar -->
    <div class="filters-bar glass-card">
      <div class="filter-group">
        <span class="p-input-icon-left search-input">
          <i class="ti ti-search"></i>
          <InputText v-model="searchQuery" placeholder="Cercar per títol o atleta..." class="w-full" />
        </span>

        <Select
          v-if="authStore.isEntrenador"
          v-model="selectedAtletaFilter"
          :options="atletaOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Tots els atletes"
          showClear
          filter
          class="atleta-select"
        />
      </div>
    </div>

    <!-- Content Section -->
    <div v-if="loading" class="loading-state">
      <i class="ti ti-loader spin-icon" style="font-size: 2rem"></i>
      <p>Carregant plans nutricionals...</p>
    </div>

    <div v-else-if="filteredPlans.length === 0" class="empty-state glass-card">
      <i class="ti ti-salad" style="font-size: 3rem"></i>
      <p>No s'ha trobat cap pla nutricional.</p>
      <Button v-if="authStore.isEntrenador" label="Crear el primer pla" icon="ti ti-plus" class="mt-4" @click="openNewPlanModal" />
    </div>

    <div v-else class="plans-list space-y-6">
      <div v-for="plan in filteredPlans" :key="plan.id" class="plan-card glass-card">
        <!-- Card Header -->
        <div class="plan-card-header">
          <div class="header-main">
            <div class="flex align-center gap-3">
              <h2 class="plan-title">{{ plan.titol }}</h2>
              <Tag :severity="plan.estat === 'actiu' ? 'success' : 'secondary'" :value="plan.estat.toUpperCase()" />
            </div>
            <p class="plan-meta">
              <span v-if="authStore.isEntrenador">Atleta: <strong>{{ plan.atleta_nom }} {{ plan.atleta_cognoms }}</strong></span>
              <span v-else>Entrenador: <strong>{{ plan.entrenador_nom }}</strong></span>
              <span class="mx-2">•</span>
              <span>Creat: {{ formatDate(plan.created_at) }}</span>
            </p>
          </div>

          <div class="header-actions">
            <template v-if="authStore.isEntrenador">
              <Button
                v-if="plan.estat === 'actiu'"
                label="Nova Revisió"
                icon="ti ti-refresh"
                class="p-button-sm p-button-outlined p-button-accent"
                @click="openNewRevisionModal(plan)"
              />
              <Button
                :label="plan.estat === 'actiu' ? 'Desactivar' : 'Activar'"
                :icon="plan.estat === 'actiu' ? 'ti ti-pause' : 'ti ti-play'"
                class="p-button-sm p-button-text"
                @click="handleTogglePlanEstat(plan)"
              />
              <Button
                icon="ti ti-trash"
                class="p-button-sm p-button-text p-button-danger"
                @click="handleDeletePlan(plan)"
              />
            </template>
          </div>
        </div>

        <!-- Current Revision details -->
        <div v-if="plan.revisions && plan.revisions.length > 0" class="current-revision-box">
          <div class="revision-header">
            <div class="badge-versio">
              <i class="ti ti-shield-check text-accent"></i>
              <span>Versió {{ plan.revisions[0].versio }} (Actual)</span>
            </div>

            <div v-if="plan.revisions[0].data_revisio" class="revision-date-tag" :class="{ overdue: isRevisionOverdueOrToday(plan.revisions[0].data_revisio) }">
              <i class="ti ti-calendar-event"></i>
              <span>Propera revisió: <strong>{{ formatDate(plan.revisions[0].data_revisio) }}</strong></span>
              <span v-if="isRevisionOverdueOrToday(plan.revisions[0].data_revisio)" class="revisio-alert"> (Revisió pendent!)</span>
            </div>
          </div>

          <!-- Macros Target Cards -->
          <div class="macros-grid">
            <div class="macro-card">
              <div class="macro-icon ch"><i class="ti ti-flame"></i></div>
              <div class="macro-info">
                <span class="macro-label">Carbohidrats</span>
                <span class="macro-value">{{ plan.revisions[0].objectiu_ch_g_h ?? '-' }} <small>g/h</small></span>
              </div>
            </div>

            <div class="macro-card">
              <div class="macro-icon sodi"><i class="ti ti-atom"></i></div>
              <div class="macro-info">
                <span class="macro-label">Sodi</span>
                <span class="macro-value">{{ plan.revisions[0].objectiu_sodi_mg_h ?? '-' }} <small>mg/h</small></span>
              </div>
            </div>

            <div class="macro-card">
              <div class="macro-icon fluid"><i class="ti ti-droplet"></i></div>
              <div class="macro-info">
                <span class="macro-label">Hidratació</span>
                <span class="macro-value">{{ plan.revisions[0].objectiu_fluid_ml_h ?? '-' }} <small>ml/h</small></span>
              </div>
            </div>
          </div>

          <!-- Products & Instructions -->
          <div class="plan-details-grid">
            <div class="details-box" v-if="plan.revisions[0].productes_propostes">
              <h4><i class="ti ti-box"></i> Productes i Suplements Proposts</h4>
              <p class="whitespace-pre-line">{{ plan.revisions[0].productes_propostes }}</p>
            </div>

            <div class="details-box" v-if="plan.revisions[0].instruccions">
              <h4><i class="ti ti-notes"></i> Instruccions / Estratègia</h4>
              <p class="whitespace-pre-line">{{ plan.revisions[0].instruccions }}</p>
            </div>
          </div>

          <!-- Add Feedback button (Athlete or Trainer) -->
          <div class="mt-4 flex justify-end">
            <Button
              v-if="plan.estat === 'actiu'"
              label="Registrar Entrenament / Sensacions"
              icon="ti ti-message-plus"
              class="p-button-accent p-button-sm"
              @click="openNewFeedbackModal(plan.revisions[0])"
            />
          </div>
        </div>

        <!-- History of Revisions and Feedbacks -->
        <div class="revisions-history mt-6">
          <Accordion :value="['0']" multiple>
            <AccordionPanel v-for="rev in plan.revisions" :key="rev.id" :value="`rev-${rev.id}`">
              <AccordionHeader>
                <div class="flex align-center justify-between w-full pr-4">
                  <div class="flex align-center gap-2">
                    <i class="ti ti-history text-secondary"></i>
                    <span class="font-bold">Versió {{ rev.versio }}</span>
                    <span class="text-xs text-secondary">({{ formatDate(rev.created_at) }})</span>
                  </div>
                  <Tag severity="info" :value="`${rev.feedbacks?.length || 0} registres de l'atleta`" />
                </div>
              </AccordionHeader>
              <AccordionContent>
                <div class="history-content">
                  <div class="rev-summary-bar">
                    <span><strong>CH:</strong> {{ rev.objectiu_ch_g_h ?? '-' }} g/h</span>
                    <span><strong>Sodi:</strong> {{ rev.objectiu_sodi_mg_h ?? '-' }} mg/h</span>
                    <span><strong>Fluid:</strong> {{ rev.objectiu_fluid_ml_h ?? '-' }} ml/h</span>
                  </div>

                  <!-- Feedbacks List for this revision -->
                  <div v-if="!rev.feedbacks || rev.feedbacks.length === 0" class="no-feedbacks">
                    <p class="text-sm text-secondary italic">Cap registre o comentari introduït en aquesta versió.</p>
                  </div>
                  <div v-else class="feedbacks-timeline space-y-3 mt-3">
                    <div v-for="fb in rev.feedbacks" :key="fb.id" class="feedback-card">
                      <div class="feedback-top">
                        <div class="fb-date">
                          <i class="ti ti-calendar"></i> {{ formatDate(fb.data_sortida) }}
                          <span v-if="fb.durada_hores"> ({{ fb.durada_hores }} hores)</span>
                        </div>
                        <div class="fb-atleta text-xs text-secondary">
                          Per {{ fb.atleta_nom || 'Atleta' }}
                        </div>
                      </div>

                      <!-- Real macros compared to target -->
                      <div class="fb-macros-real">
                        <span class="real-pill" v-if="fb.ch_g_h_real !== undefined">
                          CH Real: <strong>{{ fb.ch_g_h_real }}</strong> g/h
                        </span>
                        <span class="real-pill" v-if="fb.sodi_mg_h_real !== undefined">
                          Sodi Real: <strong>{{ fb.sodi_mg_h_real }}</strong> mg/h
                        </span>
                        <span class="real-pill" v-if="fb.fluid_ml_h_real !== undefined">
                          Fluid Real: <strong>{{ fb.fluid_ml_h_real }}</strong> ml/h
                        </span>
                      </div>

                      <div v-if="fb.productes_consumits" class="fb-products mt-2 text-sm">
                        <strong>Productes consumits:</strong> {{ fb.productes_consumits }}
                      </div>

                      <div v-if="fb.sensacions" class="fb-sensations mt-2 text-sm italic">
                        "{{ fb.sensacions }}"
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>
      </div>
    </div>

    <!-- Modal Nou Pla Nutricional -->
    <Dialog v-model:visible="newPlanVisible" header="Crear Nou Pla Nutricional" modal :style="{ width: '550px', maxWidth: '95vw' }">
      <div class="dialog-form flex flex-col gap-4 mt-2">
        <div class="field" v-if="authStore.isEntrenador">
          <label>Atleta <span class="required">*</span></label>
          <Select v-model="newPlanForm.atleta_id" :options="atletaOptions" optionLabel="label" optionValue="value" placeholder="Selecciona atleta" filter class="w-full" />
        </div>

        <div class="field">
          <label>Títol del Pla <span class="required">*</span></label>
          <InputText v-model="newPlanForm.titol" placeholder="Ex: Pla de Carrera Marató de Barcelona" class="w-full" />
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div class="field">
            <label>Objectiu CH (g/h)</label>
            <InputNumber v-model="newPlanForm.objectiu_ch_g_h" :min="0" class="w-full" />
          </div>
          <div class="field">
            <label>Sodi (mg/h)</label>
            <InputNumber v-model="newPlanForm.objectiu_sodi_mg_h" :min="0" class="w-full" />
          </div>
          <div class="field">
            <label>Hidratació (ml/h)</label>
            <InputNumber v-model="newPlanForm.objectiu_fluid_ml_h" :min="0" class="w-full" />
          </div>
        </div>

        <div class="field">
          <label>Productes Proposts</label>
          <Textarea v-model="newPlanForm.productes_propostes" rows="3" placeholder="Ex: 1 Gel Maurten Hydrogel cada 30min, Isotònic 500ml/h..." class="w-full" />
        </div>

        <div class="field">
          <label>Instruccions / Estratègia</label>
          <Textarea v-model="newPlanForm.instruccions" rows="3" placeholder="Començar a beure des del minut 15, prendre cafè al km 30..." class="w-full" />
        </div>

        <div class="field">
          <label>Data de Propera Revisió</label>
          <InputText type="date" v-model="newPlanForm.data_revisio" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel·lar" icon="ti ti-x" text @click="newPlanVisible = false" />
        <Button label="Crear Pla" icon="ti ti-check" :loading="submitting" @click="handleCreatePlan" />
      </template>
    </Dialog>

    <!-- Modal Nova Revisió -->
    <Dialog v-model:visible="newRevisionVisible" header="Crear Nova Revisió del Pla" modal :style="{ width: '550px', maxWidth: '95vw' }">
      <div class="dialog-form flex flex-col gap-4 mt-2">
        <p class="text-sm text-secondary">
          Aquesta nova revisió guardarà la versió actual a l'històric i aplicarà els nous paràmetres i instruccions.
        </p>

        <div class="grid grid-cols-3 gap-3">
          <div class="field">
            <label>Objectiu CH (g/h)</label>
            <InputNumber v-model="newRevisionForm.objectiu_ch_g_h" :min="0" class="w-full" />
          </div>
          <div class="field">
            <label>Sodi (mg/h)</label>
            <InputNumber v-model="newRevisionForm.objectiu_sodi_mg_h" :min="0" class="w-full" />
          </div>
          <div class="field">
            <label>Hidratació (ml/h)</label>
            <InputNumber v-model="newRevisionForm.objectiu_fluid_ml_h" :min="0" class="w-full" />
          </div>
        </div>

        <div class="field">
          <label>Productes Proposts</label>
          <Textarea v-model="newRevisionForm.productes_propostes" rows="3" class="w-full" />
        </div>

        <div class="field">
          <label>Instruccions / Estratègia</label>
          <Textarea v-model="newRevisionForm.instruccions" rows="3" class="w-full" />
        </div>

        <div class="field">
          <label>Nova Data de Revisió</label>
          <InputText type="date" v-model="newRevisionForm.data_revisio" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel·lar" icon="ti ti-x" text @click="newRevisionVisible = false" />
        <Button label="Guardar Nova Revisió" icon="ti ti-check" :loading="submitting" @click="handleCreateRevision" />
      </template>
    </Dialog>

    <!-- Modal Registrar Feedback / Sensacions -->
    <Dialog v-model:visible="newFeedbackVisible" header="Registrar Entrenament i Sensacions" modal :style="{ width: '550px', maxWidth: '95vw' }">
      <div class="dialog-form flex flex-col gap-4 mt-2">
        <div class="grid grid-cols-2 gap-3">
          <div class="field">
            <label>Data de la Sortida <span class="required">*</span></label>
            <InputText type="date" v-model="newFeedbackForm.data_sortida" class="w-full" />
          </div>
          <div class="field">
            <label>Durada (hores)</label>
            <InputNumber v-model="newFeedbackForm.durada_hores" :min="0" :step="0.5" class="w-full" />
          </div>
        </div>

        <div class="field">
          <label>Productes Consumits</label>
          <Textarea v-model="newFeedbackForm.productes_consumits" rows="2" placeholder="Ex: 3 gells 226ers, 1 bidó 500ml isotònic..." class="w-full" />
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div class="field">
            <label>CH Real (g/h)</label>
            <InputNumber v-model="newFeedbackForm.ch_g_h_real" :min="0" class="w-full" />
          </div>
          <div class="field">
            <label>Sodi Real (mg/h)</label>
            <InputNumber v-model="newFeedbackForm.sodi_mg_h_real" :min="0" class="w-full" />
          </div>
          <div class="field">
            <label>Fluid Real (ml/h)</label>
            <InputNumber v-model="newFeedbackForm.fluid_ml_h_real" :min="0" class="w-full" />
          </div>
        </div>

        <div class="field">
          <label>Sensacions i Comentaris</label>
          <Textarea v-model="newFeedbackForm.sensacions" rows="3" placeholder="Sensacions d'estómac, assimilació de productes, fatiga..." class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel·lar" icon="ti ti-x" text @click="newFeedbackVisible = false" />
        <Button label="Guardar Registre" icon="ti ti-check" :loading="submitting" @click="handleAddFeedback" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.nutricio-container {
  max-width: 1100px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.page-header h1 {
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.subtitle {
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.filters-bar {
  padding: 1rem;
  margin-bottom: 1.5rem;
  border-radius: var(--radius-md);
}

.filter-group {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 240px;
}

.atleta-select {
  width: 250px;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 3rem;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

.plan-card {
  padding: 1.5rem;
  border-radius: var(--radius-lg);
  margin-bottom: 1.5rem;
}

.plan-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.plan-title {
  font-size: 1.35rem;
  font-weight: 700;
  margin: 0;
}

.plan-meta {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.current-revision-box {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-md);
  padding: 1.25rem;
}

.revision-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.badge-versio {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.95rem;
}

.revision-date-tag {
  font-size: 0.85rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.revision-date-tag.overdue {
  color: var(--accent-danger);
  font-weight: bold;
}

.revisio-alert {
  color: var(--accent-danger);
  font-weight: bold;
}

.macros-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.macro-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  padding: 0.75rem 1rem;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.macro-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.macro-icon.ch { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.macro-icon.sodi { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.macro-icon.fluid { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }

.macro-info {
  display: flex;
  flex-direction: column;
}

.macro-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.macro-value {
  font-size: 1.2rem;
  font-weight: 700;
}

.plan-details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.details-box {
  background: rgba(0, 0, 0, 0.15);
  padding: 0.85rem 1rem;
  border-radius: var(--radius-sm);
}

.details-box h4 {
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.details-box p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.4;
}

.rev-summary-bar {
  display: flex;
  gap: 1.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 6px;
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
}

.feedback-card {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-sm);
  padding: 0.85rem 1rem;
}

.feedback-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.fb-date {
  font-weight: 600;
  font-size: 0.9rem;
}

.fb-macros-real {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.real-pill {
  font-size: 0.8rem;
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 8px;
  border-radius: 4px;
}

.required {
  color: var(--accent-danger);
}

.whitespace-pre-line {
  white-space: pre-line;
}
</style>
