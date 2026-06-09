<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { useToast } from 'primevue/usetoast'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const email = ref('')
const password = ref('')
const loading = ref(false)

const handleLogin = async () => {
  if (!email.value || !password.value) return
  
  loading.value = true
  try {
    await authStore.login(email.value, password.value)
    router.push('/')
  } catch (err: any) {
    toast.add({ 
      severity: 'error', 
      summary: 'Error', 
      detail: err.response?.data?.error || 'Credencials incorrectes', 
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
        <p class="subtitle">Benvingut de nou</p>
      </div>
      
      <form @submit.prevent="handleLogin" class="auth-form">
        <div class="field">
          <span class="p-input-icon-left w-full">
            <i class="ti ti-mail"></i>
            <InputText v-model="email" type="email" placeholder="Correu electrònic" class="w-full" />
          </span>
        </div>
        
        <div class="field">
          <span class="p-input-icon-left w-full">
            <i class="ti ti-lock"></i>
            <Password v-model="password" :feedback="false" toggleMask placeholder="Contrasenya" class="w-full" />
          </span>
        </div>
        
        <Button 
          type="submit" 
          label="Entrar" 
          class="w-full mt-4" 
          :loading="loading" 
          :disabled="!email || !password"
        />
      </form>
      
      <div class="auth-footer">
        <span class="text-muted">No tens compte?</span>
        <router-link to="/register" class="link">Registra't aquí</router-link>
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
  max-width: 400px;
  padding: 40px;
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;
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

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  width: 100%;
}

.p-input-icon-left > i {
  z-index: 1;
}

.p-input-icon-left > .p-inputtext,
.p-input-icon-left > .p-password {
  padding-left: 2.5rem;
}

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
