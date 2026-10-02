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
  <div class="nutricio-layout">
    <Toast />

    <!-- Header Section -->
    <header class="header-section glass-card">
      <div class="header-title-box">
        <h1 class="page-title">
          <i class="ti ti-salad text-accent"></i> Preparació Nutricional
        </h1>
        <p class="subtitle">Disseny i seguiment dels plans de nutrició per competició i entrenament</p>
      </div>

      <div class="actions" v-if="authStore.isEntrenador">
        <Button label="Nou Pla Nutricional" icon="ti ti-plus" class="p-button-primary" @click="openNewPlanModal" />
      </div>
    </header>

    <!-- Filters Bar Card -->
    <div class="filters-bar glass-card">
      <div class="filter-group">
        <div class="search-input">
          <i class="ti ti-search"></i>
          <InputText v-model="searchQuery" placeholder="Cercar per títol o atleta..." />
        </div>

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
    <div v-if="loading" class="loading-state glass-card">
      <i class="ti ti-loader spin-icon text-accent"></i>
      <p>Carregant plans nutricionals...</p>
    </div>

    <div v-else-if="filteredPlans.length === 0" class="empty-state glass-card">
      <i class="ti ti-salad text-muted"></i>
      <p>No s'ha trobat cap pla nutricional.</p>
      <Button v-if="authStore.isEntrenador" label="Crear el primer pla" icon="ti ti-plus" class="mt-4" @click="openNewPlanModal" />
    </div>

    <div v-else class="plans-list">
      <div v-for="plan in filteredPlans" :key="plan.id" class="plan-card glass-card">
        <!-- Card Header -->
        <div class="plan-card-header">
          <div class="header-main">
            <div class="flex-row gap-3 align-center">
              <h2 class="plan-title">{{ plan.titol }}</h2>
              <Tag :severity="plan.estat === 'actiu' ? 'success' : 'secondary'" :value="plan.estat.toUpperCase()" />
            </div>
            <p class="plan-meta">
              <span v-if="authStore.isEntrenador">Atleta: <strong>{{ plan.atleta_nom }} {{ plan.atleta_cognoms }}</strong></span>
              <span v-else>Entrenador: <strong>{{ plan.entrenador_nom }}</strong></span>
              <span class="dot-separator">•</span>
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
              <h4><i class="ti ti-box text-accent"></i> Productes i Suplements Proposts</h4>
              <p class="whitespace-pre-line">{{ plan.revisions[0].productes_propostes }}</p>
            </div>

            <div class="details-box" v-if="plan.revisions[0].instruccions">
              <h4><i class="ti ti-notes text-accent"></i> Instruccions / Estratègia</h4>
              <p class="whitespace-pre-line">{{ plan.revisions[0].instruccions }}</p>
            </div>
          </div>

          <!-- Add Feedback button (Athlete or Trainer) -->
          <div class="button-right-wrapper">
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
        <div class="revisions-history">
          <Accordion :value="['0']" multiple>
            <AccordionPanel v-for="rev in plan.revisions" :key="rev.id" :value="`rev-${rev.id}`">
              <AccordionHeader>
                <div class="accordion-header-content">
                  <div class="rev-title-group">
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
                  <div v-else class="feedbacks-timeline">
                    <div v-for="fb in rev.feedbacks" :key="fb.id" class="feedback-card">
                      <div class="feedback-top">
                        <div class="fb-date">
                          <i class="ti ti-calendar"></i> {{ formatDate(fb.data_sortida) }}
                          <span v-if="fb.durada_hores"> ({{ fb.durada_hores }} hores)</span>
                        </div>
                        <div class="fb-atleta">
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

                      <div v-if="fb.productes_consumits" class="fb-products">
                        <strong>Productes consumits:</strong> {{ fb.productes_consumits }}
                      </div>

                      <div v-if="fb.sensacions" class="fb-sensations">
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

    <!-- Modal Nou Pla Nutricional (820px d'ample) -->
    <Dialog 
      v-model:visible="newPlanVisible" 
      modal 
      :style="{ width: '820px', maxWidth: '95vw' }" 
      class="nutricio-styled-dialog"
    >
      <template #header>
        <div class="dialog-header-custom">
          <div class="header-icon-box">
            <i class="ti ti-salad text-accent"></i>
          </div>
          <div>
            <h3 class="dialog-title">Crear Nou Pla Nutricional</h3>
            <p class="dialog-subtitle">Estableix els objectius horaris de nutrició, suplementació i seguiment</p>
          </div>
        </div>
      </template>

      <div class="styled-form-body">
        <!-- Secció 1: Dades Generals -->
        <div class="form-section-card">
          <div class="section-title">
            <i class="ti ti-id"></i> Informació Principal
          </div>

          <div class="form-grid-2">
            <div class="field" v-if="authStore.isEntrenador">
              <label>
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

            <div class="field" :class="{ 'grid-span-2': !authStore.isEntrenador }">
              <label>
                <i class="ti ti-file-text"></i> Títol del Pla <span class="required">*</span>
              </label>
              <InputText v-model="newPlanForm.titol" placeholder="Ex: Pla Nutrició - Marató de Barcelona" class="w-full" />
            </div>
          </div>
        </div>

        <!-- Secció 2: Target Macros per hora -->
        <div class="form-section-card">
          <div class="section-title">
            <i class="ti ti-target"></i> Objectius de Nutrició per Hora
          </div>

          <div class="form-grid-3">
            <div class="macro-input-box ch-box">
              <div class="macro-header">
                <span class="text-ch"><i class="ti ti-flame"></i> Carbohidrats</span>
                <span class="unit">g/h</span>
              </div>
              <InputNumber v-model="newPlanForm.objectiu_ch_g_h" :min="0" :max="150" suffix=" g/h" class="w-full" />
              <span class="helper-text">Recomanat: 30 - 90 g/h</span>
            </div>

            <div class="macro-input-box sodi-box">
              <div class="macro-header">
                <span class="text-sodi"><i class="ti ti-atom"></i> Sodi</span>
                <span class="unit">mg/h</span>
              </div>
              <InputNumber v-model="newPlanForm.objectiu_sodi_mg_h" :min="0" :max="2000" suffix=" mg/h" class="w-full" />
              <span class="helper-text">Recomanat: 300 - 800 mg/h</span>
            </div>

            <div class="macro-input-box fluid-box">
              <div class="macro-header">
                <span class="text-fluid"><i class="ti ti-droplet"></i> Hidratació</span>
                <span class="unit">ml/h</span>
              </div>
              <InputNumber v-model="newPlanForm.objectiu_fluid_ml_h" :min="0" :max="2000" suffix=" ml/h" class="w-full" />
              <span class="helper-text">Recomanat: 400 - 800 ml/h</span>
            </div>
          </div>
        </div>

        <!-- Secció 3: Suplementació i Recomanacions -->
        <div class="form-section-card">
          <div class="section-title">
            <i class="ti ti-checklist"></i> Proposta de Suplements i Estratègia
          </div>

          <div class="form-flex-col">
            <div class="field">
              <label><i class="ti ti-box"></i> Productes i Suplements Proposts</label>
              <Textarea 
                v-model="newPlanForm.productes_propostes" 
                rows="3" 
                placeholder="Ex: 1 Gel Maurten Hydrogel cada 30min (25g CH)&#10;1 Bidó 500ml amb 1 Pastilla de Sales (400mg Sodi)" 
                class="w-full" 
              />
            </div>

            <div class="field">
              <label><i class="ti ti-notes"></i> Instruccions i Protocol</label>
              <Textarea 
                v-model="newPlanForm.instruccions" 
                rows="3" 
                placeholder="Ex: Començar a beure des del minut 15. Prendre gel abans dels ascensos exigents..." 
                class="w-full" 
              />
            </div>
          </div>
        </div>

        <!-- Secció 4: Data de Revisió -->
        <div class="form-section-card">
          <div class="section-title">
            <i class="ti ti-calendar-event"></i> Calendari de Revisió
          </div>

          <div class="field">
            <label>Data de la Propera Revisió del Pla</label>
            <InputText type="date" v-model="newPlanForm.data_revisio" class="w-full" />
            <p class="info-note">
              <i class="ti ti-info-circle"></i> Quan s'assoleixi aquesta data es recomana actualitzar les quantitats o la proposta de productes.
            </p>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer-buttons">
          <Button label="Cancel·lar" icon="ti ti-x" text @click="newPlanVisible = false" />
          <Button label="Crear Pla Nutricional" icon="ti ti-check" class="p-button-primary" :loading="submitting" @click="handleCreatePlan" />
        </div>
      </template>
    </Dialog>

    <!-- Modal Nova Revisió (820px d'ample) -->
    <Dialog 
      v-model:visible="newRevisionVisible" 
      modal 
      :style="{ width: '820px', maxWidth: '95vw' }" 
      class="nutricio-styled-dialog"
    >
      <template #header>
        <div class="dialog-header-custom">
          <div class="header-icon-box">
            <i class="ti ti-refresh text-accent"></i>
          </div>
          <div>
            <h3 class="dialog-title">Nova Revisió del Pla</h3>
            <p class="dialog-subtitle">Actualitza els objectius i instruccions del pla existent</p>
          </div>
        </div>
      </template>

      <div class="styled-form-body">
        <div class="version-banner">
          <i class="ti ti-info-circle text-accent"></i>
          <span>Aquesta nova revisió crearà una nova versió al pla i conservarà l'històric i tots els registres anteriors.</span>
        </div>

        <!-- Target Macros -->
        <div class="form-section-card">
          <div class="section-title">
            <i class="ti ti-target"></i> Nous Objectius per Hora
          </div>

          <div class="form-grid-3">
            <div class="macro-input-box ch-box">
              <div class="macro-header">
                <span class="text-ch"><i class="ti ti-flame"></i> Carbohidrats</span>
                <span class="unit">g/h</span>
              </div>
              <InputNumber v-model="newRevisionForm.objectiu_ch_g_h" :min="0" :max="150" suffix=" g/h" class="w-full" />
            </div>

            <div class="macro-input-box sodi-box">
              <div class="macro-header">
                <span class="text-sodi"><i class="ti ti-atom"></i> Sodi</span>
                <span class="unit">mg/h</span>
              </div>
              <InputNumber v-model="newRevisionForm.objectiu_sodi_mg_h" :min="0" :max="2000" suffix=" mg/h" class="w-full" />
            </div>

            <div class="macro-input-box fluid-box">
              <div class="macro-header">
                <span class="text-fluid"><i class="ti ti-droplet"></i> Hidratació</span>
                <span class="unit">ml/h</span>
              </div>
              <InputNumber v-model="newRevisionForm.objectiu_fluid_ml_h" :min="0" :max="2000" suffix=" ml/h" class="w-full" />
            </div>
          </div>
        </div>

        <!-- Suplementació i Recomanacions -->
        <div class="form-section-card">
          <div class="section-title">
            <i class="ti ti-checklist"></i> Productes i Instruccions
          </div>

          <div class="form-flex-col">
            <div class="field">
              <label>Productes i Suplements Proposts</label>
              <Textarea v-model="newRevisionForm.productes_propostes" rows="3" class="w-full" />
            </div>

            <div class="field">
              <label>Instruccions / Estratègia</label>
              <Textarea v-model="newRevisionForm.instruccions" rows="3" class="w-full" />
            </div>
          </div>
        </div>

        <!-- Data de Revisió -->
        <div class="form-section-card">
          <div class="field">
            <label>Nova Data de Revisió Programada</label>
            <InputText type="date" v-model="newRevisionForm.data_revisio" class="w-full" />
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer-buttons">
          <Button label="Cancel·lar" icon="ti ti-x" text @click="newRevisionVisible = false" />
          <Button label="Guardar Nova Revisió" icon="ti ti-check" class="p-button-primary" :loading="submitting" @click="handleCreateRevision" />
        </div>
      </template>
    </Dialog>

    <!-- Modal Registrar Feedback / Sensacions (750px d'ample) -->
    <Dialog 
      v-model:visible="newFeedbackVisible" 
      modal 
      :style="{ width: '750px', maxWidth: '95vw' }" 
      class="nutricio-styled-dialog"
    >
      <template #header>
        <div class="dialog-header-custom">
          <div class="header-icon-box">
            <i class="ti ti-message-plus text-accent"></i>
          </div>
          <div>
            <h3 class="dialog-title">Registrar Entrenament i Sensacions</h3>
            <p class="dialog-subtitle">Introdueix els valors reals consumits i com t'has sentit</p>
          </div>
        </div>
      </template>

      <div class="styled-form-body">
        <div class="form-section-card">
          <div class="form-grid-2 mb-3">
            <div class="field">
              <label>Data de la Sortida <span class="required">*</span></label>
              <InputText type="date" v-model="newFeedbackForm.data_sortida" class="w-full" />
            </div>
            <div class="field">
              <label>Durada (hores)</label>
              <InputNumber v-model="newFeedbackForm.durada_hores" :min="0" :step="0.5" suffix=" hores" class="w-full" />
            </div>
          </div>

          <div class="field mb-3">
            <label>Productes Consumits</label>
            <Textarea v-model="newFeedbackForm.productes_consumits" rows="2" placeholder="Ex: 3 gells 226ers, 1 bidó 500ml isotònic..." class="w-full" />
          </div>

          <!-- Real macros achieved -->
          <div class="form-grid-3 mb-3">
            <div class="field">
              <label class="text-ch">CH Real (g/h)</label>
              <InputNumber v-model="newFeedbackForm.ch_g_h_real" :min="0" suffix=" g/h" class="w-full" />
            </div>
            <div class="field">
              <label class="text-sodi">Sodi Real (mg/h)</label>
              <InputNumber v-model="newFeedbackForm.sodi_mg_h_real" :min="0" suffix=" mg/h" class="w-full" />
            </div>
            <div class="field">
              <label class="text-fluid">Fluid Real (ml/h)</label>
              <InputNumber v-model="newFeedbackForm.fluid_ml_h_real" :min="0" suffix=" ml/h" class="w-full" />
            </div>
          </div>

          <div class="field">
            <label>Sensacions i Comentaris</label>
            <Textarea v-model="newFeedbackForm.sensacions" rows="3" placeholder="Sensacions d'estómac, assimilació de productes, fatiga..." class="w-full" />
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer-buttons">
          <Button label="Cancel·lar" icon="ti ti-x" text @click="newFeedbackVisible = false" />
          <Button label="Guardar Registre" icon="ti ti-check" class="p-button-primary" :loading="submitting" @click="handleAddFeedback" />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
/* Page Layout */
.nutricio-layout {
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  padding-bottom: 2rem;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.25rem;
  border-radius: var(--radius-lg);
  flex-wrap: wrap;
  gap: 1rem;
}

.page-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.subtitle {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0.25rem 0 0 0;
}

.filters-bar {
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
  border-radius: var(--radius-lg);
}

.filter-group {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 250px;
  position: relative;
}

.search-input i {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.search-input input {
  padding-left: 2.5rem;
  width: 100%;
}

.atleta-select {
  min-width: 240px;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 3rem;
  border-radius: var(--radius-lg);
  color: var(--text-secondary);
}

.empty-state i {
  font-size: 3.5rem;
  margin-bottom: 0.5rem;
}

.spin-icon {
  animation: spin 1s linear infinite;
  font-size: 2.5rem;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

/* Plan Card */
.plans-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.plan-card {
  padding: 1.5rem;
  border-radius: var(--radius-lg);
  background: var(--bg-card);
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
  color: var(--text-primary);
  margin: 0;
}

.plan-meta {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0.35rem 0 0 0;
}

.dot-separator {
  margin: 0 0.5rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Current Revision Box */
.current-revision-box {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1.25rem;
  margin-bottom: 1.25rem;
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
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text-primary);
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

/* Macros Target Grid */
.macros-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.25rem;
}

@media (max-width: 768px) {
  .macros-grid {
    grid-template-columns: 1fr;
  }
}

.macro-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 1rem;
  border-radius: var(--radius-md);
  background: var(--bg-base);
  border: 1px solid var(--border);
}

.macro-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  flex-shrink: 0;
}

.macro-icon.ch { background: rgba(217, 119, 6, 0.15); color: #d97706; }
.macro-icon.sodi { background: rgba(22, 163, 74, 0.15); color: #16a34a; }
.macro-icon.fluid { background: rgba(37, 99, 235, 0.15); color: #2563eb; }

.macro-info {
  display: flex;
  flex-direction: column;
}

.macro-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.macro-value {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-primary);
}

.macro-value small {
  font-size: 0.8rem;
  font-weight: 400;
  color: var(--text-secondary);
}

/* Details Grid */
.plan-details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

@media (max-width: 768px) {
  .plan-details-grid {
    grid-template-columns: 1fr;
  }
}

.details-box {
  background: var(--bg-base);
  border: 1px solid var(--border);
  padding: 1rem;
  border-radius: var(--radius-md);
}

.details-box h4 {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.details-box p {
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--text-primary);
  margin: 0;
  white-space: pre-line;
}

.button-right-wrapper {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
}

/* Accordion & History */
.accordion-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-right: 1rem;
}

.rev-title-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.rev-summary-bar {
  display: flex;
  gap: 1.5rem;
  padding: 0.6rem 1rem;
  background: var(--bg-base);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  border: 1px solid var(--border);
  margin-bottom: 0.75rem;
  color: var(--text-secondary);
}

.feedbacks-timeline {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.feedback-card {
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1rem;
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
  color: var(--text-primary);
}

.fb-atleta {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.fb-macros-real {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.real-pill {
  font-size: 0.8rem;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  padding: 3px 10px;
  border-radius: var(--radius-sm);
  color: var(--text-primary);
}

.fb-products {
  font-size: 0.875rem;
  margin-top: 0.35rem;
  color: var(--text-primary);
}

.fb-sensations {
  font-size: 0.875rem;
  font-style: italic;
  margin-top: 0.35rem;
  color: var(--text-secondary);
}

/* Styled Dialog Customization */
.dialog-header-custom {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.header-icon-box {
  width: 46px;
  height: 46px;
  border-radius: var(--radius-md);
  background: rgba(227, 0, 27, 0.1);
  border: 1px solid rgba(227, 0, 27, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  color: var(--accent-primary);
  flex-shrink: 0;
}

.dialog-title {
  margin: 0;
  font-weight: 700;
  font-size: 1.15rem;
  color: var(--text-primary);
}

.dialog-subtitle {
  margin: 0.2rem 0 0 0;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.styled-form-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 0.5rem 0;
}

.form-section-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1.25rem;
}

.section-title {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--accent-primary);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.form-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.25rem;
}

.grid-span-2 {
  grid-column: span 2;
}

.form-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.25rem;
}

@media (max-width: 768px) {
  .form-grid-2 {
    grid-template-columns: 1fr;
  }
  .form-grid-3 {
    grid-template-columns: 1fr;
  }
  .grid-span-2 {
    grid-column: span 1;
  }
}

.form-flex-col {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.macro-input-box {
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.macro-input-box :deep(.p-inputnumber) {
  width: 100%;
}

.macro-input-box :deep(.p-inputnumber-input) {
  width: 100%;
}

.macro-input-box.ch-box {
  border-left: 4px solid #d97706;
}

.macro-input-box.sodi-box {
  border-left: 4px solid #16a34a;
}

.macro-input-box.fluid-box {
  border-left: 4px solid #2563eb;
}

.macro-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
  font-size: 0.8rem;
}

.unit {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 400;
}

.text-ch { color: #d97706; }
.text-sodi { color: #16a34a; }
.text-fluid { color: #2563eb; }

.helper-text {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-style: italic;
}

.info-note {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin: 0.35rem 0 0 0;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.version-banner {
  background: rgba(227, 0, 27, 0.08);
  border: 1px solid rgba(227, 0, 27, 0.2);
  border-radius: var(--radius-md);
  padding: 0.85rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.85rem;
  color: var(--text-primary);
}

.dialog-footer-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 0.5rem;
}

.required {
  color: var(--accent-danger);
  font-weight: bold;
}

.whitespace-pre-line {
  white-space: pre-line;
}

.w-full {
  width: 100%;
}

.mb-3 {
  margin-bottom: 0.75rem;
}

.mt-4 {
  margin-top: 1rem;
}

.flex-row {
  display: flex;
  flex-direction: row;
}

.align-center {
  align-items: center;
}

.gap-3 {
  gap: 0.75rem;
}

.font-bold {
  font-weight: 700;
}

.text-xs {
  font-size: 0.75rem;
}

.text-sm {
  font-size: 0.875rem;
}

.text-muted {
  color: var(--text-muted);
}

.text-secondary {
  color: var(--text-secondary);
}

.text-accent {
  color: var(--accent-primary);
}
</style>
