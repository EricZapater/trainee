<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Checkbox from 'primevue/checkbox'
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { 
  getMaterialProductes, 
  createMaterialProducte, 
  updateMaterialProducte, 
  deleteMaterialProducte, 
  uploadMaterialImage,
  getMaterialSettings, 
  updateMaterialSettings,
  getMaterialComandes, 
  updateMaterialComanda,
  deleteMaterialComanda,
  bulkUpdateComandesState,
  exportMaterialComandesCSV,
  type GetComandesParams
} from '@/api/material'
import type { MaterialProducte, MaterialComanda, MaterialSettings } from '@/types'

const toast = useToast()

const activeTab = ref<'catalog' | 'orders'>('orders')
const loading = ref(false)
const submitting = ref(false)

// Global settings
const settings = ref<MaterialSettings>({ enabled: false })

// Catalog data
const productes = ref<MaterialProducte[]>([])
const productDialogVisible = ref(false)
const editingProduct = ref<MaterialProducte | null>(null)
const productForm = ref({
  nom: '',
  descripcio: '',
  tallesStr: 'XS, S, M, L, XL',
  requereix_talla: true,
  preu: 0,
  actiu: true,
  imatges: [] as string[]
})
const uploadingImage = ref(false)

// Orders data & filters
const comandes = ref<MaterialComanda[]>([])
const filters = ref({
  start_date: '',
  end_date: '',
  estat: ''
})

const estatOptions = [
  { label: 'Tots els estats', value: '' },
  { label: 'Pendent', value: 'pendent' },
  { label: 'Bloquejada', value: 'bloquejada' },
  { label: 'Pagada', value: 'pagada' },
  { label: 'Servida', value: 'servida' }
]

const loadSettings = async () => {
  try {
    settings.value = await getMaterialSettings()
  } catch (e) {
    console.error('Error carregant configuració', e)
  }
}

const loadCatalog = async () => {
  loading.value = true
  try {
    productes.value = await getMaterialProductes()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error carregant el catàleg de productes', life: 3000 })
  } finally {
    loading.value = false
  }
}

const loadComandes = async () => {
  loading.value = true
  try {
    const params: GetComandesParams = {}
    if (filters.value.start_date) params.start_date = filters.value.start_date
    if (filters.value.end_date) params.end_date = filters.value.end_date
    if (filters.value.estat) params.estat = filters.value.estat

    comandes.value = await getMaterialComandes(params)
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error carregant les comandes', life: 3000 })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadSettings()
  loadComandes()
  loadCatalog()
})

const toggleGlobalSettings = async () => {
  try {
    const updated = await updateMaterialSettings(!settings.value.enabled)
    settings.value = updated
    toast.add({
      severity: updated.enabled ? 'success' : 'warn',
      summary: 'Configuració actualitzada',
      detail: updated.enabled ? 'Comandes obertes per als atletes' : 'Comandes tancades',
      life: 3000
    })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error en canviar l\'estat del commutador', life: 3000 })
  }
}

// PRODUCT CATALOG HANDLERS
const openNewProductDialog = () => {
  editingProduct.value = null
  productForm.value = {
    nom: '',
    descripcio: '',
    tallesStr: 'XS, S, M, L, XL',
    requereix_talla: true,
    preu: 0,
    actiu: true,
    imatges: []
  }
  productDialogVisible.value = true
}

const openEditProductDialog = (p: MaterialProducte) => {
  editingProduct.value = p
  productForm.value = {
    nom: p.nom,
    descripcio: p.descripcio,
    tallesStr: p.talles ? p.talles.join(', ') : '',
    requereix_talla: p.requereix_talla,
    preu: p.preu,
    actiu: p.actiu,
    imatges: p.imatges ? [...p.imatges] : []
  }
  productDialogVisible.value = true
}

const handleImageUpload = async (e: Event) => {
  const target = e.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return

  const file = target.files[0]
  uploadingImage.value = true
  try {
    const url = await uploadMaterialImage(file)
    productForm.value.imatges.push(url)
    toast.add({ severity: 'success', summary: 'Imatge pujada', detail: 'S\'ha afegit la imatge al producte', life: 2500 })
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error en pujar la imatge', life: 3000 })
  } finally {
    uploadingImage.value = false
    target.value = ''
  }
}

