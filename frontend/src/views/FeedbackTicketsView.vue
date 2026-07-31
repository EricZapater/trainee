<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getFeedbackTickets, createFeedbackTicket, updateFeedbackTicket, type FeedbackTicket } from '@/api/feedback'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Drawer from 'primevue/drawer'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Dropdown from 'primevue/dropdown'
import FileUpload from 'primevue/fileupload'
import Tag from 'primevue/tag'
import { FilterMatchMode } from '@primevue/core/api'
import { usePaginationPreference } from '@/composables/usePaginationPreference'

const toast = useToast()
const { pageSize, setPageSize } = usePaginationPreference()

const tickets = ref<FeedbackTicket[]>([])
const loading = ref(true)

const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  informador_nom: { value: null, matchMode: FilterMatchMode.CONTAINS },
  resum: { value: null, matchMode: FilterMatchMode.CONTAINS },
  tipus: { value: null, matchMode: FilterMatchMode.EQUALS },
  estat: { value: null, matchMode: FilterMatchMode.EQUALS }
})

const tipusOptions = [
  { label: 'Tots', value: null },
  { label: 'Bug', value: 'bug' },
  { label: 'Petició', value: 'petició' }
]

const estatOptions = [
  { label: 'Tots', value: null },
  { label: 'Pendent', value: 'pendent' },
  { label: 'En curs', value: 'en curs' },
  { label: 'Desplegat', value: 'desplegat' },
  { label: 'Descartat', value: 'descartat' }
]

const loadTickets = async () => {
  loading.value = true
  try {
    tickets.value = await getFeedbackTickets()
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'han pogut carregar les peticions', life: 3000 })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadTickets()
})

// Dialog per crear nou tiquet
const createDialogVisible = ref(false)
const createLoading = ref(false)
const formData = ref({
  tipus: 'bug',
  resum: '',
  descripcio: '',
  imatges: [] as File[]
})

const onFileSelect = (event: any) => {
  if (event.files) {
    formData.value.imatges = Array.from(event.files)
  }
}

const onFileRemove = (fileToRemove: File) => {
  formData.value.imatges = formData.value.imatges.filter(f => f !== fileToRemove)
}

const submitForm = async () => {
  if (!formData.value.resum || !formData.value.descripcio) {
    toast.add({ severity: 'warn', summary: 'Camps requerits', detail: 'El resum i la descripció són obligatoris', life: 3000 })
    return
  }

  createLoading.value = true
  try {
    const data = new FormData()
    data.append('tipus', formData.value.tipus)
    data.append('resum', formData.value.resum)
    data.append('descripcio', formData.value.descripcio)
    formData.value.imatges.forEach((file) => {
      data.append('imatges', file)
    })

    await createFeedbackTicket(data)
    toast.add({ severity: 'success', summary: 'Creat', detail: 'S\'ha registrat la petició', life: 3000 })
    createDialogVisible.value = false
    formData.value = { tipus: 'bug', resum: '', descripcio: '', imatges: [] }
    loadTickets()
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.error || 'No s\'ha pogut crear la petició', life: 3000 })
  } finally {
    createLoading.value = false
  }
}

// Sidebar de detall
const selectedTicket = ref<FeedbackTicket | null>(null)
const sidebarVisible = ref(false)

const viewDetails = (ticket: FeedbackTicket) => {
  selectedTicket.value = ticket
  sidebarVisible.value = true
}

const manageDialogVisible = ref(false)
const manageLoading = ref(false)
const manageForm = ref({
  id: '',
  estat: '',
  resposta: '',
  imatges: [] as File[]
})

const openManage = (ticket: FeedbackTicket) => {
  selectedTicket.value = ticket
  manageForm.value = {
    id: ticket.id,
    estat: ticket.estat,
    resposta: ticket.resposta || '',
    imatges: []
  }
  manageDialogVisible.value = true
}

const onManageFileSelect = (event: any) => {
  if (event.files) {
    manageForm.value.imatges = Array.from(event.files)
  }
}

const onManageFileRemove = (fileToRemove: File) => {
  manageForm.value.imatges = manageForm.value.imatges.filter(f => f !== fileToRemove)
}

