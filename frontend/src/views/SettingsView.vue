<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getCronSettings, updateCronSettings, type SystemSettings } from '@/api/settings'
import { useToast } from 'primevue/usetoast'
import InputSwitch from 'primevue/inputswitch'
import MultiSelect from 'primevue/multiselect'
import Button from 'primevue/button'

const toast = useToast()
const loading = ref(true)
const saving = ref(false)

const settings = ref<SystemSettings>({
  week_generator: { time: '00:00', days: [], enabled: false },
  reminder_cron: { time: '06:00', days: [], enabled: false }
})

const dayOptions = [
  { label: 'Dilluns', value: 1 },
  { label: 'Dimarts', value: 2 },
  { label: 'Dimecres', value: 3 },
  { label: 'Dijous', value: 4 },
  { label: 'Divendres', value: 5 },
  { label: 'Dissabte', value: 6 },
  { label: 'Diumenge', value: 0 }
]

async function loadSettings() {
  loading.value = true
  try {
    settings.value = await getCronSettings()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'han pogut carregar les configuracions.', life: 3000 })
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  saving.value = true
  try {
    const res = await updateCronSettings(settings.value)
    toast.add({ severity: 'success', summary: 'Guardat', detail: res.message, life: 3000 })
  } catch (err: any) {
    const msg = err.response?.data?.error || 'Error desant configuracions.'
    toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 3000 })
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<template>
  <div class="manager-container slide-in">
    <div class="header-actions">
      <div>
        <h1 class="page-title"><i class="ti ti-settings page-icon"></i> Configuració del Sistema</h1>
        <p class="page-subtitle">Ajusta els paràmetres de les tasques automàtiques.</p>
      </div>
      <Button label="Guardar Canvis" icon="ti ti-device-floppy" @click="saveSettings" :loading="saving" />
    </div>

    <div v-if="loading" class="flex justify-center p-8">
      <i class="ti ti-loader ti-spin text-4xl text-gray-400"></i>
    </div>

    <div v-else class="settings-grid">
      <!-- Week Generator Settings -->
      <div class="glass-card setting-card">
        <div class="setting-header">
          <div>
            <h3>Creació Automàtica de Setmanes</h3>
            <p class="text-sm text-muted">Genera les setmanes buides per a la planificació següent.</p>
          </div>
          <InputSwitch v-model="settings.week_generator.enabled" />
        </div>

        <div class="setting-body" :class="{ 'disabled-content': !settings.week_generator.enabled }">
          <div class="field">
            <label>Hora d'execució</label>
            <input type="time" v-model="settings.week_generator.time" class="p-inputtext p-component w-full" />
          </div>
          <div class="field mt-4">
            <label>Dies de la setmana</label>
            <MultiSelect 
              v-model="settings.week_generator.days" 
              :options="dayOptions" 
              optionLabel="label" 
              optionValue="value" 
              display="chip" 
              placeholder="Selecciona els dies" 
              class="w-full" 
            />
          </div>
        </div>
      </div>

      <!-- Reminder Cron Settings -->
      <div class="glass-card setting-card">
        <div class="setting-header">
          <div>
            <h3>Recordatoris d'Entrenament</h3>
            <p class="text-sm text-muted">Envia emails recordant als atletes que omplin els entrenaments.</p>
          </div>
          <InputSwitch v-model="settings.reminder_cron.enabled" />
        </div>

        <div class="setting-body" :class="{ 'disabled-content': !settings.reminder_cron.enabled }">
          <div class="field">
            <label>Hora d'execució</label>
            <input type="time" v-model="settings.reminder_cron.time" class="p-inputtext p-component w-full" />
          </div>
          <div class="field mt-4">
            <label>Dies de la setmana</label>
            <MultiSelect 
              v-model="settings.reminder_cron.days" 
              :options="dayOptions" 
              optionLabel="label" 
              optionValue="value" 
              display="chip" 
              placeholder="Selecciona els dies" 
              class="w-full" 
            />
          </div>
        </div>
      </div>
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

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}

.setting-card {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.setting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
  padding-bottom: 16px;
}

.setting-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.text-muted {
  color: var(--text-secondary);
  margin-top: 4px;
}

.setting-body {
  transition: opacity 0.3s ease;
}

.disabled-content {
  opacity: 0.5;
  pointer-events: none;
}

.field label {
  display: block;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.mt-4 {
  margin-top: 16px;
}

.w-full {
  width: 100%;
}
</style>
