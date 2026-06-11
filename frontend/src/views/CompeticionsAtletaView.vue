<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAtletaCompeticions, createCompeticio, updateCompeticio } from '@/api/competicions'
import type { Competicio } from '@/types'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import DatePicker from 'primevue/datepicker'
import Tag from 'primevue/tag'
import Select from 'primevue/select'

const toast = useToast()
const { t } = useI18n()
const competicions = ref<Competicio[]>([])
const loading = ref(false)

const createModalVisible = ref(false)
const creating = ref(false)

const editingId = ref<string | null>(null)

const form = ref({
  nom: '',
  data: null as Date | null,
  tipus: 'A',
  kms: null as number | null,
  desnivell: null as number | null,
  enllac: '',
  track_gpx: null as File | null,
  comentaris: '',
  estat: 'activa' as 'activa' | 'descartada'
})

const tipusOptions = ['A', 'B', 'C']

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
  editingId.value = null
  form.value = {
    nom: '',
    data: null,
    tipus: 'A',
    kms: null,
    desnivell: null,
    enllac: '',
    track_gpx: null,
    comentaris: '',
    estat: 'activa'
  }
  createModalVisible.value = true
}

const openEditModal = (comp: Competicio) => {
  editingId.value = comp.id
  form.value = {
    nom: comp.nom,
    data: new Date(comp.data),
    tipus: comp.tipus,
    kms: comp.kms || null,
    desnivell: comp.desnivell || null,
    enllac: comp.enllac,
    track_gpx: null,
    comentaris: comp.comentaris || '',
    estat: comp.estat
  }
  createModalVisible.value = true
}

const handleDescartar = async (comp: Competicio) => {
  try {
    await updateCompeticio(comp.id, {
      nom: comp.nom,
      data: comp.data,
      tipus: comp.tipus,
      kms: comp.kms,
      desnivell: comp.desnivell,
      enllac: comp.enllac,
      comentaris: comp.comentaris,
      estat: 'descartada'
    })
    toast.add({ severity: 'success', summary: 'Descartada', detail: 'S\'ha descartat la competició', life: 3000 })
    loadCompeticions()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'ha pogut descartar', life: 3000 })
  }
}