const submitManage = async () => {
  manageLoading.value = true
  try {
    const data = new FormData()
    data.append('estat', manageForm.value.estat)
    data.append('resposta', manageForm.value.resposta.trim())
    manageForm.value.imatges.forEach((file) => {
      data.append('imatges', file)
    })

    await updateFeedbackTicket(manageForm.value.id, data)
    toast.add({ severity: 'success', summary: 'Actualitzat', detail: 'S\'ha actualitzat el tiquet correctament', life: 3000 })
    manageDialogVisible.value = false
    loadTickets()
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.error || 'No s\'ha pogut actualitzar la petició', life: 3000 })
  } finally {
    manageLoading.value = false
  }
}

const getStatusSeverity = (status: string) => {
  switch (status) {
    case 'pendent': return 'warn'
    case 'en curs': return 'info'
    case 'desplegat': return 'success'
    case 'descartat': return 'danger'
    default: return 'info'
  }
}

const getTypeSeverity = (type: string) => {
  return type === 'bug' ? 'danger' : 'success'
}

const formatDate = (val: string) => {
  if (!val) return ''
  const d = new Date(val)
  return d.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
         d.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-7xl mx-auto w-full">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-surface-900 flex items-center gap-2">
        <i class="ti ti-bug text-primary"></i> Llista de Bugs i Peticions
      </h1>
      <Button label="Nova Petició" icon="ti ti-plus" @click="createDialogVisible = true" />
    </div>

    <div class="glass-card p-6">
      <DataTable 
        :value="tickets" 
        :loading="loading" 
        v-model:filters="filters" 
        filterDisplay="row" 
        paginator 
        :rows="pageSize" 
        :rowsPerPageOptions="[10, 20, 50]" 
        @page="(e: any) => setPageSize(e.rows)"
        stripedRows 
        hoverableRows
        class="w-full"
      >
        <template #empty>
          <div class="text-center p-4">No hi ha cap registre.</div>
        </template>

        <Column field="tipus" header="Tipus" :showFilterMenu="false" style="min-width: 120px">
          <template #body="{ data }">
            <Tag :value="data.tipus" :severity="getTypeSeverity(data.tipus)" class="uppercase text-xs font-bold px-2 py-1" />
          </template>
          <template #filter="{ filterModel, filterCallback }">
            <Dropdown v-model="filterModel.value" @change="filterCallback()" :options="tipusOptions" optionLabel="label" optionValue="value" placeholder="Tots" class="p-column-filter" />
          </template>
        </Column>

        <Column field="informador_nom" header="Informador" :showFilterMenu="false" style="min-width: 150px">
          <template #filter="{ filterModel, filterCallback }">
            <InputText v-model="filterModel.value" type="text" @input="filterCallback()" placeholder="Cerca per nom" class="p-column-filter" />
          </template>
        </Column>

        <Column field="resum" header="Resum" :showFilterMenu="false" style="min-width: 250px">
          <template #filter="{ filterModel, filterCallback }">
            <InputText v-model="filterModel.value" type="text" @input="filterCallback()" placeholder="Cerca al resum" class="p-column-filter w-full" />
          </template>
        </Column>

        <Column field="estat" header="Estat" :showFilterMenu="false" style="min-width: 150px">
          <template #body="{ data }">
            <Tag :value="data.estat" :severity="getStatusSeverity(data.estat)" class="uppercase text-xs font-bold px-2 py-1" />
          </template>
          <template #filter="{ filterModel, filterCallback }">
            <Dropdown v-model="filterModel.value" @change="filterCallback()" :options="estatOptions" optionLabel="label" optionValue="value" placeholder="Tots" class="p-column-filter" />
          </template>
        </Column>

        <Column field="created_at" header="Data Registre" sortable style="min-width: 150px">
          <template #body="{ data }">
            {{ formatDate(data.created_at) }}
          </template>
        </Column>

        <Column header="Accions" style="width: 120px; text-align: center">
          <template #body="{ data }">
            <div class="flex items-center justify-center gap-2">
              <Button icon="ti ti-eye" text rounded aria-label="Veure detall" @click="viewDetails(data)" />
              <Button icon="ti ti-edit" text rounded aria-label="Gestionar" @click="openManage(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Create Dialog -->
    <Dialog v-model:visible="createDialogVisible" modal :style="{ width: '550px', maxWidth: '95vw' }" :pt="{ root: { class: 'border-none shadow-2xl rounded-2xl overflow-hidden' }, header: { class: 'bg-surface-50 border-b border-surface-200 py-4 px-6' }, content: { class: 'p-6' } }">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 shadow-sm">
            <i class="ti ti-message-report text-xl"></i>
          </div>
          <h2 class="text-xl font-bold text-surface-900 m-0">Nova Petició o Bug</h2>
        </div>
      </template>

      <div class="flex flex-col gap-6 mt-2">
        <div class="field">
          <label class="text-sm font-semibold text-surface-700 block mb-3">Quin tipus de feedback vols enviar?</label>
          <div class="grid grid-cols-2 gap-4">
            <div 
              @click="formData.tipus = 'bug'"
              class="cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 flex flex-col items-center gap-2 hover:bg-surface-50 group"
              :class="formData.tipus === 'bug' ? 'border-danger-500 bg-danger-50 text-danger-700 shadow-sm' : 'border-surface-200 text-surface-600'"
            >
              <i class="ti ti-bug text-3xl transition-transform duration-200 group-hover:scale-110" :class="formData.tipus === 'bug' ? 'text-danger-500' : ''"></i>
              <span class="font-semibold">Error / Bug</span>
              <span class="text-xs text-center opacity-80">Alguna cosa no funciona bé</span>
            </div>
            
            <div 
              @click="formData.tipus = 'petició'"
              class="cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 flex flex-col items-center gap-2 hover:bg-surface-50 group"
              :class="formData.tipus === 'petició' ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm' : 'border-surface-200 text-surface-600'"
            >
              <i class="ti ti-bulb text-3xl transition-transform duration-200 group-hover:scale-110" :class="formData.tipus === 'petició' ? 'text-primary-500' : ''"></i>
              <span class="font-semibold">Millora</span>
              <span class="text-xs text-center opacity-80">Tens una idea nova</span>
            </div>
          </div>
        </div>

        <div class="field">
          <label class="text-sm font-semibold text-surface-700 block mb-2">Resum breu</label>
          <InputText v-model="formData.resum" placeholder="Ex: El botó de guardar no funciona..." class="w-full p-3 border-surface-300 rounded-lg shadow-sm focus:ring-primary-500" maxlength="200" />
        </div>

        <div class="field">
          <label class="text-sm font-semibold text-surface-700 block mb-2">Descripció detallada</label>
          <Textarea v-model="formData.descripcio" rows="4" class="w-full p-3 border-surface-300 rounded-lg shadow-sm focus:ring-primary-500 resize-none" placeholder="Explica el problema o la millora amb el màxim de detalls possible..." />
        </div>

        <div class="field">
          <label class="text-sm font-semibold text-surface-700 block mb-2">Captures de pantalla <span class="font-normal text-surface-400">(Opcional, màx 1MB cadascuna)</span></label>
          <div class="relative">
            <FileUpload mode="basic" name="imatges" accept="image/*" :maxFileSize="1048576" customUpload multiple @select="onFileSelect" chooseLabel="Pujar imatges" class="w-full [&_.p-button]:w-full [&_.p-button]:bg-surface-50 [&_.p-button]:border-dashed [&_.p-button]:border-2 [&_.p-button]:border-surface-300 [&_.p-button]:text-surface-600 [&_.p-button:hover]:bg-surface-100 [&_.p-button:hover]:border-primary-400 transition-colors" chooseIcon="ti ti-upload" />
          </div>
          <div v-if="formData.imatges.length > 0" class="flex flex-col gap-2 mt-3 animate-fadein">
            <div v-for="(file, idx) in formData.imatges" :key="idx" class="flex items-center justify-between p-3 bg-surface-50 rounded-lg border border-surface-200 shadow-sm">
              <div class="flex items-center gap-3 overflow-hidden">
                <div class="w-10 h-10 rounded bg-primary-100 flex items-center justify-center shrink-0 text-primary-600">
                  <i class="ti ti-photo"></i>
                </div>
                <div class="flex flex-col truncate">
                  <span class="text-sm font-medium text-surface-700 truncate">{{ file.name }}</span>
                  <span class="text-xs text-surface-500">{{ (file.size / 1024).toFixed(1) }} KB</span>
                </div>
              </div>
              <Button icon="ti ti-trash" text rounded severity="danger" aria-label="Eliminar imatge" @click="onFileRemove(file)" />
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3 pt-4 border-t border-surface-200 mt-2 w-full">
          <Button label="Cancel·lar" icon="ti ti-x" text severity="secondary" @click="createDialogVisible = false" class="px-4" />
          <Button label="Enviar Feedback" icon="ti ti-send" @click="submitForm" :loading="createLoading" class="px-6 rounded-xl shadow-md hover:shadow-lg transition-shadow" />
        </div>
      </template>
    </Dialog>

    <!-- Create Dialog -->
    <Dialog v-model:visible="createDialogVisible" modal :style="{ width: '550px', maxWidth: '95vw' }" :pt="{ root: { class: 'feedback-dialog' }, header: { class: 'feedback-dialog-header' }, content: { class: 'feedback-dialog-content' } }">
      <template #header>
        <div class="feedback-header-title">
          <div class="feedback-header-icon">
            <i class="ti ti-message-report"></i>
          </div>
          <h2>Nova Petició o Bug</h2>
        </div>
      </template>

      <div class="feedback-form">
        <div class="form-field">
          <label class="field-label">Quin tipus de feedback vols enviar?</label>
          <div class="type-cards">
            <div 
              @click="formData.tipus = 'bug'"
              class="type-card"
              :class="{ 'is-active-bug': formData.tipus === 'bug' }"
            >
              <i class="ti ti-bug"></i>
              <span class="type-title">Error / Bug</span>
              <span class="type-desc">Alguna cosa no funciona bé</span>
            </div>
            
            <div 
              @click="formData.tipus = 'petició'"
              class="type-card"
              :class="{ 'is-active-peticio': formData.tipus === 'petició' }"
            >
              <i class="ti ti-bulb"></i>
              <span class="type-title">Millora</span>
              <span class="type-desc">Tens una idea nova</span>
            </div>
          </div>
        </div>

        <div class="form-field">
          <label class="field-label">Resum breu</label>
          <InputText v-model="formData.resum" placeholder="Ex: El botó de guardar no funciona..." class="custom-input" maxlength="200" />
        </div>

        <div class="form-field">
          <label class="field-label">Descripció detallada</label>
          <Textarea v-model="formData.descripcio" rows="4" class="custom-input custom-textarea" placeholder="Explica el problema o la millora amb el màxim de detalls possible..." />
        </div>

        <div class="form-field">
          <label class="field-label">Captures de pantalla <span class="field-optional">(Opcional, màx 1MB cadascuna)</span></label>
          <div class="upload-container">
            <FileUpload mode="basic" name="imatges" accept="image/*" :maxFileSize="1048576" customUpload multiple @select="onFileSelect" chooseLabel="Pujar imatges" class="custom-fileupload" chooseIcon="ti ti-upload" />
          </div>
          <div v-if="formData.imatges.length > 0" class="files-selected-list mt-3 flex flex-col gap-2">
            <div v-for="(file, idx) in formData.imatges" :key="idx" class="file-selected">
              <div class="file-info">
                <div class="file-icon">
                  <i class="ti ti-photo"></i>
                </div>
                <div class="file-details">
                  <span class="file-name">{{ file.name }}</span>
                  <span class="file-size">{{ (file.size / 1024).toFixed(1) }} KB</span>
                </div>
              </div>
              <Button icon="ti ti-trash" text rounded severity="danger" aria-label="Eliminar imatge" @click="onFileRemove(file)" />
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="feedback-footer">
          <Button label="Cancel·lar" icon="ti ti-x" text severity="secondary" @click="createDialogVisible = false" class="btn-cancel" />
          <Button label="Enviar Feedback" icon="ti ti-send" @click="submitForm" :loading="createLoading" class="btn-submit" />
        </div>
      </template>
    </Dialog>

    <!-- Drawer Detail -->
    <Drawer v-model:visible="sidebarVisible" position="right" :style="{ width: '400px', maxWidth: '100vw' }">
      <template #header>
        <h2 class="drawer-title">
          <i class="ti ti-file-info text-primary"></i> Detall
        </h2>
      </template>
      <div v-if="selectedTicket" class="drawer-content">
        <div>
          <div class="drawer-tags">
            <Tag :value="selectedTicket.tipus" :severity="getTypeSeverity(selectedTicket.tipus)" class="uppercase text-xs" />
            <Tag :value="selectedTicket.estat" :severity="getStatusSeverity(selectedTicket.estat)" class="uppercase text-xs" />
          </div>
          <h3 class="drawer-subject">{{ selectedTicket.resum }}</h3>
          <p class="drawer-meta">
            Per <strong>{{ selectedTicket.informador_nom }}</strong> el {{ formatDate(selectedTicket.created_at) }}
          </p>
        </div>

        <div class="drawer-desc-box">
          <p class="drawer-desc">{{ selectedTicket.descripcio }}</p>
        </div>

        <div v-if="selectedTicket.imatges && selectedTicket.imatges.length > 0">
          <h4 class="drawer-img-title">Imatges Adjuntes:</h4>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <div v-for="(img, idx) in selectedTicket.imatges" :key="idx" class="relative group">
              <a :href="img" target="_blank" class="drawer-img-link block rounded overflow-hidden border border-surface-200 hover:border-primary-400 transition-colors">
                <img :src="img" alt="Captura" class="drawer-img w-full h-32 object-cover" />
              </a>
            </div>
          </div>
        </div>
        <div v-else-if="selectedTicket.imatge_path">
          <h4 class="drawer-img-title">Imatge Adjunta:</h4>
          <a :href="selectedTicket.imatge_path" target="_blank" class="drawer-img-link">
            <img :src="selectedTicket.imatge_path" alt="Captura" class="drawer-img" />
          </a>
        </div>

        <div v-if="selectedTicket.resposta" class="drawer-desc-box mt-4 p-4 rounded border" style="background-color: var(--primary-50); border-color: var(--primary-200);">
          <h4 class="drawer-img-title text-primary-700 font-semibold mb-2">Resposta de l'equip:</h4>
          <p class="drawer-desc" style="color: var(--primary-900);">{{ selectedTicket.resposta }}</p>
          
          <div v-if="selectedTicket.resposta_imatges && selectedTicket.resposta_imatges.length > 0" class="mt-3">
            <p class="text-xs font-semibold text-primary-700 mb-2">Imatges adjuntes a la resposta:</p>
            <div class="grid grid-cols-2 gap-2">
              <div v-for="(img, idx) in selectedTicket.resposta_imatges" :key="idx" class="relative">
                <a :href="img" target="_blank" class="drawer-img-link block rounded overflow-hidden border border-primary-200 hover:border-primary-400 transition-colors">
                  <img :src="img" alt="Captura Resposta" class="drawer-img w-full h-24 object-cover" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Drawer>

    <!-- Manage Dialog -->
    <Dialog v-model:visible="manageDialogVisible" modal :style="{ width: '550px', maxWidth: '95vw' }" header="Gestionar Tiquet">
      <div class="flex flex-col gap-4 mt-2">
        <div class="field">
          <label class="font-semibold block mb-2">Estat</label>
          <Dropdown v-model="manageForm.estat" :options="estatOptions.filter(o => o.value !== null)" optionLabel="label" optionValue="value" class="w-full" />
        </div>
        
        <div class="field">
          <label class="font-semibold block mb-2">Resposta (opcional, s'enviarà per email)</label>
          <Textarea v-model="manageForm.resposta" rows="5" class="w-full resize-none" placeholder="Escriu la teva resposta aquí..." />
        </div>

        <div class="field">
          <label class="font-semibold block mb-2">Adjuntar captures a la resposta <span class="font-normal text-surface-400">(Opcional, màx 1MB cadascuna)</span></label>
          <div class="relative">
            <FileUpload mode="basic" name="imatges" accept="image/*" :maxFileSize="1048576" customUpload multiple @select="onManageFileSelect" chooseLabel="Afegir captures" class="w-full [&_.p-button]:w-full [&_.p-button]:bg-surface-50 [&_.p-button]:border-dashed [&_.p-button]:border-2 [&_.p-button]:border-surface-300 [&_.p-button]:text-surface-600 [&_.p-button:hover]:bg-surface-100 [&_.p-button:hover]:border-primary-400 transition-colors" chooseIcon="ti ti-upload" />
          </div>
          <div v-if="manageForm.imatges.length > 0" class="flex flex-col gap-2 mt-3 animate-fadein">
            <div v-for="(file, idx) in manageForm.imatges" :key="idx" class="flex items-center justify-between p-2 bg-surface-50 rounded border border-surface-200 shadow-sm">
              <div class="flex items-center gap-3 overflow-hidden">
                <div class="w-8 h-8 rounded bg-primary-50 flex items-center justify-center shrink-0 text-primary-600">
                  <i class="ti ti-photo"></i>
                </div>
                <div class="flex flex-col truncate">
                  <span class="text-xs font-medium text-surface-700 truncate">{{ file.name }}</span>
                  <span class="text-[10px] text-surface-500">{{ (file.size / 1024).toFixed(1) }} KB</span>
                </div>
              </div>
              <Button icon="ti ti-trash" text rounded severity="danger" @click="onManageFileRemove(file)" />
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Cancel·lar" icon="ti ti-x" text @click="manageDialogVisible = false" />
        <Button label="Guardar i Enviar" icon="ti ti-check" @click="submitManage" :loading="manageLoading" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.uppercase { text-transform: uppercase; }
.text-xs { font-size: 0.75rem; }
.font-bold { font-weight: 700; }
.px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
.py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
.text-center { text-align: center; }
.p-4 { padding: 1rem; }
.w-full { width: 100%; }

/* --- Drawer Detail Styles --- */
.drawer-title {
  font-weight: 700;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}
.text-primary {
  color: var(--accent-primary);
}
.drawer-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding-top: 1rem;
}
.drawer-tags {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.drawer-subject {
  font-weight: 700;
  font-size: 1.125rem;
  color: var(--text-primary);
  margin: 0 0 0.25rem 0;
}
.drawer-meta {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin: 0;
}
.drawer-desc-box {
  background-color: var(--bg-base);
  padding: 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
}
.drawer-desc {
  font-size: 0.875rem;
  color: var(--text-secondary);
  white-space: pre-wrap;
  line-height: 1.6;
  margin: 0;
}
.drawer-img-title {
  font-weight: 600;
  font-size: 0.875rem;
  margin: 0 0 0.5rem 0;
  color: var(--text-secondary);
}
.drawer-img-link {
  display: block;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border);
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  transition: box-shadow var(--transition-fast);
}
.drawer-img-link:hover {
  box-shadow: var(--shadow-md);
}
.drawer-img {
  width: 100%;
  height: auto;
  object-fit: cover;
  display: block;
}

/* --- Feedback Dialog Custom Styles --- */
:deep(.feedback-dialog) {
  border: none !important;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
  border-radius: var(--radius-lg) !important;
  overflow: hidden;
}

:deep(.feedback-dialog-header) {
  background-color: var(--bg-base) !important;
  border-bottom: 1px solid var(--border) !important;
  padding: 1rem 1.5rem !important;
}

:deep(.feedback-dialog-content) {
  padding: 1.5rem !important;
}

.feedback-header-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.feedback-header-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--p-primary-50);
  color: var(--accent-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.feedback-header-icon i {
  font-size: 1.25rem;
}

.feedback-header-title h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.feedback-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-top: 0.5rem;
}

