<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { FilterMatchMode } from '@primevue/core/api'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import AutoComplete from 'primevue/autocomplete'
import DatePicker from 'primevue/datepicker'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { getAnuncis, createAnunci, getAnunciTags, uploadAnunciImages, type Anunci } from '@/api/anuncis'
import AnunciDrawer from '@/components/AnunciDrawer.vue'

const toast = useToast()

const anuncis = ref<Anunci[]>([])
const allTags = ref<string[]>([])
const loading = ref(false)

const createVisible = ref(false)
const createLoading = ref(false)
const formData = ref({
  titol: '',
  descripcio: '',
  enllac: '',
  tags: [] as string[]
})
const selectedImages = ref<File[]>([])

// AutoComplete tags
const filteredTags = ref<string[]>([])
const searchTags = (event: any) => {
  const query = event.query.toLowerCase()
  filteredTags.value = allTags.value.filter(t => t.toLowerCase().includes(query))
  // Option to create if not exists
  if (query && !filteredTags.value.includes(query)) {
    filteredTags.value.push(query) // Allow selecting the new tag
  }
}

const loadData = async () => {
  loading.value = true
  try {
    const [anuncisData, tagsData] = await Promise.all([
      getAnuncis(),
      getAnunciTags()
    ])
    anuncis.value = anuncisData
    allTags.value = tagsData
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error carregant anuncis', life: 3000 })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

const onFileChange = (e: any) => {
  if (e.target.files) {
    const files = Array.from(e.target.files) as File[]
    const validFiles = files.filter(f => f.size <= 1048576)
    if (validFiles.length < files.length) {
      toast.add({ severity: 'warn', summary: 'Avís', detail: 'S\'han descartat fitxers superiors a 1MB', life: 4000 })
    }
    selectedImages.value = validFiles
  }
}

const handleCreate = async () => {
  if (!formData.value.titol || !formData.value.descripcio) {
    toast.add({ severity: 'warn', summary: 'Avís', detail: 'El títol i descripció són obligatoris', life: 3000 })
    return
  }

  createLoading.value = true
  try {
    let imatgesUrls: string[] = []
    if (selectedImages.value.length > 0) {
      imatgesUrls = await uploadAnunciImages(selectedImages.value)
    }

    await createAnunci({
      titol: formData.value.titol,
      descripcio: formData.value.descripcio,
      enllac: formData.value.enllac ? formData.value.enllac : undefined,
      tags: formData.value.tags,
      imatges: imatgesUrls,
      actiu: true
    })

    toast.add({ severity: 'success', summary: 'Èxit', detail: 'Anunci creat correctament', life: 3000 })
    createVisible.value = false
    formData.value = { titol: '', descripcio: '', enllac: '', tags: [] }
    selectedImages.value = []
    await loadData()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'ha pogut crear l\'anunci', life: 3000 })
  } finally {
    createLoading.value = false
  }
}

// Table Filters
const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  titol: { value: null, matchMode: FilterMatchMode.CONTAINS },
  descripcio: { value: null, matchMode: FilterMatchMode.CONTAINS },
  autor_nom: { value: null, matchMode: FilterMatchMode.CONTAINS },
  tags: { value: null, matchMode: FilterMatchMode.CONTAINS },
  created_at: { value: null, matchMode: FilterMatchMode.BETWEEN }
})

const drawerVisible = ref(false)
const selectedAnunci = ref<Anunci | null>(null)

const onRowSelect = (event: any) => {
  selectedAnunci.value = event.data
  drawerVisible.value = true
}

const formatDate = (val: string) => {
  return new Date(val).toLocaleDateString('ca-ES')
}

// Custom tag filter because tags is an array
const tagFilterTemplate = (val: any) => {
  return val
}

const getTagSeverity = (tag: string) => {
  return 'info'
}

</script>

