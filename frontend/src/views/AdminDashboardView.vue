<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getUsuaris, impersonateUser, type AdminUser } from '@/api/admin'
import { useAuthStore } from '@/stores/useAuthStore'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const usuaris = ref<AdminUser[]>([])
const loading = ref(true)
const impersonatingId = ref<string | null>(null)

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
      <Button icon="ti ti-refresh" label="Actualitzar" @click="loadUsuaris" :loading="loading" />
    </div>

    <div class="glass-card table-container">
      <DataTable 
        :value="usuaris" 
        :loading="loading" 
        responsiveLayout="scroll"
        class="custom-table"
        :paginator="true"
        :rows="20"
        stripedRows
      >
        <template #empty>
          <div class="p-4 text-center text-gray-500">No s'han trobat usuaris.</div>
        </template>
        
        <Column field="nom" header="Nom" :sortable="true"></Column>
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

        <Column header="Accions" :exportable="false" style="min-width:8rem">
          <template #body="{ data }">
            <Button 
              icon="ti ti-spy" 
              label="Entrar" 
              class="p-button-sm p-button-outlined p-button-info" 
              @click="handleImpersonate(data)" 
              :loading="impersonatingId === data.id"
              v-if="data.id !== authStore.usuari?.id"
            />
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