.form-field {
  display: flex;
  flex-direction: column;
}

.field-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
  display: block;
}

.field-optional {
  font-weight: 400;
  color: var(--text-muted);
}

.type-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.type-card {
  cursor: pointer;
  border-radius: var(--radius-md);
  border: 2px solid var(--border);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  transition: all var(--transition-fast);
  color: var(--text-secondary);
  background-color: var(--bg-surface);
}

.type-card:hover {
  background-color: var(--bg-hover);
}

.type-card i {
  font-size: 2rem;
  transition: transform var(--transition-fast);
}

.type-card:hover i {
  transform: scale(1.1);
}

.type-title {
  font-weight: 600;
}

.type-desc {
  font-size: 0.75rem;
  text-align: center;
  opacity: 0.8;
}

/* Active states for cards */
.is-active-bug {
  border-color: var(--accent-danger);
  background-color: #fef2f2 !important;
  color: #991b1b;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
.is-active-bug i { color: var(--accent-danger); }

.is-active-peticio {
  border-color: var(--accent-primary);
  background-color: var(--p-primary-50) !important;
  color: var(--p-primary-700);
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
.is-active-peticio i { color: var(--accent-primary); }

.custom-input {
  width: 100%;
  padding: 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.custom-textarea {
  resize: none;
}

.upload-container {
  position: relative;
}

:deep(.custom-fileupload .p-button) {
  width: 100%;
  background-color: var(--bg-base);
  border: 2px dashed var(--border);
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

:deep(.custom-fileupload .p-button:hover) {
  background-color: var(--bg-hover);
  border-color: var(--accent-primary);
}

.file-selected {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background-color: var(--bg-base);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  animation: fadein 0.3s ease;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  overflow: hidden;
}

.file-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  background-color: var(--p-primary-50);
  color: var(--accent-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-details {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.file-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.feedback-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
  margin-top: 0.5rem;
  width: 100%;
}

.btn-cancel {
  padding-left: 1rem;
  padding-right: 1rem;
}

.btn-submit {
  padding-left: 1.5rem;
  padding-right: 1.5rem;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  transition: box-shadow var(--transition-fast);
}

.btn-submit:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

@keyframes fadein {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
