<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getEntrenadorWeeks, createWeek, updateWeek } from '@/api/entrenador'
import { useToast } from 'primevue/usetoast'
import type { ManagedWeekWithCount } from '@/types'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import DatePicker from 'primevue/datepicker'
import WeekStatusBadge from '@/components/WeekStatusBadge.vue'
import { useI18n } from 'vue-i18n'

const toast = useToast()
const { t } = useI18n()
const weeks = ref<ManagedWeekWithCount[]>([])
const loading = ref(false)

const createModalVisible = ref(false)
const newWeekDate = ref<Date | null>(null)
const creating = ref(false)

const loadWeeks = async () => {
  loading.value = true
  try {
    weeks.value = await getEntrenadorWeeks()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'han pogut carregar les setmanes', life: 3000 })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadWeeks()
})

const openCreateModal = () => {
  // Preset to next Monday
  const d = new Date()
  d.setDate(d.getDate() + (1 + 7 - d.getDay()) % 7)
  if (d.getDay() === 0) d.setDate(d.getDate() + 1) // If today is sunday, get tomorrow
  newWeekDate.value = d
  createModalVisible.value = true
}

const handleCreate = async () => {
  if (!newWeekDate.value) return
  
  // Verify it's a Monday (1 in JS Date)
  if (newWeekDate.value.getDay() !== 1) {
    toast.add({ severity: 'warn', summary: 'Atenció', detail: 'Les setmanes han de començar en dilluns', life: 3000 })
    return
  }

  // Format as YYYY-MM-DD using local time (avoid UTC timezone shift issues)
  const yyyy = newWeekDate.value.getFullYear()
  const mm = String(newWeekDate.value.getMonth() + 1).padStart(2, '0')
  const dd = String(newWeekDate.value.getDate()).padStart(2, '0')
  const weekStart = `${yyyy}-${mm}-${dd}`

  creating.value = true
  try {
    await createWeek({ week_start: weekStart })
    toast.add({ severity: 'success', summary: 'Creat', detail: 'Setmana creada correctament', life: 3000 })
    createModalVisible.value = false
    loadWeeks()
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error || 'Error creant la setmana', life: 3000 })
  } finally {
    creating.value = false
  }
}

const updateStatus = async (week: ManagedWeekWithCount, newStatus: 'oberta'|'tancada'|'traspassada') => {
  if (week.estat === newStatus) return
  try {
    await updateWeek(week.id, { estat: newStatus })
    toast.add({ severity: 'success', summary: 'Actualitzat', detail: `La setmana s'ha canviat a: ${newStatus}`, life: 3000 })
    loadWeeks()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error actualitzant l\'estat', life: 3000 })
  }
}
</script>

<template>
  <div class="weeks-layout max-w-4xl mx-auto">
    <div class="page-header glass-card">
      <h1 class="page-title">{{ $t('weeksManager.title') }}</h1>
      <Button :label="$t('weeksManager.newWeek')" icon="ti ti-plus" @click="openCreateModal" />
    </div>

    <div class="weeks-list mt-4">
      <div v-if="loading && weeks.length === 0" class="text-center py-8 text-secondary">
        <i class="ti ti-loader ti-spin text-3xl mb-2"></i>
        <p>{{ $t('weeksManager.loading') }}</p>
      </div>

      <div v-else-if="weeks.length === 0" class="empty-state glass-card">
        <i class="ti ti-calendar text-4xl mb-4 text-muted"></i>
        <p>{{ $t('weeksManager.emptyState') }}</p>
        <p class="text-sm mt-2 text-muted">{{ $t('weeksManager.emptyStateSub') }}</p>
      </div>

      <div 
        v-for="week in weeks" 
        :key="week.id"
        class="week-card glass-card"
      >
        <div class="week-info">
          <div class="week-date">{{ $t('weeksManager.weekOf', { date: week.week_start }) }}</div>
          <WeekStatusBadge :estat="week.estat" />
        </div>
        
        <div class="week-stats">
          <i class="ti ti-users text-xl text-secondary"></i>
          <span>{{ $t('weeksManager.athletesResponded', { count: week.num_atletes_respost }) }}</span>
        </div>
        
        <div class="week-actions flex gap-2">
          <Button 
            v-tooltip.top="$t('weeksManager.open')"
            icon="ti ti-lock-open" 
            :severity="week.estat === 'oberta' ? 'success' : 'secondary'"
            :outlined="week.estat !== 'oberta'"
            @click="updateStatus(week, 'oberta')"
          />
          <Button 
            v-tooltip.top="$t('weeksManager.close')"
            icon="ti ti-lock" 
            :severity="week.estat === 'tancada' ? 'warn' : 'secondary'"
            :outlined="week.estat !== 'tancada'"
            @click="updateStatus(week, 'tancada')"
          />
          <Button 
            v-tooltip.top="$t('weeksManager.transfer')"
            icon="ti ti-send" 
            :severity="week.estat === 'traspassada' ? 'info' : 'secondary'"
            :outlined="week.estat !== 'traspassada'"
            @click="updateStatus(week, 'traspassada')"
          />
        </div>
      </div>
    </div>

    <Dialog v-model:visible="createModalVisible" :header="$t('weeksManager.modalTitle')" modal :style="{ width: '400px' }">
      <div class="py-4">
        <p class="text-secondary mb-4">{{ $t('weeksManager.modalDesc') }}</p>
        <DatePicker 
          v-model="newWeekDate" 
          dateFormat="dd/mm/yy" 
          class="w-full" 
          inline 
        />
      </div>
      <template #footer>
        <Button :label="$t('weeksManager.cancel')" icon="ti ti-x" text @click="createModalVisible = false" />
        <Button :label="$t('weeksManager.create')" icon="ti ti-check" @click="handleCreate" :loading="creating" />
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
.mb-2 { margin-bottom: 8px; }
.mb-4 { margin-bottom: 16px; }
.py-4 { padding-top: 16px; padding-bottom: 16px; }
.py-8 { padding-top: 32px; padding-bottom: 32px; }
.text-center { text-align: center; }
.text-sm { font-size: 0.875rem; }

.weeks-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-state {
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  color: var(--text-secondary);
}

.week-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.week-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.week-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 250px;
}

.week-date {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.week-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  flex: 1;
}
</style>
