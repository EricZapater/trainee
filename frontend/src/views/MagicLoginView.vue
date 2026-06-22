<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()
const { t } = useI18n()

onMounted(async () => {
  const token = route.query.token as string
  const week = route.query.week as string

  if (!token) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Token invàlid o no proporcionat.', life: 3000 })
    router.push('/login')
    return
  }

  try {
    const success = await authStore.magicLogin(token)
    if (success) {
      if (week) {
        // Redirigeix a la vista del calendari amb la setmana específica
        router.push({ path: '/calendar', query: { week } })
      } else {
        router.push('/calendar')
      }
    } else {
      toast.add({ severity: 'error', summary: 'Error', detail: 'L\'enllaç ha caducat o és invàlid.', life: 3000 })
      router.push('/login')
    }
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error processant l\'inici de sessió.', life: 3000 })
    router.push('/login')
  }
})
</script>

<template>
  <div class="magic-login-container">
    <div class="loading-card glass-card">
      <i class="ti ti-loader ti-spin text-5xl mb-4 text-primary"></i>
      <h2>Iniciant sessió...</h2>
      <p>Espera un moment mentre processem el teu enllaç segur.</p>
    </div>
  </div>
</template>

<style scoped>
.magic-login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--bg-primary);
  padding: 20px;
}

.loading-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px;
  max-width: 400px;
  width: 100%;
}

.loading-card h2 {
  margin: 0 0 10px 0;
  color: var(--text-primary);
}

.loading-card p {
  margin: 0;
  color: var(--text-muted);
}
</style>
