<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useCalendarStore } from '@/stores/useCalendarStore'
import type { Activitat } from '@/types'

const props = defineProps<{
  activitats: Activitat[]
  disabled: boolean
}>()

const calendarStore = useCalendarStore()
const { t } = useI18n()

const handleDragStart = (event: DragEvent, activitat: Activitat) => {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy'
    
    // Check if the dragged activity is part of the current selection
    const isSelected = calendarStore.selectedMobileActivities.some(a => a.id === activitat.id)
    
    let payload = []
    if (isSelected) {
      // Drag all selected activities
      payload = calendarStore.selectedMobileActivities
    } else {
      // Drag only this activity
      payload = [activitat]
    }
    
    event.dataTransfer.setData('application/json', JSON.stringify({
      type: 'multi',
      activities: payload
    }))
  }
}

const handleActivityTap = (activitat: Activitat) => {
  if (props.disabled) return
  const index = calendarStore.selectedMobileActivities.findIndex(a => a.id === activitat.id)
  if (index !== -1) {
    calendarStore.selectedMobileActivities.splice(index, 1)
  } else {
    calendarStore.selectedMobileActivities.push(activitat)
  }
}
</script>

<template>
  <div class="palette-container glass-card">
    <h3 class="palette-title">{{ $t('activityPalette.title') }}</h3>
    
    <div class="activities-list" :class="{ disabled }">
      <div 
        v-for="act in activitats" 
        :key="act.id"
        class="activity-item"
        :class="{ 'is-selected': calendarStore.selectedMobileActivities.some(a => a.id === act.id) }"
        :style="{ borderLeftColor: act.color }"
        :draggable="!disabled"
        @dragstart="handleDragStart($event, act)"
        @click="handleActivityTap(act)"
      >
        <i :class="['ti', act.icona]" :style="{ color: act.color }"></i>
        <span class="activity-name" :title="act.nom">{{ act.nom }}</span>
      </div>
      
      <div v-if="activitats.length === 0" class="no-activities">
        {{ $t('activityPalette.empty') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.palette-container {
  width: 130px;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  position: sticky;
  top: 88px;
  overflow: hidden;
  padding: 16px 12px;
}

.palette-title {
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  margin-bottom: 16px;
  text-align: center;
}

.activities-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  flex: 1;
  padding-right: 4px;
}

.activities-list.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.activity-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-left: 3px solid transparent;
  border-radius: var(--radius-sm);
  cursor: grab;
  transition: all var(--transition-fast);
}

.activity-item:hover {
  background: var(--bg-hover);
  border-color: var(--border-hover);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.activity-item.is-selected {
  background: var(--bg-hover);
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px var(--accent-primary);
  transform: scale(1.05);
}

.activity-item:active {
  cursor: grabbing;
}

.activity-item i {
  font-size: 1.5rem;
}

.activity-name {
  font-size: 0.75rem;
  color: var(--text-primary);
  text-align: center;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.no-activities {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-align: center;
  margin-top: 20px;
}

@media (max-width: 768px) {
  .palette-container {
    width: 100%;
    height: auto;
    position: relative;
    top: 0;
    padding: 12px;
  }
  
  .palette-title {
    display: none;
  }
  
  .activities-list {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    overflow-x: visible;
    padding-bottom: 0;
  }
  
  .activity-item {
    min-width: 75px;
    flex: 1 1 calc(25% - 8px);
    max-width: 100px;
  }
}
</style>
