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
  idioma: 'CAT',
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
        <h1 class="logo-text">{{ $t('app.title') }}</h1>
        <p class="subtitle">{{ $t('register.subtitle') }}</p>
      </div>
      
      <form @submit.prevent="handleRegister" class="auth-form">
        <div class="field">
          <InputText v-model="formData.nom" :placeholder="$t('register.namePlaceholder')" class="w-full" />
        </div>
        
        <div class="field">
          <InputText v-model="formData.email" type="email" :placeholder="$t('register.emailPlaceholder')" class="w-full" />
        </div>
        
        <div class="field">
          <Password v-model="formData.password" :feedback="true" :promptLabel="$t('register.passwordPrompt')" :weakLabel="$t('register.passwordWeak')" :mediumLabel="$t('register.passwordMedium')" :strongLabel="$t('register.passwordStrong')" :placeholder="$t('register.passwordPlaceholder')" class="w-full" />
        </div>

        <div class="field">
          <Select 
            v-model="formData.idioma" 
            :options="[{label: $t('languages.CAT'), value: 'CAT'}, {label: $t('languages.ESP'), value: 'ESP'}, {label: $t('languages.ENG'), value: 'ENG'}]" 
            optionLabel="label" 
            optionValue="value"
            :placeholder="$t('register.languagePlaceholder')" 
            class="w-full" 
          />
        </div>
        
        <div class="field">
          <Select 
            v-model="formData.entrenador_id" 
            :options="entrenadors" 
            optionLabel="nom" 
            optionValue="id"
            :placeholder="$t('register.coachIdPlaceholder')" 
            class="w-full" 
          />
        </div>
        
        <Button 
          type="submit" 
          :label="$t('register.registerBtn')" 
          class="w-full mt-2" 
          :loading="loading" 
          :disabled="!formData.nom || !formData.email || !formData.password || !formData.entrenador_id"
        />
      </form>
      
      <div class="auth-footer">
        <span class="text-muted">{{ $t('register.hasAccount') }}</span>
        <router-link to="/login" class="link">{{ $t('register.loginLink') }}</router-link>
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
.w-full { width: 100%; }

:deep(.p-password) {
  width: 100%;
}

:deep(.p-password input) {
  width: 100%;
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
