<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getUsuaris, impersonateUser, resetUserPassword, forceBrevoSync, type AdminUser } from '@/api/admin'
import { useAuthStore } from '@/stores/useAuthStore'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { FilterMatchMode } from '@primevue/core/api'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import ConfirmDialog from 'primevue/confirmdialog'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()
const confirm = useConfirm()

const usuaris = ref<AdminUser[]>([])
const loading = ref(true)
const impersonatingId = ref<string | null>(null)
const resettingId = ref<string | null>(null)
const syncingId = ref<string | null>(null)
const selectedUsers = ref<AdminUser[]>([])
const bulkSyncLoading = ref(false)

const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS }
})

async function loadUsuaris() {
  loading.value = true
  try {
    usuaris.value = await getUsuaris()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'han pogut carregar els usuaris.', life: 3000 })
  } finally {
    loading.value = false
  }
}

async function handleImpersonate(user: AdminUser) {
  impersonatingId.value = user.id
  try {
    const res = await impersonateUser(user.id)
    
    // Guardar token d'admin
    const currentToken = localStorage.getItem('trainee_token')
    const currentUser = localStorage.getItem('trainee_usuari')
    if (currentToken) {
      localStorage.setItem('admin_token', currentToken)
    }
    if (currentUser) {
      localStorage.setItem('admin_user', currentUser)
    }

    // Assignar el nou token impersonat
    authStore.token = res.token
    authStore.usuari = res.user as any
    localStorage.setItem('trainee_token', res.token)
    localStorage.setItem('trainee_usuari', JSON.stringify(res.user))
    
    toast.add({ severity: 'success', summary: 'Sessió Impersonada', detail: `Has entrat com a ${res.user.nom}`, life: 3000 })
    
    // Redirigir depenent del rol
    if (res.user.rol === 'atleta') {
      router.push('/dashboard')
    } else if (res.user.rol === 'entrenador') {
      router.push('/competicions/entrenador')
    } else {
      router.push('/admin') // si s'impersona a ell mateix o un altre admin
    }
    
    // Forçar recàrrega de l'App per agafar l'estat global correctament (bàner)
    setTimeout(() => {
      window.location.reload()
    }, 100)

  } catch (err: any) {
    const msg = err.response?.data?.error || 'Error en impersonar usuari'
    toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 3000 })
  } finally {
    impersonatingId.value = null
  }
}

async function handleResetPassword(user: AdminUser) {
  confirm.require({
    message: `Estàs segur que vols restablir la contrasenya de ${user.nom}? Se li enviarà un correu electrònic amb la nova contrasenya.`,
    header: 'Confirmació de Restabliment',
    icon: 'ti ti-alert-triangle',
    acceptLabel: 'Sí, restablir',
    rejectLabel: 'Cancel·lar',
    acceptClass: 'p-button-danger',
    accept: async () => {
      resettingId.value = user.id
      try {
        await resetUserPassword(user.id)
        toast.add({ severity: 'success', summary: 'Contrasenya Restablerta', detail: `La contrasenya de ${user.nom} s'ha restablert i enviat per correu.`, life: 5000 })
      } catch (err: any) {
        toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error || 'No s\'ha pogut restablir la contrasenya', life: 3000 })
      } finally {
        resettingId.value = null
      }
    }
  })
}

async function handleBrevoSync(user: AdminUser) {
  syncingId.value = user.id
  try {
    await forceBrevoSync(user.id)
    toast.add({ severity: 'success', summary: 'Sincronització iniciada', detail: `La sincronització de ${user.nom} amb Brevo està en procés.`, life: 3000 })
    user.brevo_sync_status = 'pending'
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error || 'No s\'ha pogut iniciar la sincronització', life: 3000 })
  } finally {
    syncingId.value = null
  }
}

