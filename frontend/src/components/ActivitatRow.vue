<script setup lang="ts">
import ToggleSwitch from 'primevue/toggleswitch'
import Button from 'primevue/button'
import type { Activitat } from '@/types'

const props = defineProps<{
  activitat: Activitat
  index: number
}>()

const emit = defineEmits<{
  (e: 'edit', act: Activitat): void
  (e: 'toggle', act: Activitat, active: boolean): void
  (e: 'dragstart', event: DragEvent, index: number): void
  (e: 'dragover', event: DragEvent, index: number): void
  (e: 'drop', event: DragEvent, index: number): void
}>()
</script>

<template>
  <div 
    class="activitat-row"
    :class="{ 'is-inactive': !activitat.activa }"
    draggable="true"
    @dragstart="emit('dragstart', $event, index)"
    @dragover.prevent="emit('dragover', $event, index)"
    @drop.prevent="emit('drop', $event, index)"
  >
    <div class="drag-handle" title="Arrossega per reordenar">
      <i class="ti ti-grip-vertical"></i>
    </div>
    
    <div class="act-icon">
      <i :class="['ti', activitat.icona]" :style="{ color: activitat.color }"></i>
    </div>
    
    <div class="act-info">
      <span class="act-name">{{ activitat.nom }}</span>
    </div>
    
    <div class="act-color" :style="{ backgroundColor: activitat.color }" title="Color de l'activitat"></div>
    
    <div class="act-actions">
      <ToggleSwitch 
        :modelValue="activitat.activa" 
        @update:modelValue="emit('toggle', activitat, $event)" 
      />
      
      <Button 
        icon="ti ti-edit" 
        text 
        rounded 
        severity="secondary"
        @click="emit('edit', activitat)"
      />
    </div>
  </div>
</template>

<style scoped>
.activitat-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  margin-bottom: 8px;
  transition: all var(--transition-fast);
}

.activitat-row:hover {
  border-color: var(--border-hover);
  background: var(--bg-hover);
}

.activitat-row.is-inactive {
  opacity: 0.5;
  background: var(--bg-base);
}

.drag-handle {
  cursor: grab;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  padding: 4px;
}

.drag-handle:active {
  cursor: grabbing;
}

.act-icon i {
  font-size: 1.5rem;
}

.act-info {
  flex: 1;
}

.act-name {
  font-weight: 500;
  color: var(--text-primary);
}

.act-color {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.1);
}

.act-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}
</style>
