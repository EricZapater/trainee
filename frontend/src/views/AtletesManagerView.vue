<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAtletes, toggleAtletaStatus, getAtletaStatusHistory } from '@/api/entrenador'
import type { UserStatusHistory } from '@/types'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'

const toast = useToast()
const { t } = useI18n()
const atletes = ref<{ id: string; nom: string; email: string; actiu: boolean }[]>([])
const loading = ref(false)

const historyDialogVisible = ref(false)
const selectedAtletaNom = ref('')
const selectedAtletaHistory = ref<UserStatusHistory[]>([])
const historyLoading = ref(false)

const loadAtletes = async () => {
  loading.value = true
  try {
    atletes.value = await getAtletes()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'han pogut carregar els atletes', life: 3000 })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadAtletes()
})

const handleToggleStatus = async (atleta: any, newValue: boolean) => {
  try {
    await toggleAtletaStatus(atleta.id, newValue)
    atleta.actiu = newValue
    toast.add({ severity: 'success', summary: 'Actualitzat', detail: 'Estat de l\'atleta actualitzat', life: 3000 })
  } catch (e: any) {
    // Revert visually on error
    atleta.actiu = !newValue
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.error || 'No s\'ha pogut actualitzar l\'estat', life: 3000 })
  }
}

const showHistory = async (atleta: any) => {
  selectedAtletaNom.value = atleta.nom
  historyDialogVisible.value = true
  historyLoading.value = true
  try {
    selectedAtletaHistory.value = await getAtletaStatusHistory(atleta.id)
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'ha pogut carregar l\'historial', life: 3000 })
  } finally {
    historyLoading.value = false
  }
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('ca-ES')
}
</script>

<template>
  <div class="atletes-layout max-w-4xl mx-auto">
    <div class="page-header glass-card">
      <h1 class="page-title">{{ $t('athletesManager.title') }}</h1>
    </div>

    <div class="list mt-4 glass-card p-4">
      <DataTable :value="atletes" :loading="loading" responsiveLayout="scroll" :emptyMessage="$t('athletesManager.emptyState')">
        <Column field="nom" :header="$t('athletesManager.name')"></Column>
        <Column field="email" :header="$t('athletesManager.email')"></Column>
        <Column :header="$t('athletesManager.status')">
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <ToggleSwitch :modelValue="data.actiu" @update:modelValue="handleToggleStatus(data, $event)" />
              <Tag :severity="data.actiu ? 'success' : 'danger'" :value="data.actiu ? $t('athletesManager.active') : $t('athletesManager.inactive')" />
            </div>
          </template>
        </Column>
        <Column :header="$t('athletesManager.actions')">
          <template #body="{ data }">
            <Button icon="ti ti-history" severity="secondary" variant="text" rounded :aria-label="$t('athletesManager.history')" @click="showHistory(data)" :title="$t('athletesManager.viewHistory')" />
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog v-model:visible="historyDialogVisible" modal :header="$t('athletesManager.historyTitle', { name: selectedAtletaNom })" :style="{ width: '500px' }">
      <div v-if="historyLoading" class="text-center py-4">
        <i class="ti ti-loader ti-spin text-2xl text-secondary"></i>
      </div>
      <div v-else-if="selectedAtletaHistory.length === 0" class="text-center py-4 text-muted">
        {{ $t('athletesManager.noHistory') }}
      </div>
      <ul v-else class="history-list">
        <li v-for="h in selectedAtletaHistory" :key="h.id" class="history-item">
          <div class="history-icon">
            <i :class="h.accio === 'activate' ? 'ti ti-check text-success' : 'ti ti-x text-danger'"></i>
          </div>
          <div class="history-details">
            <p><strong>{{ h.accio === 'activate' ? $t('athletesManager.activated') : $t('athletesManager.deactivated') }}</strong></p>
            <p class="text-sm text-secondary">{{ formatDate(h.created_at) }}</p>
          </div>
        </li>
      </ul>
      <template #footer>
        <Button :label="$t('athletesManager.close')" icon="ti ti-x" text severity="secondary" @click="historyDialogVisible = false" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.page-header {
  padding: 20px 24px;
}
.page-title {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
}
.mt-4 { margin-top: 24px; }
.p-4 { padding: 16px; }
.flex { display: flex; }
.items-center { align-items: center; }
.gap-2 { gap: 8px; }
.text-center { text-align: center; }
.py-4 { padding-top: 16px; padding-bottom: 16px; }
.text-secondary { color: var(--text-secondary); }
.text-muted { color: #9ca3af; }
.text-success { color: #10b981; }
.text-danger { color: #ef4444; }
.text-sm { font-size: 0.85rem; }

.history-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.05);
  padding: 12px;
  border-radius: 8px;
}
.history-icon {
  font-size: 1.5rem;
}
.history-details p {
  margin: 0;
}
</style>
