<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getSystemLogs, type SystemLog } from '@/api/logs'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'

const { t } = useI18n()
const toast = useToast()

const logs = ref<SystemLog[]>([])
const loading = ref(true)

async function fetchLogs() {
  loading.value = true
  try {
    logs.value = await getSystemLogs(200, 0)
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error carregant els logs.', life: 3000 })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchLogs()
})

const getSeverity = (nivell: string) => {
  switch (nivell) {
    case 'INFO':
      return 'info'
    case 'WARN':
      return 'warning'
    case 'ERROR':
      return 'danger'
    default:
      return 'info'
  }
}

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  const d = new Date(dateString)
  return d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
</script>

<template>
  <div class="manager-container slide-in">
    <div class="header-actions">
      <div>
        <h1 class="page-title"><i class="ti ti-activity page-icon"></i> Registre d'Accions</h1>
        <p class="page-subtitle">Visualització de l'historial d'accions automàtiques del sistema.</p>
      </div>
      <button class="btn btn-secondary" @click="fetchLogs">
        <i class="ti ti-refresh" :class="{ 'ti-spin': loading }"></i>
        Refrescar
      </button>
    </div>

    <div class="glass-card table-container">
      <DataTable
        :value="logs"
        :loading="loading"
        paginator
        :rows="15"
        dataKey="id"
        class="p-datatable-sm"
        responsiveLayout="scroll"
        emptyMessage="No s'han trobat logs."
      >
        <Column field="created_at" header="Data" sortable style="min-width: 160px">
          <template #body="{ data }">
            {{ formatDate(data.created_at) }}
          </template>
        </Column>

        <Column field="nivell" header="Nivell" sortable style="width: 100px">
          <template #body="{ data }">
            <Tag :severity="getSeverity(data.nivell)" :value="data.nivell" />
          </template>
        </Column>

        <Column field="accio" header="Acció" sortable style="min-width: 150px">
          <template #body="{ data }">
            <strong>{{ data.accio }}</strong>
          </template>
        </Column>

        <Column field="missatge" header="Missatge" style="min-width: 250px" />

        <Column field="detalls" header="Detalls">
          <template #body="{ data }">
            <pre v-if="data.detalls" class="log-details">{{ data.detalls }}</pre>
            <span v-else class="text-muted">-</span>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<style scoped>
.manager-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.table-container {
  padding: 10px;
}

.log-details {
  font-family: monospace;
  font-size: 0.85em;
  background-color: var(--bg-secondary);
  padding: 8px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-width: 300px;
  overflow-x: auto;
  margin: 0;
}
</style>