async function handleBulkBrevoSync() {
  if (selectedUsers.value.length === 0) return
  
  bulkSyncLoading.value = true
  let successCount = 0
  let failCount = 0
  
  const usersToSync = [...selectedUsers.value]
  const chunkSize = 10
  
  for (let i = 0; i < usersToSync.length; i += chunkSize) {
    const chunk = usersToSync.slice(i, i + chunkSize)
    
    await Promise.allSettled(chunk.map(async (user) => {
      try {
        await forceBrevoSync(user.id)
        user.brevo_sync_status = 'pending'
        successCount++
      } catch (e) {
        failCount++
      }
    }))
    
    if (i + chunkSize < usersToSync.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  bulkSyncLoading.value = false
  
  if (successCount > 0) {
    toast.add({ severity: 'success', summary: 'Sincronització massiva', detail: `S'ha iniciat la sincronització de ${successCount} usuaris.`, life: 3000 })
  }
  if (failCount > 0) {
    toast.add({ severity: 'error', summary: 'Errors en sincronitzar', detail: `Hi ha hagut errors al sincronitzar ${failCount} usuaris.`, life: 3000 })
  }
  
  selectedUsers.value = []
}

const formatRole = (role: string) => {
  return role.charAt(0).toUpperCase() + role.slice(1)
}

const getRoleSeverity = (role: string) => {
  switch (role) {
    case 'admin': return 'danger'
    case 'entrenador': return 'warning'
    case 'atleta': return 'info'
    default: return 'success'
  }
}

const getBrevoSeverity = (status: string) => {
  switch (status) {
    case 'synced': return 'success'
    case 'pending': return 'warning'
    case 'failed': return 'danger'
    default: return 'secondary'
  }
}

onMounted(() => {
  loadUsuaris()
})
</script>

<template>
  <div class="manager-container slide-in">
    <div class="header-actions">
      <div>
        <h1 class="page-title"><i class="ti ti-shield-check page-icon"></i> Panell d'Administrador</h1>
        <p class="page-subtitle">Llistat de tots els usuaris de la plataforma.</p>
      </div>
      <div class="flex gap-2">
        <Button 
          v-if="selectedUsers.length > 0"
          icon="ti ti-mail" 
          :label="`Sincronitzar seleccionats (${selectedUsers.length})`" 
          severity="secondary"
          @click="handleBulkBrevoSync" 
          :loading="bulkSyncLoading" 
        />
        <Button icon="ti ti-refresh" label="Actualitzar" @click="loadUsuaris" :loading="loading" />
      </div>
    </div>

    <ConfirmDialog></ConfirmDialog>

    <div class="glass-card table-container">
      <DataTable 
        v-model:selection="selectedUsers"
        v-model:filters="filters"
        :value="usuaris" 
        dataKey="id"
        :loading="loading" 
        responsiveLayout="scroll"
        class="custom-table"
        :paginator="true"
        :rows="20"
        :rowsPerPageOptions="[10, 20, 50]"
        :globalFilterFields="['nom', 'cognoms', 'email']"
        stripedRows
      >
        <template #header>
          <div class="flex justify-end p-2">
            <span class="p-input-icon-left">
              <i class="ti ti-search" />
              <InputText v-model="filters['global'].value" placeholder="Cerca per nom o correu..." />
            </span>
          </div>
        </template>
        <template #empty>
          <div class="p-4 text-center text-gray-500">No s'han trobat usuaris.</div>
        </template>
        
        <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>
        <Column field="nom" header="Nom" :sortable="true"></Column>
        <Column field="cognoms" header="Cognoms" :sortable="true"></Column>
        <Column field="email" header="Email" :sortable="true"></Column>
        
        <Column field="rol" header="Rol" :sortable="true">
          <template #body="{ data }">
            <Tag :value="formatRole(data.rol)" :severity="getRoleSeverity(data.rol)" />
          </template>
        </Column>

        <Column field="actiu" header="Estat" :sortable="true">
          <template #body="{ data }">
            <Tag :value="data.actiu ? 'Actiu' : 'Inactiu'" :severity="data.actiu ? 'success' : 'danger'" />
          </template>
        </Column>

        <Column field="brevo_sync_status" header="Brevo" :sortable="true">
          <template #body="{ data }">
            <Tag :value="data.brevo_sync_status || 'untracked'" :severity="getBrevoSeverity(data.brevo_sync_status)" />
          </template>
        </Column>

        <Column header="Accions" :exportable="false" style="min-width:18rem">
          <template #body="{ data }">
            <div class="flex gap-2">
              <Button 
                icon="ti ti-spy" 
                label="Entrar" 
                class="p-button-sm p-button-outlined p-button-info" 
                @click="handleImpersonate(data)" 
                :loading="impersonatingId === data.id"
                v-if="data.id !== authStore.usuari?.id"
              />
              <Button 
                icon="ti ti-key" 
                label="Restablir Contrasenya" 
                class="p-button-sm p-button-outlined p-button-warning" 
                @click="handleResetPassword(data)" 
                :loading="resettingId === data.id"
              />
              <Button 
                icon="ti ti-mail" 
                label="Sinc Brevo" 
                class="p-button-sm p-button-outlined p-button-secondary" 
                @click="handleBrevoSync(data)" 
                :loading="syncingId === data.id"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<style scoped>
.manager-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}
</style>
