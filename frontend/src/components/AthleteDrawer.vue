<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Drawer from 'primevue/drawer'
import type { AtletaSubmissionSummary } from '@/types'

const props = defineProps<{
  visible: boolean
  atleta: AtletaSubmissionSummary | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

const { t } = useI18n()

const isVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const dies = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte', 'Diumenge']

const getSlotsForDay = (dia: number) => {
  if (!props.atleta) return []
  return props.atleta.slots.filter(s => s.dia === dia)
}

const router = useRouter()
const handleSpecialClick = (slot: any) => {
  if (slot.competicio_id) {
    router.push(`/competicions/${slot.competicio_id}`)
  } else if (slot.test_id) {
    router.push(`/tests/${slot.test_id}`)
  }
}
</script>

<template>
  <Drawer 
    v-model:visible="isVisible" 
    position="right" 
    class="athlete-drawer"
    style="width: 420px; background: var(--bg-surface)"
  >
    <template #header>
      <div class="drawer-header" v-if="atleta">
        <h3>{{ atleta.nom }}</h3>
        <p class="email">{{ atleta.email }}</p>
      </div>
    </template>

    <div v-if="atleta" class="drawer-content">
      <div v-if="!atleta.ha_respost" class="no-response">
        {{ $t('athleteDrawer.noResponse') }}
      </div>
      
      <div v-else class="days-list">
        <template v-for="dia in 7" :key="dia">
          <div v-if="getSlotsForDay(dia-1).length > 0" class="day-section">
            <h4 class="day-title">{{ $t(`athleteDrawer.fullDays.${dia}`) }}</h4>
            <div class="slots-list">
              <div 
                v-for="slot in getSlotsForDay(dia-1)" 
                :key="slot.id" 
                class="slot-item"
                :style="{ borderLeftColor: slot.activitat_color }"
              >
                <div class="slot-moment">
                  #{{ slot.ordre + 1 }}
                  <template v-if="slot.competicio_id || slot.test_id">
                    <i :class="slot.competicio_id ? 'ti-trophy text-warning' : 'ti-clipboard-data text-primary'" 
                       class="ti cursor-pointer ml-auto" 
                       style="float: right; font-size: 1.2rem;" 
                       :title="slot.competicio_id ? $t('activityItem.viewCompetition') : $t('activityItem.viewTest')"
                       @click="handleSpecialClick(slot)"></i>
                  </template>
                </div>
                <div class="slot-info">
                  <i :class="['ti', slot.activitat_icona]" :style="{ color: slot.activitat_color }"></i>
                  <span class="act-name">{{ slot.activitat_nom }}</span>
                  <span class="duration">{{ slot.durada_hores >= 4.0 ? '>3' : slot.durada_hores }}h</span>
                </div>
                <div v-if="slot.notes" class="slot-notes">
                  <i class="ti ti-message-circle"></i>
                  <span>{{ slot.notes }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
        
        <div v-if="atleta.slots.length === 0" class="no-slots">
          {{ $t('athleteDrawer.noSlots') }}
        </div>
      </div>
    </div>
  </Drawer>
</template>

<style scoped>
.drawer-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: var(--text-primary);
}
.drawer-header .email {
  margin: 4px 0 0 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.drawer-content {
  padding-bottom: 24px;
}

.no-response, .no-slots {
  padding: 24px;
  text-align: center;
  color: var(--text-muted);
  background: var(--bg-base);
  border-radius: var(--radius-md);
  margin-top: 16px;
}

.days-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 16px;
}

.day-title {
  margin: 0 0 12px 0;
  font-size: 1rem;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
  padding-bottom: 8px;
}

.slots-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.slot-item {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-left: 4px solid transparent;
  border-radius: var(--radius-sm);
  padding: 12px;
}

.slot-moment {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 8px;
  font-weight: 600;
}

.slot-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slot-info i {
  font-size: 1.5rem;
}

.act-name {
  flex: 1;
  font-weight: 500;
}

.duration {
  font-size: 0.9rem;
  background: var(--bg-base);
  padding: 2px 8px;
  border-radius: 12px;
  color: var(--text-secondary);
}

.slot-notes {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--border);
  display: flex;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 0.9rem;
  align-items: flex-start;
}

.slot-notes i {
  margin-top: 2px;
}

.text-warning { color: var(--accent-warning); }
.text-primary { color: var(--accent-primary); }

.cursor-pointer {
  cursor: pointer;
}
.cursor-pointer:hover {
  filter: brightness(1.2);
}
</style>
