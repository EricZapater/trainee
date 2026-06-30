<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { listForms, createForm, deleteForm, cloneForm, type FormWithQuestions } from '@/api/forms'
import { getEntrenadorsList } from '@/api/entrenador'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import InputSwitch from 'primevue/inputswitch'
import Select from 'primevue/select'

const router = useRouter()
const toast = useToast()
const { t } = useI18n()

const forms = ref<FormWithQuestions[]>([])
const loading = ref(true)

const entrenadors = ref<{id: string, nom: string}[]>([])

const loadForms = async () => {
  loading.value = true
  try {
    forms.value = await listForms()
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'han pogut carregar els formularis', life: 3000 })
  } finally {
    loading.value = false
  }
}

const loadEntrenadors = async () => {
  try {
    entrenadors.value = await getEntrenadorsList()
  } catch (e) {
    console.error("No s'han pogut carregar els entrenadors")
  }
}

onMounted(() => {
  loadForms()
  loadEntrenadors()
})

const createVisible = ref(false)
const createLoading = ref(false)
const formPayload = ref({
  titol: '',
  descripcio: '',
  actiu: false
})

const handleCreate = async () => {
  if (!formPayload.value.titol) return
  
  createLoading.value = true
  try {
    const newForm = await createForm(formPayload.value.titol, formPayload.value.descripcio || null, formPayload.value.actiu)
    toast.add({ severity: 'success', summary: 'Creat', detail: 'S\'ha creat el formulari', life: 3000 })
    createVisible.value = false
    router.push(`/entrenador/forms/${newForm.id}/edit`)
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'ha pogut crear', life: 3000 })
  } finally {
    createLoading.value = false
  }
}

const confirmDelete = async (id: string) => {
  if (confirm('N\'estàs segur? Aquesta acció no es pot desfer.')) {
    try {
      await deleteForm(id)
      toast.add({ severity: 'success', summary: 'Esborrat', detail: 'S\'ha esborrat correctament', life: 3000 })
      loadForms()
    } catch (e) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'ha pogut esborrar', life: 3000 })
    }
  }
}

const handleClone = async (id: string) => {
  try {
    const res = await cloneForm(id)
    toast.add({ severity: 'success', summary: 'Clonat', detail: res.message, life: 3000 })
    loadForms()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'ha pogut clonar', life: 3000 })
  }
}

const copyLink = (id: string) => {
  const url = `${window.location.origin}/forms/${id}`
  navigator.clipboard.writeText(url)
  toast.add({ severity: 'info', summary: 'Copiada', detail: 'Enllaç copiat al porta-retalls', life: 3000 })
}


</script>

<template>
  <div class="forms-manager max-w-5xl mx-auto">
    <div class="page-header glass-card">
      <div class="flex justify-between align-center">
        <h1 class="page-title"><i class="ti ti-clipboard-list text-accent mr-2"></i>{{ $t('forms.title') }}</h1>
        <div class="flex gap-2">
          <Button :label="$t('forms.newForm')" icon="ti ti-plus" @click="createVisible = true; formPayload = { titol: '', descripcio: '', actiu: false }" />
        </div>
      </div>
    </div>

    <div v-if="loading" class="text-center py-8 text-secondary">
      <i class="ti ti-loader ti-spin text-3xl mb-2"></i>
      <p>{{ $t('forms.loading') }}</p>
    </div>

    <div v-else class="forms-list mt-8">
      <div v-if="forms.length === 0" class="glass-card text-center py-8 text-secondary">
        <i class="ti ti-notebook text-4xl mb-3 opacity-50"></i>
        <p>No tens cap formulari creat.</p>
      </div>
      
      <div v-for="form in forms" :key="form.id" class="glass-card form-row">
        <div class="form-info">
          <div class="flex gap-3 align-center mb-1">
            <h3 class="form-title">{{ form.titol }}</h3>
            <span class="badge" :class="form.actiu ? 'bg-success' : 'bg-secondary'">
              {{ form.actiu ? $t('forms.active') : 'Inactiu' }}
            </span>
          </div>
          <p class="text-sm text-secondary">{{ form.descripcio || 'Sense descripció' }}</p>
        </div>

        <div class="form-stats">
          <div class="stat-item">
            <i class="ti ti-users text-xl text-secondary"></i>
            <span>{{ form.responses_count }} {{ $t('forms.responses') }}</span>
          </div>
        </div>

        <div class="form-actions flex gap-2 align-center">
          <Button v-tooltip.top="$t('forms.edit')" icon="ti ti-edit" outlined @click="router.push(`/entrenador/forms/${form.id}/edit`)" />
          <Button v-tooltip.top="$t('forms.viewResponses')" icon="ti ti-eye" severity="secondary" outlined @click="router.push(`/entrenador/forms/${form.id}/responses`)" />
          <Button v-tooltip.top="$t('forms.clone')" icon="ti ti-copy" severity="info" outlined @click="handleClone(form.id)" />
          <Button v-if="form.actiu" v-tooltip.top="$t('forms.share')" icon="ti ti-link" severity="success" outlined @click="copyLink(form.id)" />
          <Button v-tooltip.top="'Esborrar'" icon="ti ti-trash" severity="danger" text @click="confirmDelete(form.id)" />
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <Dialog v-model:visible="createVisible" :header="$t('forms.newForm')" modal :style="{ width: '400px' }">
      <div class="flex flex-col gap-4 mt-2">
        <div class="field">
          <label>{{ $t('forms.formTitle') }}</label>
          <InputText v-model="formPayload.titol" class="w-full" autofocus />
        </div>
        <div class="field">
          <label>{{ $t('forms.formDescription') }}</label>
          <Textarea v-model="formPayload.descripcio" rows="3" class="w-full" />
        </div>
        <div class="field flex align-center gap-3">
          <InputSwitch v-model="formPayload.actiu" inputId="actiu-switch" />
          <label for="actiu-switch" class="mb-0">{{ $t('forms.active') }}</label>
        </div>
      </div>
      <template #footer>
        <Button :label="$t('forms.cancel')" icon="ti ti-x" text @click="createVisible = false" />
        <Button :label="$t('forms.save')" icon="ti ti-check" @click="handleCreate" :loading="createLoading" />
      </template>
    </Dialog>

  </div>
</template>

<style scoped>
.forms-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}
.form-row:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.form-info {
  width: 250px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.form-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}
.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: var(--text-secondary);
}
.form-stats {
  flex: 1;
  display: flex;
  align-items: center;
}
.form-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-header {
  padding: 20px 24px;
}

.page-title {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
}

/* Local utilities for Modals */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.gap-4 { gap: 16px; }
.mt-2 { margin-top: 8px; }
.mt-6 { margin-top: 24px; }
.mt-8 { margin-top: 32px; }
.mb-0 { margin-bottom: 0 !important; }
.mb-1 { margin-bottom: 4px; }
.w-full { width: 100%; }
.align-center { align-items: center; }
.justify-between { justify-content: space-between; }
.text-sm { font-size: 0.875rem; }
.text-secondary { color: var(--text-secondary); }

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
