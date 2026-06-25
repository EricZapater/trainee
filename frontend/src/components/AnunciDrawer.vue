<script setup lang="ts">
import { computed } from 'vue'
import Drawer from 'primevue/drawer'
import Button from 'primevue/button'
import { useAuthStore } from '@/stores/useAuthStore'
import { updateAnunciStatus, updateAnunciEstat } from '@/api/anuncis'
import { useToast } from 'primevue/usetoast'
import type { Anunci } from '@/api/anuncis'

const props = defineProps<{
  visible: boolean
  anunci: Anunci | null
}>()

const emit = defineEmits(['update:visible', 'updated'])

const authStore = useAuthStore()
const toast = useToast()

const canDeactivate = computed(() => {
  if (!props.anunci) return false
  const r = authStore.usuari?.rol
  if (r === 'admin' || r === 'entrenador') return true
  return props.anunci.autor_id === authStore.usuari?.id
})

const isModerator = computed(() => {
  const r = authStore.usuari?.rol
  return r === 'admin' || r === 'entrenador'
})

const handleDeactivate = async () => {
  if (!props.anunci) return
  try {
    await updateAnunciStatus(props.anunci.id, false)
    toast.add({ severity: 'success', summary: 'Desactivat', detail: 'L\'anunci s\'ha desactivat', life: 3000 })
    emit('updated')
    emit('update:visible', false)
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'ha pogut desactivar', life: 3000 })
  }
}

const handleAprovar = async () => {
  if (!props.anunci) return
  try {
    await updateAnunciEstat(props.anunci.id, 'aprovat')
    toast.add({ severity: 'success', summary: 'Aprovat', detail: 'Anunci aprovat', life: 3000 })
    emit('updated')
    emit('update:visible', false)
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error aprovant l\'anunci', life: 3000 })
  }
}

const handleRebutjar = async () => {
  if (!props.anunci) return
  try {
    await updateAnunciEstat(props.anunci.id, 'rebutjat')
    toast.add({ severity: 'success', summary: 'Rebutjat', detail: 'Anunci rebutjat', life: 3000 })
    emit('updated')
    emit('update:visible', false)
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error rebutjant l\'anunci', life: 3000 })
  }
}

const formatDate = (d: string) => {
  return new Date(d).toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <Drawer :visible="visible" @update:visible="emit('update:visible', $event)" position="right" class="anunci-drawer" style="width: 450px;">
    <template #header>
      <h2 class="drawer-title" style="margin:0; font-size: 1.5rem; color: var(--text-primary);">Detalls de l'Anunci</h2>
    </template>
    
    <div v-if="anunci" class="drawer-content mt-4 flex flex-column gap-4">
      <div v-if="anunci.imatges && anunci.imatges.length > 0" class="anunci-images mb-4 flex overflow-x-auto gap-2 pb-2">
        <img v-for="(img, idx) in anunci.imatges" :key="idx" :src="img" alt="Imatge" class="border-round shadow-2" style="height: 200px; object-fit: cover; flex-shrink: 0;" />
      </div>

      <div class="field">
        <label class="text-sm text-secondary font-semibold">Títol</label>
        <div class="text-lg font-bold text-primary">{{ anunci.titol }}</div>
      </div>
      
      <div class="field">
        <label class="text-sm text-secondary font-semibold">Autor</label>
        <div class="text-md text-primary">{{ anunci.autor_nom }}</div>
      </div>

      <div class="field">
        <label class="text-sm text-secondary font-semibold">Data de publicació</label>
        <div class="text-md text-primary">{{ formatDate(anunci.created_at) }}</div>
      </div>

      <div class="field" v-if="anunci.tags && anunci.tags.length">
        <label class="text-sm text-secondary font-semibold">Tags</label>
        <div class="flex gap-2 flex-wrap mt-2">
          <span v-for="tag in anunci.tags" :key="tag" class="tag-badge">
            {{ tag }}
          </span>
        </div>
      </div>

      <div class="field mt-4">
        <label class="text-sm text-secondary font-semibold">Descripció</label>
        <div class="text-md text-primary" style="white-space: pre-wrap; line-height: 1.5;">{{ anunci.descripcio }}</div>
      </div>
      
      <div class="field mt-4" v-if="anunci.enllac">
        <Button label="Obrir Enllaç" icon="ti ti-external-link" class="w-full" severity="info" outlined @click="window.open(anunci.enllac, '_blank')" />
      </div>

      <div class="field mt-4 flex flex-column gap-2" v-if="isModerator && anunci.estat === 'pendent'">
        <Button label="Aprovar Anunci" icon="ti ti-check" severity="success" class="w-full" @click="handleAprovar" />
        <Button label="Rebutjar Anunci" icon="ti ti-x" severity="danger" outlined class="w-full" @click="handleRebutjar" />
      </div>
      
      <div class="field mt-4" v-if="canDeactivate && anunci.actiu && anunci.estat === 'aprovat'">
        <Button label="Desactivar Anunci" icon="ti ti-eye-off" severity="danger" class="w-full" @click="handleDeactivate" />
      </div>
    </div>
  </Drawer>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.text-secondary { color: var(--text-secondary); }
.text-primary { color: var(--text-primary); }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
.text-sm { font-size: 0.875rem; }
.text-md { font-size: 1rem; }
.text-lg { font-size: 1.25rem; }

.tag-badge {
  background: rgba(99, 102, 241, 0.15);
  color: var(--accent-primary);
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 600;
}
</style>
