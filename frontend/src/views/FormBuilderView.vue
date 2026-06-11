<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { 
  getFormDetails, updateForm, cloneForm, 
  addFormQuestion, updateFormQuestion, deleteFormQuestion, reorderFormQuestions,
  type FormWithQuestions, type FormQuestion
} from '@/api/forms'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import InputSwitch from 'primevue/inputswitch'
import Select from 'primevue/select'
import Dialog from 'primevue/dialog'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { t } = useI18n()

const formId = route.params.id as string
const form = ref<FormWithQuestions | null>(null)
const loading = ref(true)

const isReadOnly = computed(() => !!form.value && form.value.responses_count > 0)

const loadForm = async () => {
  loading.value = true
  try {
    form.value = await getFormDetails(formId)
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'ha pogut carregar', life: 3000 })
    router.push('/entrenador/forms')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadForm()
})

const handleUpdateForm = async () => {
  if (!form.value || !form.value.titol) return
  try {
    await updateForm(form.value.id, {
      titol: form.value.titol,
      descripcio: form.value.descripcio,
      actiu: form.value.actiu
    })
    toast.add({ severity: 'success', summary: 'Guardat', detail: 'Informació actualitzada', life: 3000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'ha pogut guardar', life: 3000 })
  }
}

const cloneAndEdit = async () => {
  try {
    const res = await cloneForm(formId)
    toast.add({ severity: 'success', summary: 'Clonat', detail: 'Nova versió creada', life: 3000 })
    router.push(`/entrenador/forms/${res.id}/edit`)
    setTimeout(() => window.location.reload(), 100)
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'ha pogut clonar', life: 3000 })
  }
}

// Question Editor
const qModalVisible = ref(false)
const qModalTitle = ref('')
const qPayload = ref<Partial<FormQuestion>>({})
const qTypes = [
  { label: 'Text curt', value: 'text' },
  { label: 'Text llarg', value: 'textarea' },
  { label: 'Número', value: 'number' },
  { label: 'Desplegable (opcions)', value: 'select' },
  { label: 'Sí / No', value: 'boolean' }
]

const openNewQuestion = () => {
  if (isReadOnly.value) return
  qModalTitle.value = t('forms.addQuestion')
  qPayload.value = {
    pregunta: '',
    tipus: 'text',
    opcions: '',
    obligatori: true,
    ordre: form.value!.questions.length + 1
  }
  qModalVisible.value = true
}

const openEditQuestion = (q: FormQuestion) => {
  if (isReadOnly.value) return
  qModalTitle.value = t('forms.edit')
  qPayload.value = { ...q }
  qModalVisible.value = true
}

const saveQuestion = async () => {
  if (!qPayload.value.pregunta || !qPayload.value.tipus) return
  try {
    const p = {
      pregunta: qPayload.value.pregunta,
      tipus: qPayload.value.tipus,
      opcions: qPayload.value.opcions || null,
      obligatori: !!qPayload.value.obligatori,
      ordre: qPayload.value.ordre || 1
    }
    if (qPayload.value.id) {
      await updateFormQuestion(formId, qPayload.value.id, p)
    } else {
      await addFormQuestion(formId, p)
    }
    toast.add({ severity: 'success', summary: 'Guardat', detail: 'Pregunta guardada', life: 3000 })
    qModalVisible.value = false
    loadForm()
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.error || 'Error', life: 3000 })
  }
}

const deleteQuestion = async (qid: string) => {
  if (isReadOnly.value || !confirm('N\'estàs segur?')) return
  try {
    await deleteFormQuestion(formId, qid)
    toast.add({ severity: 'success', summary: 'Esborrat', detail: 'Pregunta esborrada', life: 3000 })
    loadForm()
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.error || 'Error', life: 3000 })
  }
}

const moveUp = async (index: number) => {
  if (isReadOnly.value || index === 0 || !form.value) return
  const current = form.value.questions[index]
  const prev = form.value.questions[index - 1]
  
  // Swap order locally
  const temp = current.ordre
  current.ordre = prev.ordre
  prev.ordre = temp
  
  // Send bulk update
  try {
    await reorderFormQuestions(formId, [
      { id: current.id, ordre: current.ordre },
      { id: prev.id, ordre: prev.ordre }
    ])
    loadForm()
  } catch(e) {
    loadForm() // rollback
  }
}

