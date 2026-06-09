<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { getEntrenadors } from '@/api/auth'
import { useToast } from 'primevue/usetoast'
import type { Entrenador } from '@/types'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Select from 'primevue/select'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const formData = ref({
  nom: '',
  email: '',
  password: '',
  rol: 'atleta' as 'atleta' | 'entrenador',
  entrenador_id: ''
})

const loading = ref(false)
const entrenadors = ref<Entrenador[]>([])

onMounted(async () => {
  try {
    entrenadors.value = await getEntrenadors()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'han pogut carregar els entrenadors', life: 3000 })
  }
})

const handleRegister = async () => {
  if (!formData.value.nom || !formData.value.email || !formData.value.password || !formData.value.entrenador_id) return
  
  loading.value = true
  try {
    await authStore.register(formData.value)
    router.push('/')
  } catch (err: any) {
    toast.add({ 
      severity: 'error', 
      summary: 'Error', 
      detail: err.response?.data?.error || 'Error en el registre', 
      life: 3000 
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-layout">
    <div class="auth-card glass-card">
      <div class="auth-header">
        <h1 class="logo-text">TrainEE</h1>
        <p class="subtitle">Crea el teu compte</p>
      </div>
      
      <div class="role-selector mb-4">
        <div 
          class="role-card" 
          :class="{ active: formData.rol === 'atleta' }"
          @click="formData.rol = 'atleta'"
        >
          <i class="ti ti-run"></i>
          <span>Sóc Atleta</span>
        </div>
        <div 
          class="role-card" 
          :class="{ active: formData.rol === 'entrenador' }"
          @click="formData.rol = 'entrenador'"
        >
          <i class="ti ti-clipboard"></i>
          <span>Sóc Entrenador</span>
        </div>
      </div>
      
      <form @submit.prevent="handleRegister" class="auth-form">
        <div class="field">
          <InputText v-model="formData.nom" placeholder="Nom complet" class="w-full" />
        </div>
        
        <div class="field">
          <InputText v-model="formData.email" type="email" placeholder="Correu electrònic" class="w-full" />
        </div>
        
        <div class="field">
          <Password v-model="formData.password" :feedback="true" promptLabel="Introdueix una contrasenya" weakLabel="Dèbil" mediumLabel="Normal" strongLabel="Forta" placeholder="Contrasenya" class="w-full" />
        </div>
        
        <div class="field">
          <Select 
            v-model="formData.entrenador_id" 
            :options="entrenadors" 
            optionLabel="nom" 
            optionValue="id"
            :placeholder="formData.rol === 'atleta' ? 'Selecciona el teu entrenador' : 'Selecciona el teu perfil d\'entrenador'" 
            class="w-full" 
          />
          <small v-if="formData.rol === 'entrenador'" class="text-muted block mt-1">
            Has de seleccionar un perfil creat prèviament per l'administració.
          </small>
        </div>
        
        <Button 
          type="submit" 
          label="Registrar-se" 
          class="w-full mt-2" 
          :loading="loading" 
          :disabled="!formData.nom || !formData.email || !formData.password || !formData.entrenador_id"
        />
      </form>
      
      <div class="auth-footer">
        <span class="text-muted">Ja tens compte?</span>
        <router-link to="/login" class="link">Inicia sessió</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-layout {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 150px);
  padding: 24px;
}

.auth-card {
  width: 100%;
  max-width: 450px;
  padding: 40px;
}

.auth-header {
  text-align: center;
  margin-bottom: 24px;
}

.logo-text {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, var(--accent-primary), #a5b4fc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  color: var(--text-secondary);
  margin-top: 8px;
}

.role-selector {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.role-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.role-card i {
  font-size: 2rem;
  color: var(--text-secondary);
  transition: color var(--transition-fast);
}

.role-card span {
  font-weight: 500;
  color: var(--text-secondary);
  transition: color var(--transition-fast);
}

.role-card:hover {
  background: var(--bg-hover);
  border-color: var(--border-hover);
}

.role-card.active {
  background: rgba(99, 102, 241, 0.1);
  border-color: var(--accent-primary);
}

.role-card.active i, .role-card.active span {
  color: var(--accent-primary);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  width: 100%;
}

.mb-4 { margin-bottom: 1rem; }
.mt-1 { margin-top: 0.25rem; }
.mt-2 { margin-top: 0.5rem; }
.block { display: block; }

.auth-footer {
  margin-top: 32px;
  text-align: center;
  font-size: 0.9rem;
  display: flex;
  justify-content: center;
  gap: 8px;
}

.link {
  color: var(--accent-primary);
  text-decoration: none;
  font-weight: 500;
}

.link:hover {
  text-decoration: underline;
}
</style>
