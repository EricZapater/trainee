<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getPublicForm, submitFormResponse, type FormWithQuestions } from '@/api/forms'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import InputSwitch from 'primevue/inputswitch'

const route = useRoute()
const formId = route.params.id as string

const form = ref<FormWithQuestions | null>(null)
const loading = ref(true)
const errorMsg = ref('')

const submitted = ref(false)
const submitting = ref(false)

// Candidat info
const candidat = ref({
  nom: '',
  email: '',
  telefon: ''
})

// Answers mapping: { [questionId]: value }
const answers = ref<Record<string, any>>({})

const loadForm = async () => {
  try {
    form.value = await getPublicForm(formId)
    // Initialize answers
    form.value.questions.forEach(q => {
      if (q.tipus === 'boolean') {
        answers.value[q.id] = false
      } else {
        answers.value[q.id] = ''
      }
    })
  } catch (e: any) {
    errorMsg.value = e.response?.data?.error || 'Aquest formulari no existeix o ja no està actiu.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadForm()
})

const getOptionsArray = (optsString: string | null) => {
  if (!optsString) return []
  return optsString.split(',').map(s => s.trim()).filter(s => s)
}

const handleSubmit = async () => {
  if (!form.value) return
  
  // Basic Validation
  if (!candidat.value.nom || !candidat.value.email) {
    alert('Has d\'omplir el nom i el correu electrònic.')
    return
  }

  const uncompletedRequired = form.value.questions.find(q => {
    if (q.obligatori) {
      const val = answers.value[q.id]
      if (q.tipus === 'boolean') return false // Boolean always has a value (true/false)
      if (val === null || val === undefined || val === '') return true
    }
    return false
  })

  if (uncompletedRequired) {
    alert('Si us plau, respon totes les preguntes obligatòries.')
    return
  }

  submitting.value = true
  try {
    const formattedAnswers = Object.entries(answers.value).map(([qid, val]) => ({
      question_id: qid,
      valor: typeof val === 'boolean' ? (val ? 'Sí' : 'No') : val.toString()
    }))

    await submitFormResponse(formId, {
      nom_candidat: candidat.value.nom,
      email_candidat: candidat.value.email,
      telefon_candidat: candidat.value.telefon || undefined,
      answers: formattedAnswers
    })
    
    submitted.value = true
  } catch (e: any) {
    alert(e.response?.data?.error || 'S\'ha produït un error en enviar el formulari.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="public-form-container">
    <div v-if="loading" class="text-center py-12">
      <i class="ti ti-loader ti-spin text-4xl text-accent mb-4"></i>
      <p class="text-secondary">Carregant formulari...</p>
    </div>

    <div v-else-if="errorMsg" class="max-w-md mx-auto text-center py-12">
      <i class="ti ti-file-x text-5xl text-danger mb-4"></i>
      <h2 class="text-2xl font-bold mb-2">Error</h2>
      <p class="text-secondary">{{ errorMsg }}</p>
    </div>

    <div v-else-if="submitted" class="max-w-md mx-auto text-center py-12 glass-card">
      <i class="ti ti-circle-check text-5xl text-success mb-4"></i>
      <h2 class="text-2xl font-bold mb-2">Gràcies!</h2>
      <p class="text-secondary">Hem rebut el teu formulari correctament. L'entrenador es posarà en contacte amb tu aviat.</p>
    </div>

    <div v-else-if="form" class="max-w-5xl w-full mx-auto py-8 px-4">
      <!-- Header -->
      <div class="glass-card text-center mb-6 py-8 relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 z-0"></div>
        <div class="relative z-10">
          <h1 class="text-3xl font-bold mb-2 logo-text">{{ form.titol }}</h1>
          <p class="text-secondary text-lg" v-if="form.descripcio">{{ form.descripcio }}</p>
        </div>
      </div>

      <div class="glass-card mb-6 p-8">
        <h3 class="text-xl font-bold mb-4 border-b pb-2">Dades de contacte</h3>
        <div class="flex flex-col gap-4">
          <div class="field">
            <label>Nom complet <span class="text-danger">*</span></label>
            <InputText v-model="candidat.nom" class="w-full" placeholder="El teu nom" />
          </div>
          <div class="field">
            <label>Correu electrònic <span class="text-danger">*</span></label>
            <InputText v-model="candidat.email" type="email" class="w-full" placeholder="ex: elteucorreu@email.com" />
          </div>
          <div class="field">
            <label>Telèfon (opcional)</label>
            <InputText v-model="candidat.telefon" type="tel" class="w-full" placeholder="+34 600 000 000" />
          </div>
        </div>
      </div>

      <div v-if="form.questions.length > 0" class="glass-card mb-6 p-8">
        <h3 class="text-xl font-bold mb-4 border-b pb-2">Qüestionari</h3>
        
        <div class="flex flex-col gap-6">
          <div v-for="(q, idx) in form.questions" :key="q.id" class="question-block">
            <label class="font-medium text-lg mb-2 block">
              {{ idx + 1 }}. {{ q.pregunta }} <span v-if="q.obligatori" class="text-danger">*</span>
            </label>
            
            <InputText v-if="q.tipus === 'text'" v-model="answers[q.id]" class="w-full" />
            
            <Textarea v-else-if="q.tipus === 'textarea'" v-model="answers[q.id]" class="w-full" rows="3" />
            
            <InputText v-else-if="q.tipus === 'number'" v-model="answers[q.id]" type="number" class="w-full" />
            
            <Select v-else-if="q.tipus === 'select'" v-model="answers[q.id]" :options="getOptionsArray(q.opcions)" class="w-full" placeholder="Selecciona una opció" />
            
            <div v-else-if="q.tipus === 'boolean'" class="flex align-center gap-3 py-2">
              <InputSwitch v-model="answers[q.id]" :inputId="'switch-' + q.id" />
              <label :for="'switch-' + q.id" class="mb-0 cursor-pointer font-medium">{{ answers[q.id] ? 'Sí' : 'No' }}</label>
            </div>
          </div>
        </div>
      </div>

      <div class="text-center mt-8">
        <Button label="Enviar Formulari" icon="ti ti-send" size="large" class="w-full sm:w-auto px-8 py-3 text-lg" @click="handleSubmit" :loading="submitting" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.public-form-container {
  min-height: 100vh;
  background-color: var(--bg-body);
  padding: 20px;
}
.logo-text {
  background: linear-gradient(135deg, var(--accent-primary), #a5b4fc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.question-block {
  background: rgba(255, 255, 255, 0.02);
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--border);
}

/* Local utilities */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.gap-3 { gap: 12px; }
.gap-4 { gap: 16px; }
.gap-6 { gap: 24px; }
.w-full { width: 100%; }
.max-w-md { max-width: 28rem; }
.max-w-2xl { max-width: 42rem; }
.max-w-5xl { max-width: 64rem; }
.mx-auto { margin-left: auto; margin-right: auto; }
.mb-2 { margin-bottom: 8px; }
.mb-4 { margin-bottom: 16px; }
.mb-6 { margin-bottom: 24px; }
.mt-8 { margin-top: 32px; }
.py-3 { padding-top: 12px; padding-bottom: 12px; }
.py-8 { padding-top: 32px; padding-bottom: 32px; }
.p-8 { padding: 32px; }
.px-4 { padding-left: 16px; padding-right: 16px; }
.py-12 { padding-top: 48px; padding-bottom: 48px; }
.px-8 { padding-left: 32px; padding-right: 32px; }
.text-center { text-align: center; }
.text-lg { font-size: 1.125rem; }
.text-xl { font-size: 1.25rem; }
.text-2xl { font-size: 1.5rem; }
.text-3xl { font-size: 1.875rem; }
.text-4xl { font-size: 2.25rem; }
.text-5xl { font-size: 3rem; }
.font-medium { font-weight: 500; }
.font-bold { font-weight: 700; }
.text-secondary { color: var(--text-secondary); }
.text-accent { color: var(--accent-primary); }
.text-danger { color: var(--accent-danger); }
.text-success { color: var(--accent-success); }
.bg-gradient-to-r { background-image: linear-gradient(to right, var(--tw-gradient-stops)); }
.from-indigo-500\/10 { --tw-gradient-from: rgba(99, 102, 241, 0.1); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(99, 102, 241, 0)); }
.to-purple-500\/10 { --tw-gradient-to: rgba(168, 85, 247, 0.1); }
.absolute { position: absolute; }
.relative { position: relative; }
.inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
.z-0 { z-index: 0; }
.z-10 { z-index: 10; }
.overflow-hidden { overflow: hidden; }
.border-b { border-bottom: 1px solid var(--border); }
.pb-2 { padding-bottom: 8px; }
.block { display: block; }
.cursor-pointer { cursor: pointer; }
.align-center { align-items: center; }
.mb-0 { margin-bottom: 0 !important; }

@media (min-width: 640px) {
  .sm\:w-auto { width: auto; }
}

.field {
  display: flex;
  flex-direction: column;
}
.field label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary);
}
</style>