const moveDown = async (index: number) => {
  if (isReadOnly.value || !form.value || index === form.value.questions.length - 1) return
  const current = form.value.questions[index]
  const next = form.value.questions[index + 1]
  
  const temp = current.ordre
  current.ordre = next.ordre
  next.ordre = temp
  
  try {
    await reorderFormQuestions(formId, [
      { id: current.id, ordre: current.ordre },
      { id: next.id, ordre: next.ordre }
    ])
    loadForm()
  } catch(e) {
    loadForm()
  }
}
</script>

<template>
  <div class="form-builder max-w-4xl mx-auto">
    <div class="page-header glass-card mb-6">
      <div class="flex align-center gap-4">
        <Button icon="ti ti-arrow-left" text rounded aria-label="Tornar" @click="router.back()" />
        <h1 class="page-title">{{ $t('forms.builderTitle') }}</h1>
      </div>
    </div>

    <div v-if="loading" class="text-center py-8 text-secondary">
      <i class="ti ti-loader ti-spin text-3xl mb-2"></i>
      <p>{{ $t('forms.loading') }}</p>
    </div>

    <div v-else-if="form">
      <div v-if="isReadOnly" class="alert-box mb-6 bg-warning bg-opacity-10 border border-warning rounded-lg p-4 flex gap-4 align-start">
        <i class="ti ti-alert-triangle text-2xl text-warning"></i>
        <div>
          <h3 class="font-bold text-warning mb-1">Aquest formulari ja té respostes</h3>
          <p class="text-sm">No pots editar ni reordenar les preguntes d'un formulari que ja està en ús per evitar corrompre les dades recollides. Si vols fer canvis, clona'l per crear una nova versió (aquesta es desactivarà).</p>
          <Button label="Clonar i Crear Nova Versió" icon="ti ti-copy" class="mt-3" size="small" @click="cloneAndEdit" />
        </div>
      </div>

      <!-- Form General Details -->
      <div class="glass-card mb-6 p-6">
        <div class="flex justify-between align-center mb-4">
          <h2 class="text-xl font-semibold">Configuració General</h2>
          <Button :label="$t('forms.save')" icon="ti ti-device-floppy" @click="handleUpdateForm" />
        </div>
        
        <div class="flex flex-col gap-4">
          <div class="field">
            <label>{{ $t('forms.formTitle') }}</label>
            <InputText v-model="form.titol" class="w-full" />
          </div>
          <div class="field">
            <label>{{ $t('forms.formDescription') }}</label>
            <Textarea v-model="form.descripcio" rows="2" class="w-full" />
          </div>
          <div class="field flex align-center gap-3">
            <InputSwitch v-model="form.actiu" inputId="actiu-switch-edit" />
            <label for="actiu-switch-edit" class="mb-0">{{ $t('forms.active') }} (Visibilitat pública)</label>
          </div>
        </div>
      </div>

      <!-- Questions List -->
      <div class="glass-card p-6">
        <div class="flex justify-between align-center mb-4">
          <h2 class="text-xl font-semibold">Preguntes</h2>
          <Button :label="$t('forms.addQuestion')" icon="ti ti-plus" outlined @click="openNewQuestion" :disabled="isReadOnly" />
        </div>

        <div v-if="form.questions.length === 0" class="text-center py-6 text-secondary border rounded-lg border-dashed">
          Aquest formulari encara no té cap pregunta.
        </div>

        <div class="questions-list flex flex-col gap-3">
          <div v-for="(q, index) in form.questions" :key="q.id" class="question-item border rounded-lg p-4 flex gap-4 transition-all">
            <!-- Order controls -->
            <div class="flex flex-col gap-1 align-center justify-center border-r pr-4 opacity-50" :class="{ 'opacity-100': !isReadOnly }">
              <button class="icon-btn text-sm" @click="moveUp(index)" :disabled="isReadOnly || index === 0"><i class="ti ti-chevron-up"></i></button>
              <span class="text-xs font-mono">{{ index + 1 }}</span>
              <button class="icon-btn text-sm" @click="moveDown(index)" :disabled="isReadOnly || index === form.questions.length - 1"><i class="ti ti-chevron-down"></i></button>
            </div>
            
            <!-- Question info -->
            <div class="flex-1">
              <div class="flex align-center gap-2 mb-1">
                <span v-if="q.obligatori" class="text-danger">*</span>
                <h4 class="font-medium text-lg">{{ q.pregunta }}</h4>
                <span class="badge bg-secondary text-xs opacity-75">{{ qTypes.find(t => t.value === q.tipus)?.label || q.tipus }}</span>
              </div>
              <p v-if="q.opcions" class="text-sm text-secondary">Opcions: {{ q.opcions }}</p>
            </div>

            <!-- Actions -->
            <div class="flex gap-2 align-start">
              <Button icon="ti ti-edit" text rounded @click="openEditQuestion(q)" :disabled="isReadOnly" />
              <Button icon="ti ti-trash" text rounded severity="danger" @click="deleteQuestion(q.id)" :disabled="isReadOnly" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Question Modal -->
    <Dialog v-model:visible="qModalVisible" :header="qModalTitle" modal :style="{ width: '500px' }">
      <div class="flex flex-col gap-4 mt-2">
        <div class="field">
          <label>{{ $t('forms.question') }} *</label>
          <InputText v-model="qPayload.pregunta" class="w-full" autofocus />
        </div>
        <div class="field">
          <label>{{ $t('forms.type') }} *</label>
          <Select v-model="qPayload.tipus" :options="qTypes" optionLabel="label" optionValue="value" class="w-full" />
        </div>
        <div v-if="qPayload.tipus === 'select'" class="field">
          <label>{{ $t('forms.options') }} *</label>
          <InputText v-model="qPayload.opcions" class="w-full" placeholder="Opció A, Opció B, Opció C" />
        </div>
        <div class="field flex align-center gap-3 mt-2">
          <InputSwitch v-model="qPayload.obligatori" inputId="obligatori-switch" />
          <label for="obligatori-switch" class="mb-0">{{ $t('forms.required') }}</label>
        </div>
      </div>
      <template #footer>
        <Button :label="$t('forms.cancel')" icon="ti ti-x" text @click="qModalVisible = false" />
        <Button :label="$t('forms.save')" icon="ti ti-check" @click="saveQuestion" />
      </template>
    </Dialog>

  </div>
