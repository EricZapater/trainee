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
  <div class="nutricio-layout max-w-7xl mx-auto">
    <Toast />

    <!-- Header Card -->
    <div class="header-section glass-card flex justify-between align-center p-4 mb-4 border-round">
      <div>
        <h1 class="page-title m-0 text-primary" style="font-size: 1.8rem; font-weight: 700;">
          <i class="ti ti-salad text-accent mr-2"></i> Preparació Nutricional
        </h1>
        <p class="subtitle m-0 text-secondary text-sm mt-1">Disseny i seguiment dels plans de nutrició per competició i entrenament</p>
      </div>

      <div class="actions" v-if="authStore.isEntrenador">
        <Button label="Nou Pla Nutricional" icon="ti ti-plus" class="p-button-primary" @click="openNewPlanModal" />
      </div>
    </div>

    <!-- Filters Bar Card -->
    <div class="filters-bar glass-card p-4 mb-4 border-round">
      <div class="filter-group flex gap-4 align-center flex-wrap">
        <span class="p-input-icon-left search-input flex-1">
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
    <div v-if="loading" class="loading-state glass-card p-6 text-center border-round">
      <i class="ti ti-loader spin-icon text-accent" style="font-size: 2.5rem"></i>
      <p class="mt-2 text-secondary">Carregant plans nutricionals...</p>
    </div>

    <div v-else-if="filteredPlans.length === 0" class="empty-state glass-card p-6 text-center border-round">
      <i class="ti ti-salad text-secondary" style="font-size: 3.5rem"></i>
      <p class="mt-2 text-secondary font-medium">No s'ha trobat cap pla nutricional.</p>
      <Button v-if="authStore.isEntrenador" label="Crear el primer pla" icon="ti ti-plus" class="mt-4" @click="openNewPlanModal" />
    </div>

    <div v-else class="plans-list space-y-6">
      <div v-for="plan in filteredPlans" :key="plan.id" class="plan-card glass-card p-5 border-round mb-4">
        <!-- Card Header -->
        <div class="plan-card-header flex justify-between align-center mb-4 flex-wrap gap-3">
          <div class="header-main">
            <div class="flex align-center gap-3">
              <h2 class="plan-title text-xl font-bold m-0 text-primary">{{ plan.titol }}</h2>
              <Tag :severity="plan.estat === 'actiu' ? 'success' : 'secondary'" :value="plan.estat.toUpperCase()" />
            </div>
            <p class="plan-meta text-xs text-secondary mt-1 m-0">
              <span v-if="authStore.isEntrenador">Atleta: <strong class="text-primary">{{ plan.atleta_nom }} {{ plan.atleta_cognoms }}</strong></span>
              <span v-else>Entrenador: <strong class="text-primary">{{ plan.entrenador_nom }}</strong></span>
              <span class="mx-2">•</span>
              <span>Creat: {{ formatDate(plan.created_at) }}</span>
            </p>
          </div>

          <div class="header-actions flex align-center gap-2">
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
        <div v-if="plan.revisions && plan.revisions.length > 0" class="current-revision-box p-4 border-round mb-4">
          <div class="revision-header flex justify-between align-center mb-3 flex-wrap gap-2">
            <div class="badge-versio flex align-center gap-2 font-bold text-primary">
              <i class="ti ti-shield-check text-accent text-lg"></i>
              <span>Versió {{ plan.revisions[0].versio }} (Actual)</span>
            </div>

            <div v-if="plan.revisions[0].data_revisio" class="revision-date-tag text-xs flex align-center gap-1" :class="{ overdue: isRevisionOverdueOrToday(plan.revisions[0].data_revisio) }">
              <i class="ti ti-calendar-event"></i>
              <span>Propera revisió: <strong>{{ formatDate(plan.revisions[0].data_revisio) }}</strong></span>
              <span v-if="isRevisionOverdueOrToday(plan.revisions[0].data_revisio)" class="revisio-alert"> (Revisió pendent!)</span>
            </div>
          </div>

          <!-- Macros Target Cards -->
          <div class="macros-grid grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div class="macro-card flex align-center gap-3 p-3 border-round">
              <div class="macro-icon ch"><i class="ti ti-flame"></i></div>
              <div class="macro-info flex flex-col">
                <span class="macro-label text-xs text-secondary font-semibold">Carbohidrats</span>
                <span class="macro-value text-xl font-bold text-primary">{{ plan.revisions[0].objectiu_ch_g_h ?? '-' }} <small class="text-xs text-secondary font-normal">g/h</small></span>
              </div>
            </div>

            <div class="macro-card flex align-center gap-3 p-3 border-round">
              <div class="macro-icon sodi"><i class="ti ti-atom"></i></div>
              <div class="macro-info flex flex-col">
                <span class="macro-label text-xs text-secondary font-semibold">Sodi</span>
                <span class="macro-value text-xl font-bold text-primary">{{ plan.revisions[0].objectiu_sodi_mg_h ?? '-' }} <small class="text-xs text-secondary font-normal">mg/h</small></span>
              </div>
            </div>

            <div class="macro-card flex align-center gap-3 p-3 border-round">
              <div class="macro-icon fluid"><i class="ti ti-droplet"></i></div>
              <div class="macro-info flex flex-col">
                <span class="macro-label text-xs text-secondary font-semibold">Hidratació</span>
                <span class="macro-value text-xl font-bold text-primary">{{ plan.revisions[0].objectiu_fluid_ml_h ?? '-' }} <small class="text-xs text-secondary font-normal">ml/h</small></span>
              </div>
            </div>
          </div>

          <!-- Products & Instructions -->
          <div class="plan-details-grid grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="details-box p-3 border-round" v-if="plan.revisions[0].productes_propostes">
              <h4 class="m-0 mb-2 text-xs font-bold text-secondary flex align-center gap-2">
                <i class="ti ti-box text-accent"></i> Productes i Suplements Proposts
              </h4>
              <p class="whitespace-pre-line m-0 text-sm leading-relaxed text-primary">{{ plan.revisions[0].productes_propostes }}</p>
            </div>

            <div class="details-box p-3 border-round" v-if="plan.revisions[0].instruccions">
              <h4 class="m-0 mb-2 text-xs font-bold text-secondary flex align-center gap-2">
                <i class="ti ti-notes text-accent"></i> Instruccions / Estratègia
              </h4>
              <p class="whitespace-pre-line m-0 text-sm leading-relaxed text-primary">{{ plan.revisions[0].instruccions }}</p>
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
        <div class="revisions-history mt-4">
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
                  <div class="rev-summary-bar flex gap-4 p-2 border-round text-xs mb-3">
                    <span><strong>CH:</strong> {{ rev.objectiu_ch_g_h ?? '-' }} g/h</span>
                    <span><strong>Sodi:</strong> {{ rev.objectiu_sodi_mg_h ?? '-' }} mg/h</span>
                    <span><strong>Fluid:</strong> {{ rev.objectiu_fluid_ml_h ?? '-' }} ml/h</span>
                  </div>

                  <!-- Feedbacks List for this revision -->
                  <div v-if="!rev.feedbacks || rev.feedbacks.length === 0" class="no-feedbacks py-2">
                    <p class="text-sm text-secondary italic m-0">Cap registre o comentari introduït en aquesta versió.</p>
                  </div>
                  <div v-else class="feedbacks-timeline space-y-3 mt-3">
                    <div v-for="fb in rev.feedbacks" :key="fb.id" class="feedback-card p-3 border-round mb-2">
                      <div class="feedback-top flex justify-between align-center mb-2">
                        <div class="fb-date font-semibold text-sm">
                          <i class="ti ti-calendar mr-1"></i> {{ formatDate(fb.data_sortida) }}
                          <span v-if="fb.durada_hores"> ({{ fb.durada_hores }} hores)</span>
                        </div>
                        <div class="fb-atleta text-xs text-secondary">
                          Per {{ fb.atleta_nom || 'Atleta' }}
                        </div>
                      </div>

                      <!-- Real macros compared to target -->
                      <div class="fb-macros-real flex gap-2 flex-wrap mb-2">
                        <span class="real-pill text-xs px-2 py-1 border-round" v-if="fb.ch_g_h_real !== undefined">
                          CH Real: <strong>{{ fb.ch_g_h_real }}</strong> g/h
                        </span>
                        <span class="real-pill text-xs px-2 py-1 border-round" v-if="fb.sodi_mg_h_real !== undefined">
                          Sodi Real: <strong>{{ fb.sodi_mg_h_real }}</strong> mg/h
                        </span>
                        <span class="real-pill text-xs px-2 py-1 border-round" v-if="fb.fluid_ml_h_real !== undefined">
                          Fluid Real: <strong>{{ fb.fluid_ml_h_real }}</strong> ml/h
                        </span>
                      </div>

                      <div v-if="fb.productes_consumits" class="fb-products text-sm">
                        <strong>Productes consumits:</strong> {{ fb.productes_consumits }}
                      </div>

                      <div v-if="fb.sensacions" class="fb-sensations mt-1 text-sm italic text-secondary">
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

    <!-- Modal Nou Pla Nutricional (Molt més maco i estructurat) -->
    <Dialog 
      v-model:visible="newPlanVisible" 
      modal 
      :style="{ width: '650px', maxWidth: '95vw' }" 
      class="nutricio-styled-dialog"
    >
      <template #header>
        <div class="dialog-header-custom flex align-center gap-3">
          <div class="header-icon-box flex align-center justify-center">
            <i class="ti ti-salad text-2xl text-accent"></i>
          </div>
          <div>
            <h3 class="m-0 font-bold text-lg text-primary">Crear Nou Pla Nutricional</h3>
            <p class="m-0 text-xs text-secondary">Estableix els objectius horaris de nutrició, suplementació i seguiment</p>
          </div>
        </div>
      </template>

      <div class="styled-form-body flex flex-col gap-5 py-2">
        <!-- Secció 1: Dades Generals -->
        <div class="form-section-card p-4 border-round">
          <div class="section-title text-xs font-bold uppercase tracking-wider text-accent mb-3 flex align-center gap-2">
            <i class="ti ti-id"></i> Informació Principal
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="field flex flex-col gap-1.5" v-if="authStore.isEntrenador">
              <label class="text-xs font-semibold text-secondary flex align-center gap-1">
                <i class="ti ti-user"></i> Atleta <span class="required">*</span>
              </label>
              <Select 
                v-model="newPlanForm.atleta_id" 
                :options="atletaOptions" 
                optionLabel="label" 
                optionValue="value" 
                placeholder="Selecciona atleta" 
                filter 
                class="w-full" 
              />
            </div>

            <div class="field flex flex-col gap-1.5" :class="{ 'md:col-span-2': !authStore.isEntrenador }">
              <label class="text-xs font-semibold text-secondary flex align-center gap-1">
                <i class="ti ti-file-text"></i> Títol del Pla <span class="required">*</span>
              </label>
              <InputText v-model="newPlanForm.titol" placeholder="Ex: Pla de Nutrició - Marató de Barcelona" class="w-full" />
            </div>
          </div>
        </div>

        <!-- Secció 2: Target Macros per hora -->
        <div class="form-section-card p-4 border-round">
          <div class="section-title text-xs font-bold uppercase tracking-wider text-accent mb-3 flex align-center gap-2">
            <i class="ti ti-target"></i> Objectius de Nutrició per Hora
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="macro-input-box ch-box p-3 border-round flex flex-col gap-2">
              <div class="flex align-center justify-between">
                <span class="text-xs font-bold text-warning flex align-center gap-1">
                  <i class="ti ti-flame"></i> Carbohidrats
                </span>
                <span class="text-xs text-secondary">g/h</span>
              </div>
              <InputNumber v-model="newPlanForm.objectiu_ch_g_h" :min="0" :max="150" suffix=" g/h" class="w-full custom-num-input" />
              <span class="text-xs text-secondary italic">Recomanat: 30 - 90 g/h</span>
            </div>

            <div class="macro-input-box sodi-box p-3 border-round flex flex-col gap-2">
              <div class="flex align-center justify-between">
                <span class="text-xs font-bold text-emerald-400 flex align-center gap-1">
                  <i class="ti ti-atom"></i> Sodi
                </span>
                <span class="text-xs text-secondary">mg/h</span>
              </div>
              <InputNumber v-model="newPlanForm.objectiu_sodi_mg_h" :min="0" :max="2000" suffix=" mg/h" class="w-full custom-num-input" />
              <span class="text-xs text-secondary italic">Recomanat: 300 - 800 mg/h</span>
            </div>

            <div class="macro-input-box fluid-box p-3 border-round flex flex-col gap-2">
              <div class="flex align-center justify-between">
                <span class="text-xs font-bold text-blue-400 flex align-center gap-1">
                  <i class="ti ti-droplet"></i> Hidratació
                </span>
                <span class="text-xs text-secondary">ml/h</span>
              </div>
              <InputNumber v-model="newPlanForm.objectiu_fluid_ml_h" :min="0" :max="2000" suffix=" ml/h" class="w-full custom-num-input" />
              <span class="text-xs text-secondary italic">Recomanat: 400 - 800 ml/h</span>
            </div>
          </div>
        </div>

        <!-- Secció 3: Suplementació i Recomanacions -->
        <div class="form-section-card p-4 border-round">
          <div class="section-title text-xs font-bold uppercase tracking-wider text-accent mb-3 flex align-center gap-2">
            <i class="ti ti-checklist"></i> Proposta de Suplements i Estratègia
          </div>

          <div class="flex flex-col gap-4">
            <div class="field flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-secondary flex align-center gap-1">
                <i class="ti ti-box"></i> Productes i Suplements Proposts
              </label>
              <Textarea 
                v-model="newPlanForm.productes_propostes" 
                rows="3" 
                placeholder="Ex: 1 Gel Maurten Hydrogel cada 30min (25g CH)&#10;1 Bidó 500ml amb 1 Pastilla de Sales (400mg Sodi)" 
                class="w-full" 
              />
            </div>

            <div class="field flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-secondary flex align-center gap-1">
                <i class="ti ti-notes"></i> Instruccions i Protocol
              </label>
              <Textarea 
                v-model="newPlanForm.instruccions" 
                rows="3" 
                placeholder="Ex: Començar a beure des del minut 15. Prendre gel abans dels ascensos exigents. Si fa molta calor augmentar ingesta de fluid." 
                class="w-full" 
              />
            </div>
          </div>
        </div>

        <!-- Secció 4: Data de Revisió -->
        <div class="form-section-card p-4 border-round">
          <div class="section-title text-xs font-bold uppercase tracking-wider text-accent mb-2 flex align-center gap-2">
            <i class="ti ti-calendar-event"></i> Calendari de Revisió
          </div>

          <div class="field flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-secondary">Data de la Propera Revisió del Pla</label>
            <InputText type="date" v-model="newPlanForm.data_revisio" class="w-full" />
            <p class="text-xs text-secondary m-0 mt-1 flex align-center gap-1">
              <i class="ti ti-info-circle"></i> Quan s'assoleixi aquesta data es recomana actualitzar les quantitats o la proposta de productes.
            </p>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2 pt-2 border-t border-white/10">
          <Button label="Cancel·lar" icon="ti ti-x" text @click="newPlanVisible = false" />
          <Button label="Crear Pla Nutricional" icon="ti ti-check" class="p-button-primary" :loading="submitting" @click="handleCreatePlan" />
        </div>
      </template>
    </Dialog>

    <!-- Modal Nova Revisió -->
    <Dialog 
      v-model:visible="newRevisionVisible" 
      modal 
      :style="{ width: '650px', maxWidth: '95vw' }" 
      class="nutricio-styled-dialog"
    >
      <template #header>
        <div class="dialog-header-custom flex align-center gap-3">
          <div class="header-icon-box flex align-center justify-center">
            <i class="ti ti-refresh text-2xl text-accent"></i>
          </div>
          <div>
            <h3 class="m-0 font-bold text-lg text-primary">Nova Revisió del Pla</h3>
            <p class="m-0 text-xs text-secondary">Actualitza els objectius i instruccions del pla existent</p>
          </div>
        </div>
      </template>

      <div class="styled-form-body flex flex-col gap-5 py-2">
        <!-- Banner informatiu versió -->
        <div class="version-banner p-3 border-round flex align-center gap-3">
          <i class="ti ti-info-circle text-accent text-xl"></i>
          <span class="text-xs text-secondary">
            Aquesta nova revisió crearà una nova versió al pla i conservarà l'històric i tots els registres anteriors.
          </span>
        </div>

        <!-- Target Macros -->
        <div class="form-section-card p-4 border-round">
          <div class="section-title text-xs font-bold uppercase tracking-wider text-accent mb-3 flex align-center gap-2">
            <i class="ti ti-target"></i> Nous Objectius per Hora
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="macro-input-box ch-box p-3 border-round flex flex-col gap-2">
              <span class="text-xs font-bold text-warning flex align-center gap-1">
                <i class="ti ti-flame"></i> Carbohidrats
              </span>
              <InputNumber v-model="newRevisionForm.objectiu_ch_g_h" :min="0" :max="150" suffix=" g/h" class="w-full custom-num-input" />
            </div>

            <div class="macro-input-box sodi-box p-3 border-round flex flex-col gap-2">
              <span class="text-xs font-bold text-emerald-400 flex align-center gap-1">
                <i class="ti ti-atom"></i> Sodi
              </span>
              <InputNumber v-model="newRevisionForm.objectiu_sodi_mg_h" :min="0" :max="2000" suffix=" mg/h" class="w-full custom-num-input" />
            </div>

            <div class="macro-input-box fluid-box p-3 border-round flex flex-col gap-2">
              <span class="text-xs font-bold text-blue-400 flex align-center gap-1">
                <i class="ti ti-droplet"></i> Hidratació
              </span>
              <InputNumber v-model="newRevisionForm.objectiu_fluid_ml_h" :min="0" :max="2000" suffix=" ml/h" class="w-full custom-num-input" />
            </div>
          </div>
        </div>

        <!-- Suplementació i Recomanacions -->
        <div class="form-section-card p-4 border-round">
          <div class="section-title text-xs font-bold uppercase tracking-wider text-accent mb-3 flex align-center gap-2">
            <i class="ti ti-checklist"></i> Productes i Instruccions
          </div>

          <div class="flex flex-col gap-4">
            <div class="field flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-secondary">Productes i Suplements Proposts</label>
              <Textarea v-model="newRevisionForm.productes_propostes" rows="3" class="w-full" />
            </div>

            <div class="field flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-secondary">Instruccions / Estratègia</label>
              <Textarea v-model="newRevisionForm.instruccions" rows="3" class="w-full" />
            </div>
          </div>
        </div>

        <!-- Data de Revisió -->
        <div class="form-section-card p-4 border-round">
          <div class="field flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-secondary">Nova Data de Revisió Programada</label>
            <InputText type="date" v-model="newRevisionForm.data_revisio" class="w-full" />
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2 pt-2 border-t border-white/10">
          <Button label="Cancel·lar" icon="ti ti-x" text @click="newRevisionVisible = false" />
          <Button label="Guardar Nova Revisió" icon="ti ti-check" class="p-button-primary" :loading="submitting" @click="handleCreateRevision" />
        </div>
      </template>
    </Dialog>

    <!-- Modal Registrar Feedback / Sensacions -->
    <Dialog 
      v-model:visible="newFeedbackVisible" 
      modal 
      :style="{ width: '600px', maxWidth: '95vw' }" 
      class="nutricio-styled-dialog"
    >
      <template #header>
        <div class="dialog-header-custom flex align-center gap-3">
          <div class="header-icon-box flex align-center justify-center">
            <i class="ti ti-message-plus text-2xl text-accent"></i>
          </div>
          <div>
            <h3 class="m-0 font-bold text-lg text-primary">Registrar Entrenament i Sensacions</h3>
            <p class="m-0 text-xs text-secondary">Introdueix els valors reals consumits i com t'has sentit</p>
          </div>
        </div>
      </template>

      <div class="styled-form-body flex flex-col gap-4 py-2">
        <div class="form-section-card p-4 border-round">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div class="field flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-secondary">Data de la Sortida <span class="required">*</span></label>
              <InputText type="date" v-model="newFeedbackForm.data_sortida" class="w-full" />
            </div>
            <div class="field flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-secondary">Durada (hores)</label>
              <InputNumber v-model="newFeedbackForm.durada_hores" :min="0" :step="0.5" suffix=" hores" class="w-full" />
            </div>
          </div>

          <div class="field flex flex-col gap-1.5 mb-3">
            <label class="text-xs font-semibold text-secondary">Productes Consumits</label>
            <Textarea v-model="newFeedbackForm.productes_consumits" rows="2" placeholder="Ex: 3 gells 226ers, 1 bidó 500ml isotònic..." class="w-full" />
          </div>

          <!-- Real macros achieved -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div class="field flex flex-col gap-1">
              <label class="text-xs font-semibold text-warning">CH Real (g/h)</label>
              <InputNumber v-model="newFeedbackForm.ch_g_h_real" :min="0" suffix=" g/h" class="w-full" />
            </div>
            <div class="field flex flex-col gap-1">
              <label class="text-xs font-semibold text-emerald-400">Sodi Real (mg/h)</label>
              <InputNumber v-model="newFeedbackForm.sodi_mg_h_real" :min="0" suffix=" mg/h" class="w-full" />
            </div>
            <div class="field flex flex-col gap-1">
              <label class="text-xs font-semibold text-blue-400">Fluid Real (ml/h)</label>
              <InputNumber v-model="newFeedbackForm.fluid_ml_h_real" :min="0" suffix=" ml/h" class="w-full" />
            </div>
          </div>

          <div class="field flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-secondary">Sensacions i Comentaris</label>
            <Textarea v-model="newFeedbackForm.sensacions" rows="3" placeholder="Sensacions d'estómac, assimilació de productes, fatiga..." class="w-full" />
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2 pt-2 border-t border-white/10">
          <Button label="Cancel·lar" icon="ti ti-x" text @click="newFeedbackVisible = false" />
          <Button label="Guardar Registre" icon="ti ti-check" class="p-button-primary" :loading="submitting" @click="handleAddFeedback" />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.nutricio-layout {
  width: 100%;
}

.search-input {
  min-width: 240px;
}

.atleta-select {
  width: 250px;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

.current-revision-box {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.revision-date-tag.overdue {
  color: var(--accent-danger);
  font-weight: bold;
}

.revisio-alert {
  color: var(--accent-danger);
  font-weight: bold;
}

.macro-card {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.macro-icon {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.macro-icon.ch { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.macro-icon.sodi { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.macro-icon.fluid { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }

.details-box {
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.rev-summary-bar {
  background: rgba(255, 255, 255, 0.03);
}

.feedback-card {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.real-pill {
  background: rgba(255, 255, 255, 0.06);
}

.required {
  color: var(--accent-danger);
}

.whitespace-pre-line {
  white-space: pre-line;
}

/* Styled Dialog Customization */
.header-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.form-section-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.07);
}

.macro-input-box {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.macro-input-box.ch-box {
  border-left: 3px solid #f59e0b;
}

.macro-input-box.sodi-box {
  border-left: 3px solid #10b981;
}

.macro-input-box.fluid-box {
  border-left: 3px solid #3b82f6;
}

.version-banner {
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.2);
}
</style>