<template>
  <div class="anuncis-layout max-w-7xl mx-auto">
    <div class="header-section glass-card flex justify-between align-center p-4 mb-4 border-round">
      <h1 class="page-title m-0 text-primary" style="font-size: 1.8rem; font-weight: 700;">Tauler d'Anuncis</h1>
      <Button label="Nou Anunci" icon="ti ti-plus" @click="createVisible = true" />
    </div>

    <div class="content-section glass-card p-4 border-round">
      <DataTable 
        :value="anuncis" 
        :paginator="true" 
        :rows="10" 
        :loading="loading"
        v-model:filters="filters"
        filterDisplay="row"
        :globalFilterFields="['titol', 'descripcio', 'autor_nom']"
        selectionMode="single"
        @row-select="onRowSelect"
        class="anuncis-table"
        stripedRows
      >
        <template #empty>
          <div class="text-center p-4 text-secondary">No s'han trobat anuncis.</div>
        </template>
        
        <Column field="titol" header="Títol" :showFilterMenu="false">
          <template #body="{ data }">
            <span class="font-bold text-primary">{{ data.titol }}</span>
            <span v-if="data.estat === 'pendent'" class="ml-2 px-2 py-1 bg-orange-100 text-orange-600 border-round text-xs">Pendent d'aprovació</span>
            <span v-else-if="data.estat === 'rebutjat'" class="ml-2 px-2 py-1 bg-red-100 text-red-600 border-round text-xs">Rebutjat</span>
            <span v-else-if="!data.actiu" class="ml-2 px-2 py-1 bg-gray-200 text-gray-600 border-round text-xs">Inactiu</span>
          </template>
          <template #filter="{ filterModel, filterCallback }">
            <InputText v-model="filterModel.value" type="text" @input="filterCallback()" placeholder="Buscar per títol..." class="p-column-filter" />
          </template>
        </Column>

        <Column field="autor_nom" header="Autor" :showFilterMenu="false" style="min-width: 150px">
          <template #filter="{ filterModel, filterCallback }">
            <InputText v-model="filterModel.value" type="text" @input="filterCallback()" placeholder="Buscar per autor..." class="p-column-filter" />
          </template>
        </Column>

        <Column field="created_at" header="Data" :showFilterMenu="false" style="min-width: 150px">
          <template #body="{ data }">
            {{ formatDate(data.created_at) }}
          </template>
          <!-- Using a simple input text for date filtering as BETWEEN requires more setup or custom logic. Let's just use CONTAINS on formatted string if needed, or disable row filter for date to keep it simple -->
        </Column>

        <Column field="tags" header="Tags" :showFilterMenu="false" style="min-width: 200px">
          <template #body="{ data }">
            <div class="flex gap-1 flex-wrap">
              <span v-for="tag in data.tags" :key="tag" class="tag-chip">
                {{ tag }}
              </span>
            </div>
          </template>
          <template #filter="{ filterModel, filterCallback }">
            <InputText v-model="filterModel.value" type="text" @input="filterCallback()" placeholder="Buscar tag..." class="p-column-filter" />
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog v-model:visible="createVisible" header="Crear Nou Anunci" modal :style="{ width: '500px' }">
      <div class="flex flex-col gap-4 mt-2">
        <div class="field flex flex-col gap-2">
          <label class="font-semibold text-secondary">Títol</label>
          <InputText v-model="formData.titol" placeholder="Introdueix el títol" />
        </div>
        
        <div class="field flex flex-col gap-2">
          <label class="font-semibold text-secondary">Tags</label>
          <AutoComplete 
            v-model="formData.tags" 
            multiple 
            :suggestions="filteredTags" 
            @complete="searchTags" 
            placeholder="Selecciona o escriu tags..."
            class="w-full"
          />
        </div>

        <div class="field flex flex-col gap-2">
          <label class="font-semibold text-secondary">Enllaç (Opcional)</label>
          <InputText v-model="formData.enllac" placeholder="https://..." />
        </div>

        <div class="field flex flex-col gap-2">
          <label class="font-semibold text-secondary">Imatges (Max 1MB cadascuna)</label>
          <input type="file" @change="onFileChange" accept="image/*" multiple class="p-inputtext w-full p-2" />
        </div>

        <div class="field flex flex-col gap-2">
          <label class="font-semibold text-secondary">Descripció</label>
          <Textarea v-model="formData.descripcio" rows="5" placeholder="Contingut de l'anunci..." />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel·lar" icon="ti ti-x" text @click="createVisible = false" />
        <Button label="Publicar" icon="ti ti-send" @click="handleCreate" :loading="createLoading" />
      </template>
    </Dialog>

    <AnunciDrawer v-model:visible="drawerVisible" :anunci="selectedAnunci" @updated="loadData" />
    <Toast />
  </div>
</template>

<style scoped>
.tag-chip {
  background: rgba(99, 102, 241, 0.15);
  color: var(--accent-primary);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}
.flex { display: flex; }
.flex-col { flex-direction: column; }
.gap-2 { gap: 8px; }
.gap-4 { gap: 16px; }
.justify-between { justify-content: space-between; }
.align-center { align-items: center; }
.p-4 { padding: 16px; }
.mb-4 { margin-bottom: 16px; }
.mt-2 { margin-top: 8px; }
.text-center { text-align: center; }
.text-secondary { color: var(--text-secondary); }
.text-primary { color: var(--text-primary); }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
.w-full { width: 100%; }
.bg-red-100 { background-color: #fee2e2; }
.text-red-600 { color: #dc2626; }
.bg-orange-100 { background-color: #ffedd5; }
.text-orange-600 { color: #ea580c; }
.bg-gray-200 { background-color: #e5e7eb; }
.text-gray-600 { color: #4b5563; }
.text-xs { font-size: 0.75rem; }
.px-2 { padding-left: 8px; padding-right: 8px; }
.py-1 { padding-top: 4px; padding-bottom: 4px; }
.ml-2 { margin-left: 8px; }
</style>
