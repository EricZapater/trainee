<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCalendarStore } from '@/stores/useCalendarStore'

const props = defineProps<{
  dia: number
  index: number
  disabled: boolean
}>()

const store = useCalendarStore()
const router = useRouter()
const showNotesInput = ref(false)

// Obtenim la dada directament pel dia i l'índex dins l'array
const slotData = computed(() => store.slotsByDay[props.dia]?.[props.index])

const remove = () => {
  if (props.disabled) return
  store.removeSlotFromDay(props.dia, props.index)
  showNotesInput.value = false
}

const toggleNotes = () => {
  showNotesInput.value = !showNotesInput.value
}

// Drag & Drop for reordering
const handleDragStart = (e: DragEvent) => {
  if (props.disabled) {
    e.preventDefault()
    return
  }
  // Passem la posició original per reordenar
  e.dataTransfer?.setData('application/x-trainee-reorder', JSON.stringify({ dia: props.dia, index: props.index }))
}

const isDragOver = ref(false)

const handleDragOver = (e: DragEvent) => {
  if (props.disabled) return
  if (e.dataTransfer?.types.includes('application/x-trainee-reorder')) {
    isDragOver.value = true
  }
}

const handleDragLeave = () => {
  isDragOver.value = false
}

const handleDrop = (e: DragEvent) => {
  isDragOver.value = false
  if (props.disabled) return
  
  const reorderData = e.dataTransfer?.getData('application/x-trainee-reorder')
  if (reorderData) {
    e.stopPropagation() // Prevent column drop
    const { dia: fromDia, index: fromIndex } = JSON.parse(reorderData)
    // Permetem moure només dins del mateix dia
    if (fromDia === props.dia && fromIndex !== props.index) {
      store.moveSlot(props.dia, fromIndex, props.index)
    }
  }
}

const handleSpecialClick = () => {
  if (slotData.value?.competicio_id) {
    router.push(`/competicions/${slotData.value.competicio_id}`)
  } else if (slotData.value?.test_id) {
    router.push(`/tests/${slotData.value.test_id}`)
  }
}
</script>

<template>
  <div 
    v-if="slotData"
    class="slot-cell filled-state"
    :class="{ 
      'disabled': disabled,
      'drag-over': isDragOver
    }"
    :style="{ borderLeftColor: slotData.activitat_color }"
    :draggable="!disabled"
    @dragstart="handleDragStart"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <button v-if="!disabled" class="btn-remove" @click="remove" title="Eliminar">
      <i class="ti ti-x"></i>
    </button>

    <div class="slot-header" 
         :class="{ 'cursor-pointer hover-highlight': slotData.competicio_id || slotData.test_id }" 
         @click="handleSpecialClick"
         :title="slotData.competicio_id ? 'Veure registre de la competició' : (slotData.test_id ? 'Veure registre del test' : '')">
      <div class="drag-handle" v-if="!disabled">
        <i class="ti ti-grip-vertical"></i>
      </div>
      <i :class="['ti', slotData.activitat_icona]" :style="{ color: slotData.activitat_color }"></i>
      <span class="slot-name" :title="slotData.activitat_nom">{{ slotData.activitat_nom }}</span>
      <i v-if="slotData.competicio_id" class="ti ti-trophy ml-auto" style="color: var(--accent-warning);" v-tooltip.top="'Competició programada'"></i>
      <i v-if="slotData.test_id" class="ti ti-clipboard-data ml-auto" style="color: var(--accent-primary);" v-tooltip.top="'Test programat'"></i>
    </div>

    <div class="slot-controls">
      <select 
        v-model="slotData.durada_hores" 
        class="duration-select" 
        :disabled="disabled"
      >
        <option :value="0.5">0.5 h</option>
        <option :value="1.0">1.0 h</option>
        <option :value="1.5">1.5 h</option>
        <option :value="2.0">2.0 h</option>
        <option :value="2.5">2.5 h</option>
        <option :value="3.0">3.0 h</option>
      </select>
      
      <button 
        class="btn-notes" 
        :class="{ 'has-notes': !!slotData.notes }"
        @click="toggleNotes" 
        title="Notes d'aquest entrenament"
      >
        <i class="ti ti-message-circle"></i>
      </button>
    </div>

    <div v-if="showNotesInput" class="notes-container">
      <textarea 
        v-model="slotData.notes" 
        class="notes-input" 
        placeholder="Notes..."
        :disabled="disabled"
        rows="2"
      ></textarea>
    </div>
  </div>
</template>

<style scoped>
.slot-cell {
  background: var(--bg-surface);
  border-radius: var(--radius-sm);
  min-height: 80px;
  position: relative;
  transition: all var(--transition-fast);
  display: flex;
  flex-direction: column;
}

.slot-cell.drag-over {
  border-top: 3px solid var(--accent-primary);
  margin-top: -3px; /* visual hack for drop indicator */
}

.filled-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 8px;
  border: 1px solid var(--border);
  border-left: 3px solid transparent;
  border-radius: var(--radius-sm);
  background: var(--bg-card);
}

.btn-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  display: none;
}

.slot-cell:hover .btn-remove {
  display: block;
}

.btn-remove:hover {
  color: var(--accent-danger);
  background: rgba(239, 68, 68, 0.1);
}

.slot-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  padding: 4px;
  margin-left: -4px;
  border-radius: 4px;
  transition: background 0.2s;
}

.cursor-pointer {
  cursor: pointer;
}

.hover-highlight:hover {
  background: rgba(255, 255, 255, 0.05);
}

.drag-handle {
  color: var(--text-muted);
  cursor: grab;
  padding-right: 4px;
}

.drag-handle:active {
  cursor: grabbing;
}

.slot-header i:not(.ti-grip-vertical) {
  font-size: 1.2rem;
}

.slot-name {
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slot-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
}

.duration-select {
  background: var(--bg-surface);
  border: 1px solid var(--accent-primary);
  color: var(--accent-primary);
  font-size: 0.85rem;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  text-align: center;
}

.duration-select:disabled {
  opacity: 0.7;
  cursor: default;
}

.btn-notes {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 1.1rem;
  padding: 2px;
  border-radius: 4px;
}

.btn-notes:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.btn-notes.has-notes {
  color: var(--accent-primary);
}

.notes-container {
  margin-top: 8px;
  border-top: 1px dashed var(--border);
  padding-top: 8px;
}

.notes-input {
  width: 100%;
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 0.75rem;
  padding: 4px;
  resize: vertical;
  resize: vertical;
  min-height: 40px;
}

@media (max-width: 768px) {
  .btn-remove {
    display: block; /* always show on mobile */
    background: rgba(239, 68, 68, 0.1);
    color: var(--accent-danger);
    padding: 6px;
    border-radius: var(--radius-sm);
  }
  
  .duration-select, .btn-notes, .btn-remove {
    min-width: 32px;
    min-height: 32px;
  }
  
  .slot-cell {
    min-height: 90px;
  }
}

.ml-auto {
  margin-left: auto;
}
</style>
