<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { 
  getFormResponses, 
  updateResponseStatus, 
  updateFormResponseDetails, 
  updateFormAnswer, 
  getFormDetails, 
  type FormResponseWithAnswers, 
  type FormWithQuestions,
  type FormAnswer
} from '@/api/forms'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Dialog from 'primevue/dialog'
import DatePicker from 'primevue/datepicker'
import Checkbox from 'primevue/checkbox'
import Textarea from 'primevue/textarea'

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

// Global response interesting toggle
const toggleResponseInteresting = async (r: FormResponseWithAnswers) => {
  const newValue = !r.is_interesting
  try {
    await updateFormResponseDetails(r.id, { is_interesting: newValue })
    r.is_interesting = newValue
    toast.add({ 
      severity: 'success', 
      summary: newValue ? 'Destacat' : 'Desmarcat', 
      detail: newValue ? 'Formulari marcat com a interessant' : 'Formulari desmarcat', 
      life: 2500 
    })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'ha pogut actualitzar', life: 3000 })
  }
}

// Global response comment save
const editingResponseComment = ref<string>('')
const isSavingResponseComment = ref(false)

const saveResponseComment = async (r: FormResponseWithAnswers) => {
  isSavingResponseComment.value = true
  try {
    await updateFormResponseDetails(r.id, { comentari: editingResponseComment.value })
    r.comentari = editingResponseComment.value
    toast.add({ severity: 'success', summary: 'Comentari desat', detail: 'S\'ha guardat el comentari global', life: 2500 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'ha pogut guardar el comentari', life: 3000 })
  } finally {
    isSavingResponseComment.value = false
  }
}

// Answer level interesting toggle
const toggleAnswerInteresting = async (ans: FormAnswer) => {
  const newValue = !ans.is_interesting
  try {
    await updateFormAnswer(ans.id, { is_interesting: newValue })
    ans.is_interesting = newValue
    toast.add({ 
      severity: 'success', 
      summary: newValue ? 'Resposta destacada' : 'Desmarcada', 
      detail: newValue ? 'Resposta meca com a interessant' : 'Resposta desmarcada', 
      life: 2500 
    })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'ha pogut actualitzar', life: 3000 })
  }
}

// Answer level comment save
const editingAnswerComments = ref<Record<string, string>>({})
const savingAnswerId = ref<string | null>(null)

const saveAnswerComment = async (ans: FormAnswer) => {
  const val = editingAnswerComments.value[ans.id] ?? ans.comentari ?? ''
  savingAnswerId.value = ans.id
  try {
    await updateFormAnswer(ans.id, { comentari: val })
    ans.comentari = val
    toast.add({ severity: 'success', summary: 'Comentari desat', detail: 'S\'ha guardat el comentari de la resposta', life: 2500 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'ha pogut guardar el comentari', life: 3000 })
  } finally {
    savingAnswerId.value = null
  }
}

const selectedResponse = ref<FormResponseWithAnswers | null>(null)
const viewModalVisible = ref(false)

const viewAnswers = (r: FormResponseWithAnswers) => {
  selectedResponse.value = r
  editingResponseComment.value = r.comentari || ''
  editingAnswerComments.value = {}
  r.answers.forEach(a => {
    editingAnswerComments.value[a.id] = a.comentari || ''
  })
  viewModalVisible.value = true
}

const hasInteresting = (r: FormResponseWithAnswers) => {
  return r.is_interesting || r.answers.some(a => a.is_interesting)
}

