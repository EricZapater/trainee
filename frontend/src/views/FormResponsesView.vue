<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { getFormResponses, updateResponseStatus, getFormDetails, type FormResponseWithAnswers, type FormWithQuestions } from '@/api/forms'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Dialog from 'primevue/dialog'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { t } = useI18n()

const formId = route.params.id as string
const responses = ref<FormResponseWithAnswers[]>([])
const formDetails = ref<FormWithQuestions | null>(null)
const loading = ref(true)

const loadData = async () => {
  loading.value = true
  try {
    responses.value = await getFormResponses(formId)
    try {
      formDetails.value = await getFormDetails(formId)
    } catch(e) {}
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'han pogut carregar les respostes', life: 3000 })
    router.push('/entrenador/forms')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

const statusOptions = [
  { label: 'Pendent', value: 'pendent' },
  { label: 'Contactat', value: 'contactat' },
  { label: 'Acceptat', value: 'acceptat' },
  { label: 'Descartat', value: 'descartat' }
]

const changeStatus = async (responseId: string, estat: string) => {
  try {
    await updateResponseStatus(responseId, estat)
    toast.add({ severity: 'success', summary: 'Estat canviat', detail: 'S\'ha guardat l\'estat', life: 3000 })
    const item = responses.value.find(r => r.id === responseId)
    if (item) item.estat = estat as any
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'ha pogut actualitzar', life: 3000 })
  }
}

const selectedResponse = ref<FormResponseWithAnswers | null>(null)
const viewModalVisible = ref(false)

const viewAnswers = (r: FormResponseWithAnswers) => {
  selectedResponse.value = r
  viewModalVisible.value = true
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pendent': return 'bg-warning text-black'
    case 'contactat': return 'bg-info text-white'
    case 'acceptat': return 'bg-success text-white'
    case 'descartat': return 'bg-danger text-white'
    default: return 'bg-secondary text-white'
  }
}

const getQuestionText = (qId: string) => {
  if (!formDetails.value) return qId
  const q = formDetails.value.questions.find(x => x.id === qId)
  return q ? q.pregunta : qId
}
</script>

<template>
  <div class="form-responses max-w-5xl mx-auto">
    <div class="page-header glass-card mb-6">
      <div class="flex align-center gap-4">
        <Button icon="ti ti-arrow-left" text rounded aria-label="Tornar" @click="router.back()" />
        <h1 class="page-title">{{ $t('forms.responsesTitle') }}</h1>
      </div>
    </div>

    <div v-if="loading" class="text-center py-8 text-secondary">
      <i class="ti ti-loader ti-spin text-3xl mb-2"></i>
      <p>{{ $t('forms.loading') }}</p>
    </div>

    <div v-else>
      <div v-if="responses.length === 0" class="glass-card text-center py-8 text-secondary">
        <i class="ti ti-mail text-4xl mb-3 opacity-50"></i>
        <p>Aquest formulari encara no té respostes.</p>
      </div>

      <div v-else class="responses-grid">
        <div v-for="res in responses" :key="res.id" class="glass-card flex flex-col gap-3">
          <div class="flex justify-between align-start">
            <div>
              <h3 class="font-bold text-lg mb-1">{{ res.nom_candidat }}</h3>
              <p class="text-sm text-secondary"><i class="ti ti-mail mr-1"></i> {{ res.email_candidat }}</p>
              <p v-if="res.telefon_candidat" class="text-sm text-secondary"><i class="ti ti-phone mr-1"></i> {{ res.telefon_candidat }}</p>
            </div>
            <span class="badge" :class="getStatusBadge(res.estat)">{{ res.estat.toUpperCase() }}</span>
          </div>

          <div class="text-sm text-secondary mt-2">
            Rebut el {{ new Date(res.created_at).toLocaleDateString() }}
          </div>

          <div class="flex gap-2 border-t pt-3 mt-auto">
            <Button icon="ti ti-eye" label="Veure respostes" size="small" outlined class="flex-1" @click="viewAnswers(res)" />
          </div>

          <div class="field mt-2">
            <label class="text-xs">Estat del candidat:</label>
            <Select 
              :modelValue="res.estat" 
              :options="statusOptions" 
              optionLabel="label" 
              optionValue="value" 
              class="w-full h-10 text-sm" 
              @update:modelValue="(val) => changeStatus(res.id, val)" 
            />
          </div>
        </div>
      </div>
    </div>

    <Dialog v-model:visible="viewModalVisible" header="Detall de respostes" modal :style="{ width: '600px' }">
      <div v-if="selectedResponse" class="flex flex-col gap-4 mt-2">
        <div class="bg-surface border rounded p-4 mb-4">
          <h3 class="font-bold mb-2">{{ selectedResponse.nom_candidat }}</h3>
          <p><i class="ti ti-mail mr-1"></i> {{ selectedResponse.email_candidat }}</p>
          <p v-if="selectedResponse.telefon_candidat"><i class="ti ti-phone mr-1"></i> {{ selectedResponse.telefon_candidat }}</p>
        </div>

        <h4 class="font-bold mb-2 border-b pb-2">Respostes del formulari</h4>
        
        <div v-if="selectedResponse.answers.length === 0" class="text-secondary text-sm">
          No ha contestat cap pregunta extra.
        </div>

        <div v-for="(answer, idx) in selectedResponse.answers" :key="answer.id" class="mb-4">
          <div class="text-sm text-secondary font-medium mb-1">{{ getQuestionText(answer.question_id) }}</div>
          <div class="bg-surface p-3 rounded border whitespace-pre-wrap">{{ answer.valor || '-' }}</div>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
.responses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.page-header {
  padding: 20px 24px;
}

.page-title {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
}

/* Local utilities */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-1 { flex: 1; }
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.gap-4 { gap: 16px; }
.align-center { align-items: center; }
.align-start { align-items: flex-start; }
.justify-between { justify-content: space-between; }
.mb-1 { margin-bottom: 4px; }
.mb-2 { margin-bottom: 8px; }
.mb-3 { margin-bottom: 12px; }
.mb-4 { margin-bottom: 16px; }
.mb-6 { margin-bottom: 24px; }
.mt-2 { margin-top: 8px; }
.mt-auto { margin-top: auto; }
.p-3 { padding: 12px; }
.p-4 { padding: 16px; }
.pt-3 { padding-top: 12px; }
.py-8 { padding-top: 32px; padding-bottom: 32px; }
.text-center { text-align: center; }
.text-xs { font-size: 0.75rem; }
.text-sm { font-size: 0.875rem; }
.text-lg { font-size: 1.125rem; }
.text-secondary { color: var(--text-secondary); }
.text-white { color: #ffffff; }
.text-black { color: #000000; }
.bg-warning { background-color: var(--accent-warning); }
.bg-info { background-color: #3b82f6; }
.bg-success { background-color: var(--accent-success); }
.bg-danger { background-color: var(--accent-danger); }
.bg-secondary { background-color: var(--text-secondary); }
.font-bold { font-weight: 700; }
.font-medium { font-weight: 500; }
.border { border: 1px solid var(--border); }
.border-b { border-bottom: 1px solid var(--border); }
.border-t { border-top: 1px solid var(--border); }
.rounded { border-radius: var(--radius-sm); }
.whitespace-pre-wrap { white-space: pre-wrap; }
.opacity-50 { opacity: 0.5; }
.w-full { width: 100%; }

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