const removeProductImage = (index: number) => {
  productForm.value.imatges.splice(index, 1)
}

const handleSaveProduct = async () => {
  if (!productForm.value.nom.trim()) {
    toast.add({ severity: 'warn', summary: 'Avís', detail: 'El nom del producte és obligatori', life: 3000 })
    return
  }

  const tallesArray = productForm.value.tallesStr
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0)

  submitting.value = true
  try {
    const payload = {
      nom: productForm.value.nom.trim(),
      descripcio: productForm.value.descripcio.trim(),
      talles: tallesArray,
      requereix_talla: productForm.value.requereix_talla,
      preu: productForm.value.preu,
      actiu: productForm.value.actiu,
      imatges: productForm.value.imatges
    }

    if (editingProduct.value) {
      await updateMaterialProducte(editingProduct.value.id, payload)
      toast.add({ severity: 'success', summary: 'Producte actualitzat', detail: 'S\'han desat els canvis', life: 3000 })
    } else {
      await createMaterialProducte(payload)
      toast.add({ severity: 'success', summary: 'Producte creat', detail: 'Producte afegit al catàleg', life: 3000 })
    }

    productDialogVisible.value = false
    loadCatalog()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error en guardar el producte', life: 3000 })
  } finally {
    submitting.value = false
  }
}

const handleDeleteProduct = async (p: MaterialProducte) => {
  if (!confirm(`Segur que vols eliminar el producte "${p.nom}"?`)) return
  try {
    await deleteMaterialProducte(p.id)
    toast.add({ severity: 'success', summary: 'Producte eliminat', detail: 'S\'ha eliminat el producte del catàleg', life: 3000 })
    loadCatalog()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error en eliminar el producte', life: 3000 })
  }
}

// ORDERS MANAGEMENT HANDLERS
const handleStatusChange = async (c: MaterialComanda, newEstat: string) => {
  try {
    await updateMaterialComanda(c.id, {
      talla: c.talla,
      quantitat: c.quantitat,
      estat: newEstat,
      notes: c.notes
    })
    c.estat = newEstat as any
    toast.add({ severity: 'success', summary: 'Estat actualitzat', detail: `Comanda de ${c.atleta_nom} canviada a ${newEstat}`, life: 2500 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error en actualitzar l\'estat de la comanda', life: 3000 })
    loadComandes()
  }
}

const handleBulkLockPending = async () => {
  const pendingIds = comandes.value.filter(c => c.estat === 'pendent').map(c => c.id)
  if (pendingIds.length === 0) {
    toast.add({ severity: 'info', summary: 'Informació', detail: 'No hi ha cap comanda en estat pendent per bloquejar', life: 3000 })
    return
  }

  if (!confirm(`Vols bloquejar totes les ${pendingIds.length} comandes pendents? Els atletes ja no les podran modificar.`)) return

  try {
    await bulkUpdateComandesState(pendingIds, 'bloquejada')
    toast.add({ severity: 'success', summary: 'Comandes bloquejades', detail: `S'han bloquejat ${pendingIds.length} comandes`, life: 3000 })
    loadComandes()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error en bloquejar les comandes pendents', life: 3000 })
  }
}

const handleDeleteOrder = async (c: MaterialComanda) => {
  if (!confirm(`Eliminar la comanda de ${c.atleta_nom} ${c.atleta_cognoms} (${c.producte_nom})?`)) return
  try {
    await deleteMaterialComanda(c.id)
    toast.add({ severity: 'success', summary: 'Comanda eliminada', detail: 'S\'ha eliminat la comanda', life: 2500 })
    loadComandes()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error en eliminar la comanda', life: 3000 })
  }
}

