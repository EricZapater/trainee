<script setup lang="ts">
import { onMounted, ref, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/useAuthStore'
import { useCompeticionsStore } from '@/stores/useCompeticionsStore'
import { useTestsStore } from '@/stores/useTestsStore'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import Menu from 'primevue/menu'
import Dialog from 'primevue/dialog'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import { changePassword } from '@/api/auth'

const router = useRouter()
const toast = useToast()
const { t } = useI18n()
const authStore = useAuthStore()
const compStore = useCompeticionsStore()
const testsStore = useTestsStore()
const isMenuOpen = ref(false)

const isAdminImpersonating = ref(false)

onMounted(async () => {
  isAdminImpersonating.value = !!localStorage.getItem('admin_token')
  await authStore.loadFromStorage()
  if (authStore.isAuthenticated && authStore.isEntrenador) {
    compStore.loadPendingCount()
    testsStore.loadData()
  }
})

watch(() => authStore.isAuthenticated, (newVal) => {
  if (newVal && authStore.isEntrenador) {
    compStore.loadPendingCount()
    testsStore.loadData()
  }
})

const handleLogout = () => {
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_user')
  isAdminImpersonating.value = false
  authStore.logout()
  router.push('/login')
}

const restoreAdminSession = async () => {
  const adminToken = localStorage.getItem('admin_token')
  const adminUser = localStorage.getItem('admin_user')
  if (adminToken && adminUser) {
    localStorage.setItem('trainee_token', adminToken)
    localStorage.setItem('trainee_usuari', adminUser)
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    isAdminImpersonating.value = false
    await authStore.loadFromStorage()
    router.push('/admin')
    setTimeout(() => {
      window.location.reload()
    }, 100)
  }
}

const userMenu = ref()
const userMenuItems = computed(() => [
  {
    label: t('userMenu.changePassword'),
    icon: 'ti ti-key',
    command: () => {
      changePassForm.value = { old_password: '', new_password: '' }
      changePassVisible.value = true
    }
  },
  {
    label: t('userMenu.changeLanguage'),
    icon: 'ti ti-language',
    command: () => {
      selectedLang.value = authStore.usuari?.idioma || 'CAT'
      changeLangVisible.value = true
    }
  },
  {
    label: t('userMenu.logout'),
    icon: 'ti ti-logout',
    command: () => handleLogout()
  }
])

const toggleUserMenu = (event: Event) => {
  userMenu.value.toggle(event)
}

const changePassVisible = ref(false)
const changePassLoading = ref(false)
const changePassForm = ref({ old_password: '', new_password: '' })

const handleChangePassword = async () => {
  if (!changePassForm.value.old_password || changePassForm.value.new_password.length < 6) {
    toast.add({ severity: 'warn', summary: 'Avís', detail: 'Introdueix la contrasenya actual i una de nova (mínim 6 caràcters).', life: 3000 })
    return
  }
  
  changePassLoading.value = true
  try {
    const res = await changePassword(changePassForm.value)
    toast.add({ severity: 'success', summary: 'Èxit', detail: res.message, life: 3000 })
    changePassVisible.value = false
  } catch (error: any) {
    const msg = error.response?.data?.error || 'Error canviant la contrasenya'
    toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 3000 })
  } finally {
    changePassLoading.value = false
  }
}

const changeLangVisible = ref(false)
const changeLangLoading = ref(false)
const selectedLang = ref('CAT')
const langOptions = computed(() => [
  { label: t('languages.CAT'), value: 'CAT' },
  { label: t('languages.ESP'), value: 'ESP' },
  { label: t('languages.ENG'), value: 'ENG' },
])

const handleChangeLanguage = async () => {
  changeLangLoading.value = true
  try {
    await authStore.updateIdioma(selectedLang.value)
    changeLangVisible.value = false
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error canviant idioma', life: 3000 })
  } finally {
    changeLangLoading.value = false
  }
}
</script>

