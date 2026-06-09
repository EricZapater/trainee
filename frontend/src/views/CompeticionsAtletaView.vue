<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getAtletaCompeticions, createCompeticio } from '@/api/competicions'
import type { Competicio } from '@/types'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import DatePicker from 'primevue/datepicker'
import Tag from 'primevue/tag'

const toast = useToast()
const competicions = ref<Competicio[]>([])
const loading = ref(false)

const createModalVisible = ref(false)
const creating = ref(false)

const form = ref({
  nom: '',
  data: null as Date | null,
  kms: null as number | null,
  desnivell: null as number | null,
  enllac: '',
  track_gpx: null as File | null,
  comentaris: ''
})

const loadCompeticions = async () => {
  loading.value = true
  try {
    competicions.value = await getAtletaCompeticions()
  } catch(e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'han pogut carregar les competicions', life: 3000 })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadCompeticions()
})

const openCreateModal = () => {
  form.value = {
    nom: '',
    data: null,
    kms: null,
    desnivell: null,
    enllac: '',
    track_gpx: null,
    comentaris: ''
  }
  createModalVisible.value = true
}

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    const file = target.files[0]
    if (!file.name.toLowerCase().endsWith('.gpx')) {
      toast.add({ severity: 'warn', summary: 'Format no vàlid', detail: 'Només es permeten fitxers .gpx', life: 3000 })
      target.value = ''
      form.value.track_gpx = null
      return
    }
    form.value.track_gpx = file
  } else {
    form.value.track_gpx = null
  }
}

const handleCreate = async () => {
  if (!form.value.nom || !form.value.data || !form.value.enllac) {
    toast.add({ severity: 'warn', summary: 'Avís', detail: 'El nom, la data i l\'enllaç són obligatoris', life: 3000 })
    return
  }
  
  creating.value = true
  try {
    const yyyy = form.value.data.getFullYear()
    const mm = String(form.value.data.getMonth() + 1).padStart(2, '0')
    const dd = String(form.value.data.getDate()).padStart(2, '0')
    
    await createCompeticio({
      nom: form.value.nom,
      data: `${yyyy}-${mm}-${dd}`,
      kms: form.value.kms || undefined,
      desnivell: form.value.desnivell || undefined,
      enllac: form.value.enllac,
      track_gpx: form.value.track_gpx || undefined,
      comentaris: form.value.comentaris || undefined
    })
    
    toast.add({ severity: 'success', summary: 'Guardat', detail: 'Competició registrada correctament', life: 3000 })
    createModalVisible.value = false
    loadCompeticions()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'ha pogut registrar la competició', life: 3000 })
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="competicions-layout max-w-4xl mx-auto">
    <div class="page-header glass-card">
      <h1 class="page-title">Les meves Competicions</h1>
      <Button label="Nou Objectiu" icon="ti ti-plus" @click="openCreateModal" />
    </div>

    <div class="list mt-4">
      <div v-if="loading && competicions.length === 0" class="text-center py-8 text-secondary">
        <i class="ti ti-loader ti-spin text-3xl mb-2"></i>
        <p>Carregant...</p>
      </div>

      <div v-else-if="competicions.length === 0" class="empty-state glass-card">
        <i class="ti ti-trophy text-4xl mb-4 text-muted"></i>
        <p>Encara no has afegit cap competició o objectiu.</p>
        <p class="text-sm mt-2 text-muted">Afegeix els teus reptes per tal que el teu entrenador te'ls planifiqui a l'agenda.</p>
      </div>

      <div v-for="comp in competicions" :key="comp.id" class="comp-card glass-card" :class="{ 'is-registered': comp.registrat }">
        <div class="comp-info">
          <div class="comp-title">
            <h3>{{ comp.nom }}</h3>
            <Tag :severity="comp.registrat ? 'success' : 'warn'" :value="comp.registrat ? 'En Calendari' : 'Pendent'" />
          </div>
          <div class="comp-details text-secondary mt-2">
            <span><i class="ti ti-calendar"></i> {{ comp.data }}</span>
            <span v-if="comp.kms"><i class="ti ti-route"></i> {{ comp.kms }} km</span>
            <span v-if="comp.desnivell"><i class="ti ti-mountain"></i> {{ comp.desnivell }} m+</span>
          </div>
        </div>
      </div>
    </div>

    <!-- modal create -->
    <Dialog v-model:visible="createModalVisible" header="Nova Competició" modal :style="{ width: '500px' }">
      <div class="flex flex-col gap-4 mt-2">
        <div class="field">
          <label>Nom de la prova *</label>
          <InputText v-model="form.nom" class="w-full" placeholder="Ex: Marató de Barcelona" />
        </div>
        <div class="field">
          <label>Data *</label>
          <DatePicker v-model="form.data" dateFormat="dd/mm/yy" class="w-full" />
        </div>
        <div class="flex gap-4">
          <div class="field flex-1">
            <label>Distància (km)</label>
            <InputNumber v-model="form.kms" :minFractionDigits="0" :maxFractionDigits="2" class="w-full" />
          </div>
          <div class="field flex-1">
            <label>Desnivell (m+)</label>
            <InputNumber v-model="form.desnivell" class="w-full" />
          </div>
        </div>
        <div class="field">
          <label>Enllaç web de la cursa <span class="text-danger">*</span></label>
          <InputText v-model="form.enllac" class="w-full" placeholder="https://..." />
        </div>
        <div class="field">
          <label>Track de la cursa (.gpx opcional)</label>
          <input type="file" accept=".gpx" class="w-full file-input" @change="handleFileUpload" />
        </div>
        <div class="field">
          <label>Comentaris (opcional)</label>
          <Textarea v-model="form.comentaris" rows="3" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel·lar" icon="ti ti-x" text @click="createModalVisible = false" />
        <Button label="Guardar Objectiu" icon="ti ti-check" @click="handleCreate" :loading="creating" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
}
.page-title {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
}
.mt-4 { margin-top: 24px; }
.mt-2 { margin-top: 8px; }
.flex { display: flex; }
.flex-col { flex-direction: column; }
.gap-4 { gap: 16px; }
.flex-1 { flex: 1; }
.w-full { width: 100%; }
.field label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}
.text-center { text-align: center; }
.py-8 { padding-top: 32px; padding-bottom: 32px; }
.empty-state {
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.comp-card {
  padding: 20px 24px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-left: 4px solid transparent;
}
.comp-card.is-registered {
  border-left-color: var(--accent-success);
}
.comp-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.comp-title h3 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-primary);
}
.comp-details {
  display: flex;
  gap: 16px;
  font-size: 0.95rem;
}
.comp-details span {
  display: flex;
  align-items: center;
  gap: 6px;
}
.file-input {
  padding: 8px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
}
.text-danger {
  color: var(--accent-danger);
}
</style>