const handleExportCSV = async () => {
  try {
    const blob = await exportMaterialComandesCSV(filters.value)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `comandes_material_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    toast.add({ severity: 'success', summary: 'Exportació completada', detail: 'S\'ha descarregat el fitxer CSV', life: 3000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error en exportar les comandes', life: 3000 })
  }
}

const totalImport = computed(() => {
  return comandes.value.reduce((sum, c) => sum + (c.preu_total || 0), 0)
})

const totalUnits = computed(() => {
  return comandes.value.reduce((sum, c) => sum + (c.quantitat || 0), 0)
})

const getEstatSeverity = (estat: string) => {
  switch (estat) {
    case 'pendent': return 'warn'
    case 'bloquejada': return 'secondary'
    case 'pagada': return 'info'
    case 'servida': return 'success'
    default: return 'info'
  }
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="manager-container">
    <Toast />

    <header class="page-header">
      <div>
        <h1>Gestió de Catàleg i Comandes</h1>
        <p class="subtitle">Administra els productes disponibles i gestiona les sol·licituds dels atletes</p>
      </div>

      <!-- Control Global ON/OFF -->
      <div class="global-switch-card">
        <div class="switch-info">
          <span class="switch-title">Obertura de Comandes</span>
          <span class="switch-status" :class="{ active: settings.enabled }">
            {{ settings.enabled ? 'OBERT per als atletes' : 'TANCAT per als atletes' }}
          </span>
        </div>
        <Button 
          :label="settings.enabled ? 'Desactivar Comandes' : 'Activar Comandes'" 
          :icon="settings.enabled ? 'pi pi-lock' : 'pi pi-lock-open'" 
          :class="settings.enabled ? 'p-button-danger' : 'p-button-success'"
          @click="toggleGlobalSettings"
        />
      </div>
    </header>

    <!-- Nav Tabs -->
    <div class="tabs-nav">
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'orders' }" 
        @click="activeTab = 'orders'; loadComandes()"
      >
        <i class="pi pi-list"></i>
        <span>Comandes Rebutes ({{ comandes.length }})</span>
      </button>

      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'catalog' }" 
        @click="activeTab = 'catalog'; loadCatalog()"
      >
        <i class="pi pi-box"></i>
        <span>Gestió del Catàleg ({{ productes.length }})</span>
      </button>
    </div>

    <!-- PESTANYA 1: GESTIÓ DE COMANDES -->
    <div v-if="activeTab === 'orders'" class="tab-content">
      <!-- Barra de filtres i accions -->
      <div class="filters-bar">
        <div class="filter-inputs">
          <div class="filter-group">
            <label>Data inici</label>
            <input type="date" v-model="filters.start_date" class="date-input" @change="loadComandes" />
          </div>

          <div class="filter-group">
            <label>Data fi</label>
            <input type="date" v-model="filters.end_date" class="date-input" @change="loadComandes" />
          </div>

          <div class="filter-group">
            <label>Estat</label>
            <Select 
              v-model="filters.estat" 
              :options="estatOptions" 
              optionLabel="label" 
              optionValue="value" 
              class="w-48"
              @change="loadComandes"
            />
          </div>
        </div>

        <div class="actions-group">
          <Button 
            label="Bloquejar Pendents" 
            icon="pi pi-lock" 
            class="p-button-secondary"
            v-tooltip.top="'Bloqueja totes les comandes pendents perquè els atletes no les puguin editar'"
            @click="handleBulkLockPending"
          />
          <Button 
            label="Exportar Excel (CSV)" 
            icon="pi pi-file-excel" 
            class="p-button-success" 
            @click="handleExportCSV"
          />
        </div>
      </div>

      <!-- Resum en xifres -->
      <div class="summary-cards">
        <div class="summary-card">
          <span class="summary-label">Total Comandes</span>
          <span class="summary-value">{{ comandes.length }}</span>
        </div>
        <div class="summary-card">
          <span class="summary-label">Total Unitats</span>
          <span class="summary-value">{{ totalUnits }}</span>
        </div>
        <div class="summary-card highlight">
          <span class="summary-label">Import Total</span>
          <span class="summary-value">{{ totalImport.toFixed(2) }} €</span>
        </div>
      </div>

      <!-- Taula de comandes -->
      <div v-if="loading" class="loading-state">
        <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
        <p>Carregant comandes...</p>
      </div>

      <div v-else-if="comandes.length === 0" class="empty-state">
        <i class="pi pi-inbox"></i>
        <p>No s'ha trobat cap comanda amb els filtres seleccionats.</p>
      </div>

      <div v-else class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Data i Hora</th>
              <th>Atleta</th>
              <th>Producte</th>
              <th>Talla</th>
              <th>Unitats</th>
              <th>P. Unitari</th>
              <th>Total</th>
              <th>Estat Comanda</th>
              <th>Notes</th>
              <th>Accions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in comandes" :key="c.id">
              <td class="text-xs text-gray-400">{{ formatDate(c.created_at) }}</td>
              <td>
                <div class="font-semibold">{{ c.atleta_nom }} {{ c.atleta_cognoms }}</div>
                <div class="text-xs text-gray-400">{{ c.atleta_email }}</div>
              </td>
              <td class="font-medium">{{ c.producte_nom }}</td>
              <td>
                <span class="talla-badge">{{ c.talla || 'N/A' }}</span>
              </td>
              <td class="font-bold">{{ c.quantitat }}</td>
              <td>{{ c.preu_unitari.toFixed(2) }} €</td>
              <td class="font-bold text-emerald-400">{{ c.preu_total.toFixed(2) }} €</td>
              <td>
                <Select 
                  :modelValue="c.estat" 
                  :options="[
                    { label: 'Pendent', value: 'pendent' },
                    { label: 'Bloquejada', value: 'bloquejada' },
                    { label: 'Pagada', value: 'pagada' },
                    { label: 'Servida', value: 'servida' }
                  ]"
                  optionLabel="label"
                  optionValue="value"
                  class="status-select p-inputtext-sm"
                  @change="(e: any) => handleStatusChange(c, e.value)"
                />
              </td>
              <td class="text-xs text-gray-300 max-w-xs truncate">{{ c.notes || '-' }}</td>
              <td>
                <Button 
                  icon="pi pi-trash" 
                  class="p-button-text p-button-danger p-button-sm" 
                  v-tooltip.top="'Eliminar comanda'"
                  @click="handleDeleteOrder(c)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- PESTANYA 2: GESTIÓ DEL CATÀLEG -->
    <div v-if="activeTab === 'catalog'" class="tab-content">
      <div class="catalog-actions">
        <h2>Catàleg de Productes</h2>
        <Button label="Nou Producte" icon="pi pi-plus" class="p-button-primary" @click="openNewProductDialog" />
      </div>

      <div v-if="loading" class="loading-state">
        <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
        <p>Carregant catàleg...</p>
      </div>

      <div v-else-if="productes.length === 0" class="empty-state">
        <i class="pi pi-box"></i>
        <p>No hi ha cap producte creat. Clica a "Nou Producte" per començar.</p>
      </div>

      <div v-else class="catalog-grid">
        <div v-for="p in productes" :key="p.id" class="catalog-card" :class="{ disabled: !p.actiu }">
          <div class="card-image-wrap">
            <img v-if="p.imatges && p.imatges.length > 0" :src="p.imatges[0]" :alt="p.nom" class="card-img" />
            <div v-else class="card-img-placeholder">
              <i class="pi pi-image"></i>
            </div>
            <div class="card-badge" :class="p.actiu ? 'bg-emerald-500' : 'bg-red-500'">
              {{ p.actiu ? 'ACTIU' : 'INACTIU' }}
            </div>
          </div>

          <div class="card-body">
            <div class="flex justify-between align-center">
              <h3 class="card-title">{{ p.nom }}</h3>
              <span class="card-price">{{ p.preu.toFixed(2) }} €</span>
            </div>

            <p class="card-desc">{{ p.descripcio || 'Sense descripció' }}</p>

            <div class="talles-list">
              <span class="text-xs font-semibold text-gray-400">Talles:</span>
              <span v-if="!p.requereix_talla" class="text-xs italic text-gray-500">No requereix talla</span>
              <template v-else-if="p.talles && p.talles.length > 0">
                <span v-for="t in p.talles" :key="t" class="talla-chip">{{ t }}</span>
              </template>
              <span v-else class="text-xs text-gray-500">Cap talla configurada</span>
            </div>

            <div class="card-footer-actions">
              <Button label="Editar" icon="pi pi-pencil" class="p-button-outlined p-button-sm flex-1" @click="openEditProductDialog(p)" />
              <Button icon="pi pi-trash" class="p-button-outlined p-button-danger p-button-sm" @click="handleDeleteProduct(p)" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Form Producte -->
    <Dialog 
      v-model:visible="productDialogVisible" 
      :header="editingProduct ? 'Editar Producte' : 'Nou Producte de Material'" 
      :modal="true" 
      class="product-dialog"
      :style="{ width: '500px' }"
    >
      <div class="dialog-form">
        <div class="form-item">
          <label>Nom del Model / Producte *</label>
          <InputText v-model="productForm.nom" placeholder="Ex: Samarreta Tècnica Equipació" class="w-full" />
        </div>

        <div class="form-item">
          <label>Descripció</label>
          <Textarea v-model="productForm.descripcio" rows="3" placeholder="Detalls del teixit, color, característiques..." class="w-full" />
        </div>

        <div class="form-row">
          <div class="form-item flex-1">
            <label>Preu Unitari (€)</label>
            <InputNumber v-model="productForm.preu" :min="0" :minFractionDigits="2" :maxFractionDigits="2" class="w-full" />
          </div>

          <div class="form-item flex align-center gap-2 mt-4">
            <Checkbox v-model="productForm.actiu" :binary="true" inputId="actiuCheck" />
            <label for="actiuCheck" class="cursor-pointer">Producte Actiu</label>
          </div>
        </div>

        <!-- Checkbox Requereix Talla -->
        <div class="form-item flex align-center gap-2 my-2">
          <Checkbox v-model="productForm.requereix_talla" :binary="true" inputId="tallaCheck" />
          <label for="tallaCheck" class="cursor-pointer font-semibold">Requereix seleccionar talla?</label>
        </div>

        <!-- Talles -->
        <div v-if="productForm.requereix_talla" class="form-item">
          <label>Talles disponibles (separades per comes)</label>
          <InputText v-model="productForm.tallesStr" placeholder="Ex: XS, S, M, L, XL, XXL" class="w-full" />
        </div>

        <!-- Pujada d'imatges -->
        <div class="form-item">
          <label>Imatges del producte</label>
          <div class="image-previews" v-if="productForm.imatges.length > 0">
            <div v-for="(img, idx) in productForm.imatges" :key="idx" class="img-preview-item">
              <img :src="img" alt="Preview" />
              <button type="button" class="remove-img-btn" @click="removeProductImage(idx)">
                <i class="pi pi-times"></i>
              </button>
            </div>
          </div>

          <div class="upload-btn-wrap">
            <input type="file" accept="image/*" id="productImgUpload" class="hidden-input" @change="handleImageUpload" />
            <label for="productImgUpload" class="upload-label">
              <i class="pi" :class="uploadingImage ? 'pi-spin pi-spinner' : 'pi-upload'"></i>
              <span>{{ uploadingImage ? 'Pujant...' : 'Afegir Imatge' }}</span>
            </label>
          </div>
        </div>
      </div>

      <template #footer>
        <Button label="Cancel·lar" class="p-button-text" @click="productDialogVisible = false" />
        <Button label="Guardar Producte" icon="pi pi-check" :loading="submitting" @click="handleSaveProduct" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.manager-container {
  max-width: 1300px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.page-header h1 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
}

.subtitle {
  color: var(--text-color-secondary, #9ca3af);
  margin-top: 0.25rem;
}

.global-switch-card {
  background: var(--surface-card, rgba(255, 255, 255, 0.04));
  border: 1px solid var(--surface-border, rgba(255, 255, 255, 0.1));
  padding: 1rem 1.25rem;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.switch-info {
  display: flex;
  flex-direction: column;
}

.switch-title {
  font-size: 0.8rem;
  color: var(--text-color-secondary, #9ca3af);
  text-transform: uppercase;
  font-weight: 600;
}

.switch-status {
  font-weight: 700;
  font-size: 0.95rem;
  color: #ef4444;
}

.switch-status.active {
  color: #10b981;
}

.tabs-nav {
  display: flex;
  gap: 0.5rem;
  border-bottom: 1px solid var(--surface-border, rgba(255, 255, 255, 0.1));
  margin-bottom: 2rem;
}

.tab-button {
  background: transparent;
  border: none;
  color: var(--text-color-secondary, #9ca3af);
  padding: 0.875rem 1.25rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab-button:hover {
  color: var(--text-color, #ffffff);
}

.tab-button.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

.filters-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  flex-wrap: wrap;
  background: var(--surface-card, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--surface-border, rgba(255, 255, 255, 0.08));
  padding: 1.25rem;
  border-radius: 0.75rem;
  margin-bottom: 1.5rem;
}

.filter-inputs {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.filter-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-color-secondary, #9ca3af);
}

.date-input {
  background: var(--surface-ground, #18181b);
  border: 1px solid var(--surface-border, rgba(255, 255, 255, 0.2));
  color: #ffffff;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
}

.actions-group {
  display: flex;
  gap: 0.75rem;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  background: var(--surface-card, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--surface-border, rgba(255, 255, 255, 0.08));
  padding: 1rem 1.25rem;
  border-radius: 0.75rem;
  display: flex;
  flex-direction: column;
}

.summary-card.highlight {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
}

.summary-label {
  font-size: 0.8rem;
  color: var(--text-color-secondary, #9ca3af);
  text-transform: uppercase;
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 0.25rem;
}

.table-responsive {
  overflow-x: auto;
  background: var(--surface-card, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--surface-border, rgba(255, 255, 255, 0.1));
  border-radius: 0.75rem;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.data-table th, .data-table td {
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--surface-border, rgba(255, 255, 255, 0.05));
}

.data-table th {
  background: rgba(255, 255, 255, 0.02);
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-color-secondary, #9ca3af);
  text-transform: uppercase;
}

.talla-badge {
  background: rgba(255, 255, 255, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-weight: 600;
  font-size: 0.85rem;
}

.status-select {
  width: 140px;
}

.catalog-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.catalog-actions h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.catalog-card {
  background: var(--surface-card, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--surface-border, rgba(255, 255, 255, 0.1));
  border-radius: 1rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.catalog-card.disabled {
  opacity: 0.6;
}

.card-image-wrap {
  position: relative;
  height: 180px;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-img-placeholder {
  font-size: 3rem;
  color: rgba(255, 255, 255, 0.2);
}

.card-badge {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #fff;
  padding: 0.2rem 0.5rem;
  border-radius: 0.25rem;
}

.card-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.card-title {
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0;
}

.card-price {
  font-weight: 700;
  color: #10b981;
  font-size: 1.1rem;
}

.card-desc {
  font-size: 0.875rem;
  color: var(--text-color-secondary, #9ca3af);
  margin: 0.5rem 0 1rem 0;
  flex: 1;
}

.talles-list {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.talla-chip {
  background: rgba(255, 255, 255, 0.08);
  font-size: 0.75rem;
  padding: 0.15rem 0.4rem;
  border-radius: 0.25rem;
}

.card-footer-actions {
  display: flex;
  gap: 0.5rem;
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.5rem 0;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-item label {
  font-weight: 600;
  font-size: 0.85rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.image-previews {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.img-preview-item {
  position: relative;
  width: 70px;
  height: 70px;
  border-radius: 0.5rem;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.img-preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-img-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  background: rgba(0, 0, 0, 0.7);
  border: none;
  color: #fff;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.hidden-input {
  display: none;
}

.upload-label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--surface-card, rgba(255, 255, 255, 0.05));
  border: 1px dashed var(--surface-border, rgba(255, 255, 255, 0.2));
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--text-color-secondary, #9ca3af);
}

.upload-label:hover {
  color: var(--text-color, #ffffff);
  border-color: #3b82f6;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 3rem;
  background: var(--surface-card, rgba(255, 255, 255, 0.03));
  border-radius: 1rem;
  color: var(--text-color-secondary, #9ca3af);
}

.w-full { width: 100%; }
.w-48 { width: 12rem; }
.flex-1 { flex: 1; }
</style>