<template>
  <div class="app-container">
    <div v-if="isAdminImpersonating" class="impersonation-banner">
      <i class="ti ti-alert-triangle mr-2"></i>
      Estàs veient el sistema com a <strong>{{ authStore.usuari?.nom }} ({{ authStore.usuari?.rol }})</strong>.
      <button @click="restoreAdminSession" class="restore-admin-btn">Tornar a l'Admin</button>
    </div>
    
    <Toast />
    <ConfirmDialog />
    
    <header v-if="authStore.isAuthenticated" class="navbar glass-card">
      <div class="nav-brand">
        <span class="logo-text">{{ $t('app.title') }}</span>
      </div>
      
      <button v-if="authStore.isAuthenticated" class="hamburger-btn" @click="isMenuOpen = !isMenuOpen">
        <i :class="isMenuOpen ? 'ti ti-x' : 'ti ti-menu-2'"></i>
      </button>

      <div class="nav-menu" :class="{ 'is-open': isMenuOpen }">
        <nav class="nav-links" @click="isMenuOpen = false">
          <template v-if="authStore.isAtleta">
            <router-link to="/calendar" class="nav-link">{{ $t('nav.calendar') }}</router-link>
            <router-link to="/competicions/atleta" class="nav-link">{{ $t('nav.competitions') }}</router-link>
            <router-link to="/informe" class="nav-link">{{ $t('nav.myHistory') }}</router-link>
          </template>
          <template v-if="authStore.isEntrenador">
            <router-link to="/dashboard" class="nav-link">{{ $t('nav.dashboard') }}</router-link>
            <router-link to="/tests" class="nav-link menu-with-badge">
              {{ $t('nav.tests') }}
              <span v-if="testsStore.notificationCount > 0" class="badge">{{ testsStore.notificationCount }}</span>
            </router-link>
            <router-link to="/atletes" class="nav-link">{{ $t('nav.users') }}</router-link>
            <router-link to="/entrenador/forms" class="nav-link">{{ $t('nav.forms') }}</router-link>
            <router-link to="/weeks" class="nav-link">{{ $t('nav.weeks') }}</router-link>
            <router-link to="/activitats" class="nav-link">{{ $t('nav.activities') }}</router-link>
            <router-link to="/planning" class="nav-link">{{ $t('nav.planning') }}</router-link>
            <router-link to="/competicions/entrenador" class="nav-link menu-with-badge">
              {{ $t('nav.competitions') }}
              <span v-if="compStore.pendingCount > 0" class="badge">{{ compStore.pendingCount }}</span>
            </router-link>
            <router-link to="/informe" class="nav-link">{{ $t('nav.athleteReports') }}</router-link>
            <router-link to="/entrenador/logs" class="nav-link">Registre d'Accions</router-link>
            <router-link to="/entrenador/configuracio" class="nav-link">Configuració</router-link>
          </template>
          <template v-if="authStore.usuari?.rol === 'admin' && !isAdminImpersonating">
            <router-link to="/admin" class="nav-link"><i class="ti ti-shield-check"></i> Panell d'Admin</router-link>
          </template>
        </nav>
        
        <div class="nav-user">
          <button @click="toggleUserMenu" class="user-menu-btn" aria-haspopup="true" aria-controls="overlay_menu">
            <span class="user-name">{{ authStore.usuari?.nom }}</span>
            <i class="ti ti-chevron-down text-sm"></i>
          </button>
          <Menu ref="userMenu" id="overlay_menu" :model="userMenuItems" :popup="true" />
        </div>
      </div>
    </header>

    <Dialog v-model:visible="changePassVisible" :header="$t('userMenu.changePassword')" modal :style="{ width: '400px' }">
      <div class="flex flex-col gap-4 mt-2">
        <div class="field">
          <label>Contrasenya Actual</label>
          <Password v-model="changePassForm.old_password" :feedback="false" toggleMask class="w-full" inputClass="w-full" />
        </div>
        <div class="field">
          <label>Nova Contrasenya</label>
          <Password v-model="changePassForm.new_password" :feedback="true" toggleMask class="w-full" inputClass="w-full" promptLabel="Introdueix contrasenya" weakLabel="Feble" mediumLabel="Mitjana" strongLabel="Forta" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel·lar" icon="ti ti-x" text @click="changePassVisible = false" />
        <Button label="Guardar" icon="ti ti-check" @click="handleChangePassword" :loading="changePassLoading" />
      </template>
    </Dialog>

    <Dialog v-model:visible="changeLangVisible" :header="$t('userMenu.changeLanguage')" modal :style="{ width: '350px' }">
      <div class="flex flex-col gap-4 mt-2">
        <div class="field">
          <Select v-model="selectedLang" :options="langOptions" optionLabel="label" optionValue="value" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel·lar" icon="ti ti-x" text @click="changeLangVisible = false" />
        <Button label="Guardar" icon="ti ti-check" @click="handleChangeLanguage" :loading="changeLangLoading" />
      </template>
    </Dialog>

    <main class="app-content" :class="{ 'with-nav': authStore.isAuthenticated }">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.impersonation-banner {
  background-color: var(--accent-danger);
  color: white;
  text-align: center;
  padding: 8px 16px;
  font-size: 0.9rem;
  font-weight: 500;
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.restore-admin-btn {
  background: white;
  color: var(--accent-danger);
  border: none;
  padding: 4px 12px;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  margin-left: 12px;
  font-size: 0.8rem;
  transition: opacity 0.2s;
}

.restore-admin-btn:hover {
  opacity: 0.9;
}

.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  z-index: 100;
  border-radius: 0;
  border-top: none;
  border-left: none;
  border-right: none;
}

