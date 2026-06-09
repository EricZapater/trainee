<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getAllActivitats, createActivitat, updateActivitat, reorderActivitats, deleteActivitat } from '@/api/entrenador'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import type { Activitat } from '@/types'
import Button from 'primevue/button'
import ActivitatRow from '@/components/ActivitatRow.vue'
import ActivitatModal from '@/components/ActivitatModal.vue'

const toast = useToast()
const confirm = useConfirm()

const activitats = ref<Activitat[]>([])
const loading = ref(false)

const modalVisible = ref(false)
const editingActivitat = ref<Activitat | null>(null)

const loadData = async () => {
  loading.value = true
  try {
    activitats.value = await getAllActivitats()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'han pogut carregar les activitats', life: 3000 })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

const openCreateModal = () => {
  editingActivitat.value = null
  modalVisible.value = true
}

const openEditModal = (act: Activitat) => {
  editingActivitat.value = act
  modalVisible.value = true
}

const handleSave = async (data: { nom: string, icona: string, color: string }) => {
  try {
    if (editingActivitat.value) {
      await updateActivitat(editingActivitat.value.id, data)
      toast.add({ severity: 'success', summary: 'Actualitzat', detail: 'Activitat actualitzada', life: 3000 })
    } else {
      await createActivitat(data)
      toast.add({ severity: 'success', summary: 'Creat', detail: 'Activitat creada', life: 3000 })
    }
    modalVisible.value = false
    loadData()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error guardant l\'activitat', life: 3000 })
  }
}

const handleToggle = async (act: Activitat, active: boolean) => {
  try {
    await updateActivitat(act.id, { activa: active })
    act.activa = active
    // Auto-save reorder logically (active items group at top typically)
    // The backend query ORDER BY activa DESC already handles this on reload
    loadData()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error actualitzant l\'estat', life: 3000 })
  }
}

// Drag & Drop Reordering logic
const dragIndex = ref<number | null>(null)

const handleDragStart = (event: DragEvent, index: number) => {
  dragIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.dropEffect = 'move'
  }
}

const handleDrop = async (event: DragEvent, index: number) => {
  if (dragIndex.value === null || dragIndex.value === index) return
  
  const items = [...activitats.value]
  const draggedItem = items.splice(dragIndex.value, 1)[0]
  items.splice(index, 0, draggedItem)
  
  activitats.value = items
  dragIndex.value = null

  // Build payload for backend (id -> new ordre)
  const payload = items.map((act, i) => ({ id: act.id, ordre: i + 1 }))
  
  try {
    await reorderActivitats(payload)
    toast.add({ severity: 'success', summary: 'Reordenat', detail: 'Ordre guardat', life: 2000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error guardant el nou ordre', life: 3000 })
    loadData() // revert
  }
}
</script>

<template>
  <div class="activitats-layout max-w-4xl mx-auto">
    <div class="page-header glass-card">
      <h1 class="page-title">Gestió d'Activitats</h1>
      <Button label="Nova activitat" icon="ti ti-plus" @click="openCreateModal" />
    </div>

    <div class="activitats-list mt-4">
      <div v-if="loading && activitats.length === 0" class="text-center py-8 text-secondary">
        <i class="ti ti-loader ti-spin text-3xl mb-2"></i>
        <p>Carregant activitats...</p>
      </div>

      <div v-else-if="activitats.length === 0" class="empty-state glass-card">
        <i class="ti ti-activity text-4xl mb-4 text-muted"></i>
        <p>No hi ha activitats configurades.</p>
      </div>

      <template v-else>
        <div class="list-container">
          <ActivitatRow 
            v-for="(act, idx) in activitats" 
            :key="act.id"
            :activitat="act"
            :index="idx"
            @edit="openEditModal"
            @toggle="handleToggle"
            @dragstart="handleDragStart"
            @dragover="() => {}"
            @drop="handleDrop"
          />
        </div>
      </template>
    </div>

    <ActivitatModal 
      v-model:visible="modalVisible"
      :activitat="editingActivitat"
      @save="handleSave"
    />
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
.py-8 { padding-top: 32px; padding-bottom: 32px; }
.text-center { text-align: center; }

.empty-state {
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  color: var(--text-secondary);
}

.list-container {
  display: flex;
  flex-direction: column;
}
</style>
