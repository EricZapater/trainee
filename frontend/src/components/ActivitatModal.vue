<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import type { Activitat } from '@/types'

const props = defineProps<{
  visible: boolean
  activitat: Activitat | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'save', data: { nom: string, icona: string, color: string }): void
}>()

const isVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const formData = ref({
  nom: '',
  icona: 'ti-run',
  color: '#6366f1'
})

const availableIcons = [
  'ti-run', 'ti-mountain', 'ti-bike', 'ti-barbell', 
  'ti-activity', 'ti-ripple', 'ti-trophy', 'ti-swimming', 
  'ti-steering-wheel', 'ti-walk', 'ti-yoga'
]

watch(() => props.visible, (val) => {
  if (val) {
    if (props.activitat) {
      formData.value = {
        nom: props.activitat.nom,
        icona: props.activitat.icona,
        color: props.activitat.color
      }
    } else {
      formData.value = { nom: '', icona: 'ti-run', color: '#6366f1' }
    }
  }
})

const handleSave = () => {
  if (!formData.value.nom) return
  emit('save', formData.value)
}
</script>

<template>
  <Dialog 
    v-model:visible="isVisible" 
    :header="activitat ? 'Editar activitat' : 'Nova activitat'" 
    modal 
    :style="{ width: '450px' }"
  >
    <div class="form-group">
      <label>Nom de l'activitat</label>
      <InputText v-model="formData.nom" class="w-full" placeholder="Ex: Córrer" />
    </div>
    
    <div class="form-group">
      <label>Icona</label>
      <div class="icons-grid">
        <button 
          v-for="icon in availableIcons" 
          :key="icon"
          class="icon-btn"
          :class="{ 'is-selected': formData.icona === icon }"
          @click="formData.icona = icon"
        >
          <i :class="['ti', icon]"></i>
        </button>
      </div>
    </div>
    
    <div class="form-group">
      <label>Color</label>
      <div class="color-picker-wrapper">
        <input type="color" v-model="formData.color" class="color-input" />
        <span class="color-hex">{{ formData.color.toUpperCase() }}</span>
      </div>
    </div>
    
    <template #footer>
      <Button label="Cancel·lar" icon="ti ti-x" text @click="isVisible = false" />
      <Button label="Guardar" icon="ti ti-check" @click="handleSave" :disabled="!formData.nom" />
    </template>
  </Dialog>
</template>

<style scoped>
.form-group {
  margin-bottom: 24px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.icons-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.icon-btn {
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 12px;
  cursor: pointer;
  color: var(--text-primary);
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn i {
  font-size: 1.5rem;
}

.icon-btn:hover {
  background: var(--bg-hover);
  border-color: var(--border-hover);
}

.icon-btn.is-selected {
  border-color: var(--accent-primary);
  background: rgba(99, 102, 241, 0.1);
  color: var(--accent-primary);
}

.color-picker-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-input {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  padding: 0;
  background: transparent;
}

.color-input::-webkit-color-swatch-wrapper {
  padding: 0;
}

.color-input::-webkit-color-swatch {
  border: 1px solid var(--border);
  border-radius: 8px;
}

.color-hex {
  font-family: monospace;
  font-size: 1rem;
  color: var(--text-primary);
}
</style>