</template>

<style scoped>
.question-item {
  background: var(--bg-surface);
}
.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
}
.icon-btn:hover:not(:disabled) {
  color: var(--accent-primary);
}
.icon-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.page-header {
  padding: 20px 24px;
}

.page-title {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
}

/* Local utilities for layout */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-1 { flex: 1; }
.gap-1 { gap: 4px; }
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.gap-4 { gap: 16px; }
.mt-2 { margin-top: 8px; }
.mb-0 { margin-bottom: 0 !important; }
.mb-1 { margin-bottom: 4px; }
.mb-4 { margin-bottom: 16px; }
.mb-6 { margin-bottom: 24px; }
.w-full { width: 100%; }
.align-center { align-items: center; }
.align-start { align-items: flex-start; }
.justify-between { justify-content: space-between; }
.justify-center { justify-content: center; }
.text-sm { font-size: 0.875rem; }
.text-lg { font-size: 1.125rem; }
.text-xl { font-size: 1.25rem; }
.text-2xl { font-size: 1.5rem; }
.text-secondary { color: var(--text-secondary); }
.text-warning { color: var(--accent-warning); }
.text-danger { color: var(--accent-danger); }
.font-bold { font-weight: 700; }
.font-semibold { font-weight: 600; }
.font-medium { font-weight: 500; }
.font-mono { font-family: monospace; }
.p-4 { padding: 16px; }
.p-6 { padding: 24px; }
.py-6 { padding-top: 24px; padding-bottom: 24px; }
.py-8 { padding-top: 32px; padding-bottom: 32px; }
.border { border: 1px solid var(--border); }
.border-b { border-bottom: 1px solid var(--border); }
.border-r { border-right: 1px solid var(--border); }
.border-dashed { border-style: dashed; }
.rounded-lg { border-radius: var(--radius-lg); }
.opacity-50 { opacity: 0.5; }
.opacity-75 { opacity: 0.75; }
.opacity-100 { opacity: 1; }
.transition-all { transition: all var(--transition-fast); }

.bg-warning { background-color: var(--accent-warning); }
.bg-opacity-10 { background-color: rgba(234, 179, 8, 0.1); }

.field {
  display: flex;
  flex-direction: column;
}
.field label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
}
</style>
