<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getEntrenadorCompeticions, traspassarCompeticio } from '@/api/competicions'
import type { Competicio } from '@/types'
import { useCompeticionsStore } from '@/stores/useCompeticionsStore'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import { updateCompeticioTipus } from '@/api/competicions'
import { useI18n } from 'vue-i18n'

const toast = useToast()
const { t } = useI18n()
const compStore = useCompeticionsStore()
const competicions = ref<Competicio[]>([])
const loading = ref(false)

const loadCompeticions = async () => {
  loading.value = true
  try {
    competicions.value = await getEntrenadorCompeticions()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error carregant competicions', life: 3000 })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadCompeticions()
})

const editingComp = ref<Competicio | null>(null)
const isEditingTipus = ref(false)
const selectedTipus = ref<string>('A')
const tipusOptions = ['A', 'B', 'C']

const openEditTipus = (comp: Competicio) => {
  editingComp.value = comp
  selectedTipus.value = comp.tipus || 'A'
  isEditingTipus.value = true
}

const saveTipus = async () => {
  if (!editingComp.value) return
  try {
    await updateCompeticioTipus(editingComp.value.id, selectedTipus.value)
    toast.add({ severity: 'success', summary: 'Actualitzat', detail: 'S\'ha actualitzat el tipus', life: 3000 })
    isEditingTipus.value = false
    editingComp.value = null
    loadCompeticions()
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.error || 'No s\'ha pogut actualitzar', life: 3000 })
  }
}

const handleTraspassar = async (comp: Competicio) => {
  try {
    await traspassarCompeticio(comp.id)
    toast.add({ severity: 'success', summary: 'Traspassat', detail: 'S\'ha creat/actualitzat la setmana del calendari correctament', life: 3000 })
    compStore.decrementCount()
    loadCompeticions()
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.error || 'No s\'ha pogut traspassar', life: 3000 })
  }
}
</script>

<template>
  <div class="competicions-layout max-w-4xl mx-auto">
    <div class="page-header glass-card">
      <h1 class="page-title">{{ $t('competitionsManager.title') }}</h1>
    </div>

    <div class="list mt-4">
      <div v-if="loading && competicions.length === 0" class="text-center py-8 text-secondary">
        <i class="ti ti-loader ti-spin text-3xl mb-2"></i>
        <p>{{ $t('competitionsManager.loading') }}</p>
      </div>

      <div v-else-if="competicions.length === 0" class="empty-state glass-card">
        <i class="ti ti-inbox text-4xl mb-4 text-muted"></i>
        <p>{{ $t('competitionsManager.emptyState') }}</p>
        <p class="text-sm mt-2 text-muted">{{ $t('competitionsManager.emptyStateSub') }}</p>
      </div>

      <div v-for="comp in competicions" :key="comp.id" class="comp-card glass-card">
        <div class="comp-info">
          <div class="comp-title">
            <h3>{{ comp.nom }}</h3>
            <span class="atleta-name"><i class="ti ti-user"></i> {{ comp.atleta_nom }}</span>
          </div>
          <div class="comp-details text-secondary mt-2">
            <span><i class="ti ti-calendar"></i> {{ comp.data }}</span>
            <span><i class="ti ti-tag"></i> {{ $t('competitionsManager.type') }}: {{ comp.tipus || 'A' }}</span>
            <span v-if="comp.kms"><i class="ti ti-route"></i> {{ comp.kms }} km</span>
            <span v-if="comp.desnivell"><i class="ti ti-mountain"></i> {{ comp.desnivell }} m+</span>
          </div>
          <div class="comp-comments mt-2" v-if="comp.comentaris || comp.enllac">
            <p v-if="comp.comentaris" class="text-sm">"{{ comp.comentaris }}"</p>
            <a v-if="comp.enllac" :href="comp.enllac" target="_blank" class="text-accent text-sm flex align-center gap-1">
              <i class="ti ti-link"></i> {{ $t('competitionsManager.link') }}
            </a>
          </div>
        </div>
        <div class="comp-actions">
          <Button :label="$t('competitionsManager.editType')" icon="ti ti-edit" severity="secondary" variant="text" @click="openEditTipus(comp)" />
          <Button :label="$t('competitionsManager.transferToCalendar')" icon="ti ti-calendar-plus" severity="info" @click="handleTraspassar(comp)" />
        </div>
      </div>
    </div>

    <Dialog v-model:visible="isEditingTipus" modal :header="$t('competitionsManager.editTypeTitle')" :style="{ width: '90vw', maxWidth: '25rem' }">
      <div class="flex flex-col gap-4 py-4">
        <label for="tipus" class="font-bold">{{ $t('competitionsManager.type') }} (A, B, C)</label>
        <Select id="tipus" v-model="selectedTipus" :options="tipusOptions" :placeholder="$t('competitionsManager.selectType')" class="w-full" />
      </div>
      <template #footer>
        <Button :label="$t('competitionsManager.cancel')" icon="ti ti-x" text severity="secondary" @click="isEditingTipus = false" />
        <Button :label="$t('competitionsManager.save')" icon="ti ti-check" severity="primary" @click="saveTipus" />
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
.text-center { text-align: center; }
.text-sm { font-size: 0.85rem; }
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
  gap: 16px;
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
.atleta-name {
  font-weight: 600;
  color: var(--accent-primary);
  background: rgba(99, 102, 241, 0.1);
  padding: 6px 12px;
  border-radius: 16px;
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
.comp-comments {
  background: rgba(255,255,255,0.03);
  padding: 12px;
  border-radius: 8px;
}
.comp-comments p {
  margin: 0 0 8px 0;
  font-style: italic;
  color: var(--text-primary);
}
.comp-actions {
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid var(--border);
  padding-top: 16px;
}
.text-accent { color: #3b82f6; text-decoration: none; }
.text-accent:hover { text-decoration: underline; }
.flex { display: flex; }
.align-center { align-items: center; }
.gap-1 { gap: 4px; }
</style>