const hasComment = (r: FormResponseWithAnswers) => {
  return !!r.comentari || r.answers.some(a => !!a.comentari)
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

const dateRange = ref<Date[]>([])

const filteredResponses = computed(() => {
  if (!dateRange.value || dateRange.value.length === 0) return responses.value
  const start = dateRange.value[0]
  const end = dateRange.value[1]
  
  return responses.value.filter(res => {
    const d = new Date(res.created_at)
    
    if (start && end) {
      const s = new Date(start)
      s.setHours(0, 0, 0, 0)
      const e = new Date(end)
      e.setHours(23, 59, 59, 999)
      return d >= s && d <= e
    } else if (start) {
      const s = new Date(start)
      s.setHours(0, 0, 0, 0)
      return d >= s
    }
    return true
  })
})

const exportModalVisible = ref(false)
const selectedResponsesToExport = ref<FormResponseWithAnswers[]>([])

const openExportModal = () => {
  selectedResponsesToExport.value = [...filteredResponses.value]
  exportModalVisible.value = true
}

const isResponseSelected = (res: FormResponseWithAnswers) => {
  return selectedResponsesToExport.value.some(r => r.id === res.id)
}

const toggleSelectResponse = (res: FormResponseWithAnswers) => {
  if (isResponseSelected(res)) {
    selectedResponsesToExport.value = selectedResponsesToExport.value.filter(r => r.id !== res.id)
  } else {
    selectedResponsesToExport.value.push(res)
  }
}

const isAllSelected = computed(() => {
  if (filteredResponses.value.length === 0) return false
  return filteredResponses.value.every(res => isResponseSelected(res))
})

const toggleSelectAll = (e: any) => {
  const checked = e.checked
  if (checked) {
    selectedResponsesToExport.value = [...filteredResponses.value]
  } else {
    selectedResponsesToExport.value = []
  }
}

const exportToExcel = () => {
  if (!formDetails.value || selectedResponsesToExport.value.length === 0) return

  const questions = [...formDetails.value.questions].sort((a, b) => a.ordre - b.ordre)

  const headers = [
    'Nom Candidat',
    'Email',
    'Telèfon',
    'Data de Resposta',
    'Estat',
    'Interessant',
    'Comentari Entrenador',
    ...questions.map(q => q.pregunta)
  ]

  const rows = selectedResponsesToExport.value.map(res => {
    const candidateAnswers = questions.map(q => {
      const ans = res.answers.find(a => a.question_id === q.id)
      if (!ans) return ''
      let text = ans.valor || ''
      if (ans.is_interesting) text += ' [★ Interessant]'
      if (ans.comentari) text += ` (Nota: ${ans.comentari})`
      return text
    })

    return [
      res.nom_candidat || '',
      res.email_candidat || '',
      res.telefon_candidat || '',
      new Date(res.created_at).toLocaleDateString(),
      res.estat || '',
      res.is_interesting ? 'Sí' : 'No',
      res.comentari || '',
      ...candidateAnswers
    ]
  })

  const csvContent = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(';'),
    ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(';'))
  ].join('\n')

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `respostes_${formDetails.value.titol.toLowerCase().replace(/\s+/g, '_')}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  exportModalVisible.value = false
  toast.add({ severity: 'success', summary: 'Exportat', detail: 'S\'ha descarregat el fitxer Excel/CSV', life: 3000 })
}
</script>

<template>
  <div class="form-responses max-w-5xl mx-auto">
    <div class="page-header glass-card mb-6">
      <div class="flex align-center justify-between flex-wrap gap-4">
        <div class="flex align-center gap-4">
          <Button icon="ti ti-arrow-left" text rounded aria-label="Tornar" @click="router.back()" />
          <h1 class="page-title">{{ $t('forms.responsesTitle') }}</h1>
        </div>
        
        <div v-if="responses.length > 0" class="flex items-center gap-3">
          <DatePicker 
            v-model="dateRange" 
            selectionMode="range" 
            :manualInput="false" 
            placeholder="Filtra per dates..."
            showIcon 
            iconDisplay="input"
            class="w-full md:w-auto"
          />
          <Button 
            label="Exportar a Excel" 
            icon="ti ti-file-spreadsheet" 
            severity="success" 
            @click="openExportModal" 
          />
        </div>
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

      <div v-else-if="filteredResponses.length === 0" class="glass-card text-center py-8 text-secondary">
        <i class="ti ti-filter text-4xl mb-3 opacity-50"></i>
        <p>No hi ha respostes en aquestes dates.</p>
      </div>

      <div v-else class="responses-grid">
        <div 
          v-for="res in filteredResponses" 
          :key="res.id" 
          class="glass-card flex flex-col gap-3 relative transition-all"
          :class="{ 'border-amber-400/80 shadow-amber-500/10 shadow-lg': hasInteresting(res) }"
        >
          <div class="flex justify-between align-start">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <h3 class="font-bold text-lg m-0">{{ res.nom_candidat }}</h3>
                <Button 
                  :icon="res.is_interesting ? 'ti ti-star-filled' : 'ti ti-star'" 
                  text 
                  rounded 
                  size="small" 
                  :class="res.is_interesting ? 'text-amber-400' : 'text-gray-400 hover:text-amber-400'"
                  :title="res.is_interesting ? $t('forms.unmarkInteresting') : $t('forms.markInteresting')"
                  @click.stop="toggleResponseInteresting(res)"
                />
              </div>
              <p class="text-sm text-secondary"><i class="ti ti-mail mr-1"></i> {{ res.email_candidat }}</p>
              <p v-if="res.telefon_candidat" class="text-sm text-secondary"><i class="ti ti-phone mr-1"></i> {{ res.telefon_candidat }}</p>
            </div>
            <div class="flex flex-col items-end gap-1">
              <span class="badge" :class="getStatusBadge(res.estat)">{{ res.estat.toUpperCase() }}</span>
              <div class="flex gap-1 mt-1">
                <span v-if="hasInteresting(res)" class="text-xs bg-amber-500/20 text-amber-500 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <i class="ti ti-star-filled text-xs"></i> {{ $t('forms.hasInteresting') }}
                </span>
                <span v-if="hasComment(res)" class="text-xs bg-blue-500/20 text-blue-500 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <i class="ti ti-message text-xs"></i> {{ $t('forms.hasComment') }}
                </span>
              </div>
            </div>
          </div>

          <div 
            v-if="res.comentari" 
            class="bg-surface border rounded p-2.5 text-xs text-secondary flex items-start gap-2 transition-colors"
            :class="hasInteresting(res) ? 'border-amber-500/40 bg-amber-500/5' : 'border-blue-500/30'"
          >
            <i class="ti ti-notes text-sm mt-0.5" :class="hasInteresting(res) ? 'text-amber-500' : 'text-blue-400'"></i>
            <span class="whitespace-pre-wrap flex-1">{{ res.comentari }}</span>
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

    <!-- Modal detail -->
    <Dialog v-model:visible="viewModalVisible" header="Detall de respostes" modal :style="{ width: '680px', maxWidth: '95vw' }">
      <div v-if="selectedResponse" class="flex flex-col gap-4 mt-2">
        <div 
          class="bg-surface border rounded p-4 mb-2 relative transition-colors"
          :class="selectedResponse.is_interesting ? 'border-amber-400/80 shadow-amber-500/10 shadow-md' : 'border-gray-200 dark:border-gray-700'"
        >
          <div class="flex items-start justify-between gap-4 mb-2">
            <div>
              <h3 class="font-bold text-lg mb-1 flex items-center gap-2">
                {{ selectedResponse.nom_candidat }}
                <Button 
                  :icon="selectedResponse.is_interesting ? 'ti ti-star-filled' : 'ti ti-star'" 
                  text 
                  rounded 
                  size="small" 
                  :class="selectedResponse.is_interesting ? 'text-amber-400' : 'text-gray-400 hover:text-amber-400'"
                  :title="selectedResponse.is_interesting ? $t('forms.unmarkInteresting') : $t('forms.markInteresting')"
                  @click="toggleResponseInteresting(selectedResponse)"
                />
              </h3>
              <p class="text-sm"><i class="ti ti-mail mr-1"></i> {{ selectedResponse.email_candidat }}</p>
              <p v-if="selectedResponse.telefon_candidat" class="text-sm"><i class="ti ti-phone mr-1"></i> {{ selectedResponse.telefon_candidat }}</p>
            </div>
            <span class="badge" :class="getStatusBadge(selectedResponse.estat)">{{ selectedResponse.estat.toUpperCase() }}</span>
          </div>


          <!-- Coach Global Note -->
          <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <label class="text-xs font-semibold text-secondary flex items-center gap-1 mb-1">
              <i class="ti ti-notes"></i> {{ $t('forms.coachComment') }} (Global del candidat):
            </label>
            <div class="flex flex-col gap-2">
              <Textarea 
                v-model="editingResponseComment" 
                rows="2" 
                autoResize 
                :placeholder="$t('forms.commentPlaceholder')" 
                class="w-full text-sm"
              />
              <div class="flex justify-end">
                <Button 
                  label="Guardar nota global" 
                  icon="ti ti-check" 
                  size="small" 
                  severity="secondary" 
                  :loading="isSavingResponseComment"
                  @click="saveResponseComment(selectedResponse)" 
                />
              </div>
            </div>
          </div>
        </div>

        <h4 class="font-bold mb-2 border-b pb-2 flex items-center justify-between">
          <span>Respostes del formulari</span>
          <span class="text-xs font-normal text-secondary">{{ selectedResponse.answers.length }} preguntes contestades</span>
        </h4>
        
        <div v-if="selectedResponse.answers.length === 0" class="text-secondary text-sm">
          No ha contestat cap pregunta extra.
        </div>

        <div 
          v-for="answer in selectedResponse.answers" 
          :key="answer.id" 
          class="mb-4 p-3.5 rounded border transition-colors"
          :class="answer.is_interesting ? 'bg-amber-500/5 border-amber-400/80 dark:border-amber-500/60' : 'bg-surface border-gray-200 dark:border-gray-700'"
        >
          <div class="flex items-start justify-between gap-2 mb-2">
            <div class="text-sm text-secondary font-medium flex-1">
              {{ getQuestionText(answer.question_id) }}
            </div>
            <Button 
              :icon="answer.is_interesting ? 'ti ti-star-filled' : 'ti ti-star'" 
              text 
              rounded 
              size="small" 
              :class="answer.is_interesting ? 'text-amber-400' : 'text-gray-400 hover:text-amber-400'"
              :title="answer.is_interesting ? $t('forms.unmarkInteresting') : $t('forms.markInteresting')"
              @click="toggleAnswerInteresting(answer)"
            />
          </div>

          <div class="p-3 rounded bg-background border text-sm whitespace-pre-wrap mb-3 font-mono text-gray-800 dark:text-gray-200">
            {{ answer.valor || '-' }}
          </div>

          <!-- Answer Coach Comment -->
          <div class="mt-2 pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
            <label class="text-xs font-medium text-secondary flex items-center gap-1 mb-1">
              <i class="ti ti-message"></i> Comentari de l'entrenador sobre aquesta resposta:
            </label>
            <div class="flex gap-2 items-center">
              <Textarea 
                v-model="editingAnswerComments[answer.id]" 
                rows="1" 
                autoResize 
                :placeholder="$t('forms.commentPlaceholder')" 
                class="w-full text-xs"
              />
              <Button 
                icon="ti ti-check" 
                size="small" 
                severity="secondary" 
                outlined 
                :loading="savingAnswerId === answer.id"
                title="Guardar comentari"
                @click="saveAnswerComment(answer)" 
              />
            </div>
          </div>
        </div>
      </div>
    </Dialog>

    <!-- Dialog to Export to Excel -->
    <Dialog v-model:visible="exportModalVisible" header="Exportar respostes a Excel" modal :style="{ width: '600px', maxWidth: '95vw' }">
      <p class="mb-4 text-secondary text-sm">Selecciona els candidats que vols incloure a l'exportació de dades. Es generarà un fitxer Excel/CSV.</p>
      
      <div class="flex items-center justify-between mb-3 bg-surface p-3 rounded border border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-2">
          <Checkbox 
            id="selectAll" 
            :modelValue="isAllSelected" 
            binary 
            @change="toggleSelectAll" 
          />
          <label for="selectAll" class="font-bold cursor-pointer text-sm">Seleccionar-los tots</label>
        </div>
        <span class="text-sm text-secondary font-medium">{{ selectedResponsesToExport.length }} de {{ filteredResponses.length }} seleccionats</span>
      </div>

      <div class="export-list flex flex-col gap-2 max-h-[300px] overflow-y-auto border rounded p-2">
        <div 
          v-for="res in filteredResponses" 
          :key="res.id" 
          class="flex items-center gap-3 p-3 border rounded border-gray-200 dark:border-gray-700 hover:bg-hover cursor-pointer"
          @click="toggleSelectResponse(res)"
        >
          <Checkbox 
            :modelValue="isResponseSelected(res)" 
            binary 
            @click.stop
            @change="toggleSelectResponse(res)"
          />
          <div class="flex flex-col text-left flex-1 min-w-0">
            <span class="font-semibold text-sm truncate">{{ res.nom_candidat }}</span>
            <span class="text-xs text-secondary truncate">{{ res.email_candidat }}</span>
          </div>
          <span class="text-xs text-secondary">{{ new Date(res.created_at).toLocaleDateString() }}</span>
        </div>
      </div>

      <template #footer>
        <Button label="Cancel·lar" icon="ti ti-x" text severity="secondary" @click="exportModalVisible = false" />
        <Button label="Descarregar Excel" icon="ti ti-download" @click="exportToExcel" :disabled="selectedResponsesToExport.length === 0" />
      </template>
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
.gap-1 { gap: 4px; }
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.gap-4 { gap: 16px; }
.align-center { align-items: center; }
.align-start { align-items: flex-start; }
.justify-between { justify-content: space-between; }
.justify-end { justify-content: flex-end; }
.mb-1 { margin-bottom: 4px; }
.mb-2 { margin-bottom: 8px; }
.mb-3 { margin-bottom: 12px; }
.mb-4 { margin-bottom: 16px; }
.mb-6 { margin-bottom: 24px; }
.mt-0\.5 { margin-top: 2px; }
.mt-1 { margin-top: 4px; }
.mt-2 { margin-top: 8px; }
.mt-3 { margin-top: 12px; }
.mt-auto { margin-top: auto; }
.m-0 { margin: 0; }
.p-2 { padding: 8px; }
.p-2\.5 { padding: 10px; }
.p-3 { padding: 12px; }
.p-3\.5 { padding: 14px; }
.p-4 { padding: 16px; }
.px-2 { padding-left: 8px; padding-right: 8px; }
.py-0\.5 { padding-top: 2px; padding-bottom: 2px; }
.pt-2 { padding-top: 8px; }
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
.font-semibold { font-weight: 600; }
.font-medium { font-weight: 500; }
.font-normal { font-weight: 400; }
.font-mono { font-family: monospace; }
.border { border: 1px solid var(--border); }
.border-b { border-bottom: 1px solid var(--border); }
.border-t { border-top: 1px solid var(--border); }
.rounded { border-radius: var(--radius-sm); }
.rounded-full { border-radius: 9999px; }
.whitespace-pre-wrap { white-space: pre-wrap; }
.opacity-50 { opacity: 0.5; }
.w-full { width: 100%; }
.relative { position: relative; }
.items-center { align-items: center; }
.items-start { align-items: flex-start; }

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
