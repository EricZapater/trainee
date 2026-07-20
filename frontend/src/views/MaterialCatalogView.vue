<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { 
  getMaterialProductes, 
  getMaterialSettings, 
  getMaterialComandes, 
  createMaterialComandes,
  updateMaterialComanda,
  deleteMaterialComanda,
  type GetComandesParams
} from '@/api/material'
import type { MaterialProducte, MaterialComanda, MaterialSettings } from '@/types'

const toast = useToast()

const loading = ref(false)
const submitting = ref(false)
const productes = ref<MaterialProducte[]>([])
const comandes = ref<MaterialComanda[]>([])
const settings = ref<MaterialSettings>({ enabled: false })

// Order selections for each product: map of productId -> { talla: string, quantitat: number, notes: string }
const selections = ref<Record<string, { talla: string; quantitat: number; notes: string }>>({})

// Edit dialog state
const editDialogVisible = ref(false)
const editingComanda = ref<MaterialComanda | null>(null)
const editForm = ref({
  talla: '',
  quantitat: 1,
  notes: ''
})

const loadData = async () => {
  loading.value = true
  try {
    const [prodsData, setsData, comsData] = await Promise.all([
      getMaterialProductes(),
      getMaterialSettings(),
      getMaterialComandes()
    ])
    productes.value = prodsData
    settings.value = setsData
    comandes.value = comsData

    // Initialize selections for each product
    const selMap: Record<string, { talla: string; quantitat: number; notes: string }> = {}
    prodsData.forEach(p => {
      selMap[p.id] = {
        talla: p.talles && p.talles.length > 0 ? p.talles[0] : '',
        quantitat: 1,
        notes: ''
      }
    })
    selections.value = selMap
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'han pogut carregar les dades del catàleg', life: 3000 })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

const handleQuickOrder = async (p: MaterialProducte) => {
  if (!settings.value.enabled) {
    toast.add({ severity: 'warn', summary: 'Atenció', detail: 'El període de comandes està tancat', life: 3000 })
    return
  }

  const sel = selections.value[p.id]
  if (!sel) return

  if (p.requereix_talla && !sel.talla) {
    toast.add({ severity: 'warn', summary: 'Atenció', detail: 'Selecciona una talla obligatòriament', life: 3000 })
    return
  }

  if (sel.quantitat <= 0) {
    toast.add({ severity: 'warn', summary: 'Atenció', detail: 'La quantitat ha de ser superior a 0', life: 3000 })
    return
  }

  submitting.value = true
  try {
    await createMaterialComandes([
      {
        producte_id: p.id,
        talla: p.requereix_talla ? sel.talla : (sel.talla || ''),
        quantitat: sel.quantitat,
        notes: sel.notes
      }
    ])
    toast.add({ severity: 'success', summary: 'Comanda registrada', detail: `S'ha afegit la comanda de ${p.nom}`, life: 3000 })
    
    // Reset selection fields for this product
    selections.value[p.id] = {
      talla: p.talles && p.talles.length > 0 ? p.talles[0] : '',
      quantitat: 1,
      notes: ''
    }

    // Refresh orders
    comandes.value = await getMaterialComandes()
  } catch (e: any) {
    const errorMsg = e.response?.data?.error || 'Error en registrar la comanda'
    toast.add({ severity: 'error', summary: 'Error', detail: errorMsg, life: 3000 })
  } finally {
    submitting.value = false
  }
}

const openEditDialog = (c: MaterialComanda) => {
  editingComanda.value = c
  editForm.value = {
    talla: c.talla,
    quantitat: c.quantitat,
    notes: c.notes || ''
  }
  editDialogVisible.value = true
}

const handleSaveEdit = async () => {
  if (!editingComanda.value) return
  submitting.value = true
  try {
    await updateMaterialComanda(editingComanda.value.id, {
      talla: editForm.value.talla,
      quantitat: editForm.value.quantitat,
      notes: editForm.value.notes
    })
    toast.add({ severity: 'success', summary: 'Comanda actualitzada', detail: 'La comanda s\'ha modificat correctament', life: 3000 })
    editDialogVisible.value = false
    comandes.value = await getMaterialComandes()
  } catch (e: any) {
    const errorMsg = e.response?.data?.error || 'Error al modificar la comanda'
    toast.add({ severity: 'error', summary: 'Error', detail: errorMsg, life: 3000 })
  } finally {
    submitting.value = false
  }
}

const handleDeleteComanda = async (c: MaterialComanda) => {
  if (!confirm(`Segur que vols cancel·lar aquesta comanda de ${c.producte_nom || 'material'}?`)) return
  try {
    await deleteMaterialComanda(c.id)
    toast.add({ severity: 'success', summary: 'Comanda eliminada', detail: 'S\'ha cancel·lat la comanda', life: 3000 })
    comandes.value = await getMaterialComandes()
  } catch (e: any) {
    const errorMsg = e.response?.data?.error || 'Error al cancel·lar la comanda'
    toast.add({ severity: 'error', summary: 'Error', detail: errorMsg, life: 3000 })
  }
}