const handleReactivar = async (comp: Competicio) => {
  try {
    await updateCompeticio(comp.id, {
      nom: comp.nom,
      data: comp.data,
      tipus: comp.tipus,
      kms: comp.kms,
      desnivell: comp.desnivell,
      enllac: comp.enllac,
      comentaris: comp.comentaris,
      estat: 'activa'
    })
    toast.add({ severity: 'success', summary: 'Activada', detail: 'S\'ha reactivat la competició', life: 3000 })
    loadCompeticions()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'ha pogut reactivar', life: 3000 })
  }
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
    
    const payload = {
      nom: form.value.nom,
      data: `${yyyy}-${mm}-${dd}`,
      tipus: form.value.tipus,
      kms: form.value.kms || undefined,
      desnivell: form.value.desnivell || undefined,
      enllac: form.value.enllac,
      track_gpx: form.value.track_gpx || undefined,
      comentaris: form.value.comentaris || undefined,
      estat: form.value.estat
    }

    if (editingId.value) {
      await updateCompeticio(editingId.value, payload)
      toast.add({ severity: 'success', summary: 'Actualitzat', detail: 'Competició actualitzada correctament', life: 3000 })
    } else {
      await createCompeticio(payload)
      toast.add({ severity: 'success', summary: 'Guardat', detail: 'Competició registrada correctament', life: 3000 })
    }
    createModalVisible.value = false
    loadCompeticions()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'ha pogut guardar la competició', life: 3000 })
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="competicions-layout max-w-4xl mx-auto">
    <div class="page-header glass-card">
      <h1 class="page-title">{{ $t('athleteCompetitions.title') }}</h1>
      <Button :label="$t('athleteCompetitions.newGoal')" icon="ti ti-plus" @click="openCreateModal" />
    </div>

    <div class="list mt-4">
      <div v-if="loading && competicions.length === 0" class="text-center py-8 text-secondary">
        <i class="ti ti-loader ti-spin text-3xl mb-2"></i>
        <p>{{ $t('calendar.loading') }}</p>
      </div>

      <div v-else-if="competicions.length === 0" class="empty-state glass-card">
        <i class="ti ti-trophy text-4xl mb-4 text-muted"></i>
        <p>{{ $t('athleteCompetitions.emptyStateTitle') }}</p>
        <p class="text-sm mt-2 text-muted">{{ $t('athleteCompetitions.emptyStateDesc') }}</p>
      </div>

      <div v-for="comp in competicions" :key="comp.id" class="comp-card glass-card" :class="{ 'is-registered': comp.registrat, 'is-discarded': comp.estat === 'descartada' }">
        <div class="comp-info">
          <div class="comp-title">
            <h3 :class="{ 'line-through text-muted': comp.estat === 'descartada' }">{{ comp.nom }}</h3>
            <div class="flex gap-2">
              <Tag v-if="comp.estat === 'descartada'" severity="secondary" :value="$t('athleteCompetitions.statusDiscarded')" />
              <Tag v-else :severity="comp.registrat ? 'success' : 'warn'" :value="comp.registrat ? $t('athleteCompetitions.statusRegistered') : $t('athleteCompetitions.statusPending')" />
            </div>
          </div>
          <div class="comp-details text-secondary mt-2" :class="{ 'opacity-50': comp.estat === 'descartada' }">
            <span><i class="ti ti-calendar"></i> {{ comp.data }}</span>
            <span><i class="ti ti-tag"></i> {{ $t('athleteCompetitions.type') }}: {{ comp.tipus || 'A' }}</span>
            <span v-if="comp.kms"><i class="ti ti-route"></i> {{ comp.kms }} km</span>
            <span v-if="comp.desnivell"><i class="ti ti-mountain"></i> {{ comp.desnivell }} m+</span>
          </div>
        </div>
        <div class="comp-actions" v-if="comp.estat === 'activa'">
          <Button :label="$t('athleteCompetitions.edit')" icon="ti ti-edit" severity="secondary" variant="text" size="small" @click="openEditModal(comp)" />
          <Button :label="$t('athleteCompetitions.discard')" icon="ti ti-trash" severity="danger" variant="text" size="small" @click="handleDescartar(comp)" />
        </div>
        <div class="comp-actions" v-else-if="comp.estat === 'descartada'">
          <Button :label="$t('athleteCompetitions.reactivate')" icon="ti ti-refresh" severity="success" variant="text" size="small" @click="handleReactivar(comp)" />
        </div>
      </div>
    </div>

    <!-- modal create / edit -->
    <Dialog v-model:visible="createModalVisible" :header="editingId ? $t('athleteCompetitions.modalEditTitle') : $t('athleteCompetitions.modalNewTitle')" modal :style="{ width: '500px' }">
      <div class="flex flex-col gap-4 mt-2">
        <div class="field">
          <label>{{ $t('athleteCompetitions.nameLabel') }}</label>
          <InputText v-model="form.nom" class="w-full" :placeholder="$t('athleteCompetitions.namePlaceholder')" />
        </div>
        <div class="field">
          <label>{{ $t('athleteCompetitions.dateLabel') }}</label>
          <DatePicker v-model="form.data" dateFormat="dd/mm/yy" class="w-full" />
        </div>
        <div class="field">
          <label>{{ $t('athleteCompetitions.typeLabel') }}</label>
          <Select v-model="form.tipus" :options="tipusOptions" :placeholder="$t('athleteCompetitions.typePlaceholder')" class="w-full" />
        </div>
        <div class="flex gap-4">
          <div class="field flex-1">
            <label>{{ $t('athleteCompetitions.distanceLabel') }}</label>
            <InputNumber v-model="form.kms" :minFractionDigits="0" :maxFractionDigits="2" class="w-full" />
          </div>
          <div class="field flex-1">
            <label>{{ $t('athleteCompetitions.elevationLabel') }}</label>
            <InputNumber v-model="form.desnivell" class="w-full" />
          </div>
        </div>
        <div class="field">
          <label><span v-html="$t('athleteCompetitions.linkLabel')"></span> <span class="text-danger">*</span></label>
          <InputText v-model="form.enllac" class="w-full" :placeholder="$t('athleteCompetitions.linkPlaceholder')" />
        </div>
        <div class="field">
          <label>{{ $t('athleteCompetitions.trackLabel') }}</label>
          <input type="file" accept=".gpx" class="w-full file-input" @change="handleFileUpload" />
        </div>
        <div class="field">
          <label>{{ $t('athleteCompetitions.commentsLabel') }}</label>
          <Textarea v-model="form.comentaris" rows="3" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" icon="ti ti-x" text @click="createModalVisible = false" />
        <Button :label="$t('athleteCompetitions.saveGoal')" icon="ti ti-check" @click="handleCreate" :loading="creating" />
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
.comp-card.is-discarded {
  border-left-color: #9ca3af;
  background: rgba(0,0,0,0.02);
}
.comp-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid var(--border);
  padding-top: 12px;
  margin-top: 4px;
}
.line-through { text-decoration: line-through; }
.opacity-50 { opacity: 0.5; }
.text-muted { color: #9ca3af; }
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