.nav-brand {
  font-size: 1.5rem;
  font-weight: 700;
}

.logo-text {
  background: linear-gradient(135deg, var(--accent-primary), #a5b4fc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav-links {
  display: flex;
  gap: 24px;
}

.nav-link {
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  transition: color var(--transition-fast);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
}

.nav-link:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.05);
}

.nav-link.router-link-active {
  color: var(--accent-primary);
  background: rgba(99, 102, 241, 0.1);
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-menu-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
}

.user-menu-btn:hover {
  background: rgba(255, 255, 255, 0.05);
}

.flex { display: flex; }
.flex-col { flex-direction: column; }
.gap-4 { gap: 16px; }
.mt-2 { margin-top: 8px; }
.w-full { width: 100%; }
.field label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.app-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px;
}

.app-content.with-nav {
  padding-top: 88px; /* 64px nav + 24px padding */
}

/* Adjust navbar top if banner is present */
.impersonation-banner ~ .navbar {
  top: 36px;
}
.impersonation-banner ~ .app-content.with-nav {
  padding-top: 124px;
}

.menu-with-badge {
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge {
  background: var(--accent-danger);
  color: white;
  font-size: 0.75rem;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 12px;
  min-width: 20px;
  text-align: center;
}

/* Mobile Navbar Styles */
.hamburger-btn {
  display: none;
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 8px;
}

.nav-menu {
  display: flex;
  align-items: center;
  gap: 24px;
}

@media (max-width: 768px) {
  .navbar {
    padding: 0 16px;
  }
  
  .hamburger-btn {
    display: block;
  }

  .nav-menu {
    position: fixed;
    top: 64px;
    left: 0;
    right: 0;
    background: var(--bg-surface);
    flex-direction: column;
    padding: 24px;
    gap: 24px;
    border-bottom: 1px solid var(--border);
    box-shadow: var(--shadow-md);
    transform: translateY(-150%);
    transition: transform var(--transition-normal);
    z-index: 99;
  }

  .nav-menu.is-open {
    transform: translateY(0);
  }

  .nav-links {
    flex-direction: column;
    width: 100%;
    align-items: stretch;
    text-align: center;
  }

  .nav-link {
    padding: 12px;
    font-size: 1.1rem;
  }

  .nav-user {
    width: 100%;
    justify-content: center;
    padding-top: 16px;
    border-top: 1px solid var(--border);
  }
  
  .app-content {
    padding: 16px;
  }
}
</style>