const getEstatSeverity = (estat: string) => {
  switch (estat) {
    case 'pendent': return 'warn'
    case 'bloquejada': return 'secondary'
    case 'pagada': return 'info'
    case 'servida': return 'success'
    default: return 'info'
  }
}

const getEstatLabel = (estat: string) => {
  switch (estat) {
    case 'pendent': return 'Pendent'
    case 'bloquejada': return 'Bloquejada'
    case 'pagada': return 'Pagada'
    case 'servida': return 'Servida'
    default: return estat
  }
}

const formatImageUrl = (url: string) => {
  if (!url) return ''
  return url
}

const onImgError = (e: Event) => {
  console.warn('Error carregant imatge', e)
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="material-container">
    <Toast />

    <header class="page-header">
      <div>
        <h1>Catàleg de Material</h1>
        <p class="subtitle">Realitza les teves comandes de nou material esportiu</p>
      </div>
      
      <div class="status-pill" :class="{ open: settings.enabled, closed: !settings.enabled }">
        <i :class="settings.enabled ? 'pi pi-lock-open' : 'pi pi-lock'"></i>
        <span>{{ settings.enabled ? 'Comandes OBERTES' : 'Comandes TANCADES' }}</span>
      </div>
    </header>

    <!-- Banner si està tancat -->
    <div v-if="!settings.enabled" class="closed-banner">
      <i class="pi pi-exclamation-triangle"></i>
      <span>El període de comandes està tancat actualment. Pots veure el catàleg i l'estat de les teves comandes anteriors.</span>
    </div>

    <!-- Secció Catàleg -->
    <section class="section">
      <h2>Productes Disponibles</h2>

      <div v-if="loading" class="loading-state">
        <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
        <p>Carregant catàleg...</p>
      </div>

      <div v-else-if="productes.length === 0" class="empty-state">
        <i class="pi pi-box"></i>
        <p>No hi ha cap producte disponible al catàleg actualment.</p>
      </div>

      <div v-else class="products-grid">
        <div v-for="p in productes" :key="p.id" class="product-card">
          <div class="product-image-container">
            <img 
              v-if="p.imatges && p.imatges.length > 0" 
              :src="formatImageUrl(p.imatges[0])" 
              :alt="p.nom" 
              class="product-image"
              @error="onImgError"
            />

            <div v-else class="product-image-placeholder">
              <i class="pi pi-shopping-bag"></i>
            </div>
            <div class="price-badge">{{ p.preu.toFixed(2) }} €</div>
          </div>

          <div class="product-content">
            <h3 class="product-title">{{ p.nom }}</h3>
            <p class="product-description">{{ p.descripcio }}</p>

            <div class="order-form">
              <!-- Selector de talla -->
              <div v-if="p.requereix_talla" class="form-field">
                <label>Talla <span class="required">*</span></label>
                <Select 
                  v-if="selections[p.id]"
                  v-model="selections[p.id].talla" 
                  :options="p.talles || []" 
                  placeholder="Selecciona talla" 
                  class="w-full"
                  :disabled="!settings.enabled"
                />
              </div>
              <div v-else class="no-talla-info">
                <i class="pi pi-info-circle"></i> Aquest producte no requereix talla.
              </div>

              <!-- Quantitat -->
              <div class="form-field">
                <label>Quantitat</label>
                <InputNumber 
                  v-if="selections[p.id]"
                  v-model="selections[p.id].quantitat" 
                  :min="1" 
                  :max="99" 
                  showButtons 
                  buttonLayout="horizontal" 
                  class="w-full"
                  :disabled="!settings.enabled"
                />
              </div>

              <!-- Notes opcionals -->
              <div class="form-field">
                <label>Notes (opcional)</label>
                <InputText 
                  v-if="selections[p.id]"
                  v-model="selections[p.id].notes" 
                  placeholder="Ex: Nom estampat, etc." 
                  class="w-full"
                  :disabled="!settings.enabled"
                />
              </div>

              <!-- Botó de comanda -->
              <Button 
                label="Fer Comanda" 
                icon="pi pi-shopping-cart" 
                class="w-full p-button-primary mt-2" 
                :disabled="!settings.enabled || (p.requereix_talla && !selections[p.id]?.talla)"
                :loading="submitting"
                @click="handleQuickOrder(p)"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Secció Històrial de Comandes de l'Atleta -->
    <section class="section mt-8">
      <h2>Les Meves Comandes</h2>

      <div v-if="comandes.length === 0" class="empty-state">
        <i class="pi pi-list"></i>
        <p>Encara no has realitzat cap comanda.</p>
      </div>

      <div v-else class="orders-table-wrapper">
        <table class="orders-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Producte</th>
              <th>Talla</th>
              <th>Quantitat</th>
              <th>Preu Total</th>
              <th>Estat</th>
              <th>Notes</th>
              <th>Accions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in comandes" :key="c.id">
              <td>{{ formatDate(c.created_at) }}</td>
              <td class="font-semibold">{{ c.producte_nom }}</td>
              <td>{{ c.talla || 'N/A' }}</td>
              <td>{{ c.quantitat }}</td>
              <td class="font-bold text-emerald-400">{{ c.preu_total.toFixed(2) }} €</td>
              <td>
                <Tag :severity="getEstatSeverity(c.estat)" :value="getEstatLabel(c.estat)" />
              </td>
              <td class="text-sm text-gray-400">{{ c.notes || '-' }}</td>
              <td>
                <div class="action-buttons" v-if="c.estat === 'pendent' && settings.enabled">
                  <Button 
                    icon="pi pi-pencil" 
                    class="p-button-text p-button-sm p-button-info" 
                    v-tooltip.top="'Editar'"
                    @click="openEditDialog(c)"
                  />
                  <Button 
                    icon="pi pi-trash" 
                    class="p-button-text p-button-sm p-button-danger" 
                    v-tooltip.top="'Cancel·lar'"
                    @click="handleDeleteComanda(c)"
                  />
                </div>
                <span v-else class="text-xs text-gray-500">Bloquejada</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Modal Editar Comanda -->
    <Dialog 
      v-model:visible="editDialogVisible" 
      header="Editar Comanda" 
      :modal="true" 
      class="edit-dialog"
    >
      <div v-if="editingComanda" class="flex flex-column gap-3 py-2">
        <p class="font-semibold text-lg">{{ editingComanda.producte_nom }}</p>

        <div class="flex flex-column gap-1" v-if="editingComanda.talla !== ''">
          <label class="font-medium">Talla</label>
          <InputText v-model="editForm.talla" class="w-full" />
        </div>

        <div class="flex flex-column gap-1">
          <label class="font-medium">Quantitat</label>
          <InputNumber v-model="editForm.quantitat" :min="1" :max="99" showButtons class="w-full" />
        </div>

        <div class="flex flex-column gap-1">
          <label class="font-medium">Notes</label>
          <InputText v-model="editForm.notes" placeholder="Notes opcionals" class="w-full" />
        </div>
      </div>

      <template #footer>
        <Button label="Cancel·lar" class="p-button-text" @click="editDialogVisible = false" />
        <Button label="Guardar" icon="pi pi-check" :loading="submitting" @click="handleSaveEdit" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.material-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
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

.status-pill {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 0.875rem;
}

.status-pill.open {
  background-color: rgba(16, 185, 129, 0.15);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.status-pill.closed {
  background-color: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.closed-banner {
  background-color: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #f59e0b;
  padding: 1rem 1.25rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.section {
  margin-bottom: 2.5rem;
}

.section h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.25rem;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 3rem;
  background: var(--surface-card, rgba(255, 255, 255, 0.03));
  border-radius: 1rem;
  border: 1px dashed var(--surface-border, rgba(255, 255, 255, 0.1));
  color: var(--text-color-secondary, #9ca3af);
}

.empty-state i {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.product-card {
  background: var(--surface-card, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--surface-border, rgba(255, 255, 255, 0.1));
  border-radius: 1rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s, box-shadow 0.2s;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
}

.product-image-container {
  position: relative;
  width: 100%;
  height: 200px;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-image-placeholder {
  font-size: 3.5rem;
  color: rgba(255, 255, 255, 0.2);
}

.price-badge {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: #10b981;
  color: #ffffff;
  font-weight: 700;
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.9rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
}

.product-content {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.product-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

.product-description {
  font-size: 0.9rem;
  color: var(--text-color-secondary, #9ca3af);
  margin: 0 0 1.25rem 0;
  flex: 1;
}

.order-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-field label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-color-secondary, #9ca3af);
}

.required {
  color: #ef4444;
}

.no-talla-info {
  font-size: 0.8rem;
  color: var(--text-color-secondary, #9ca3af);
  font-style: italic;
}

.orders-table-wrapper {
  overflow-x: auto;
  background: var(--surface-card, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--surface-border, rgba(255, 255, 255, 0.1));
  border-radius: 0.75rem;
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.orders-table th, .orders-table td {
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--surface-border, rgba(255, 255, 255, 0.05));
}

.orders-table th {
  background: rgba(255, 255, 255, 0.02);
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-color-secondary, #9ca3af);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.w-full {
  width: 100%;
}
</style>
