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
import InputText from 'primevue/inputtext'
import { useToast } from 'primevue/usetoast'
import { changePassword } from '@/api/auth'
import { getAnuncis } from '@/api/anuncis'

const router = useRouter()
const toast = useToast()
const { t } = useI18n()
const authStore = useAuthStore()
const compStore = useCompeticionsStore()
const testsStore = useTestsStore()
const isMenuOpen = ref(false)
const changelogVisible = ref(false)
const APP_VERSION = 'v1.1.0'

const isAdminImpersonating = ref(false)
const pendingAnuncisCount = ref(0)

const loadAnuncisPendingCount = async () => {
  try {
    const data = await getAnuncis()
    pendingAnuncisCount.value = data.filter(a => a.estat === 'pendent').length
  } catch (e) {
    console.error('Failed to load pending anuncis count', e)
  }
}

onMounted(async () => {
  isAdminImpersonating.value = !!localStorage.getItem('admin_token')
  await authStore.loadFromStorage()
  if (authStore.isAuthenticated && authStore.isEntrenador) {
    compStore.loadPendingCount()
    testsStore.loadData()
  }
  if (authStore.isAuthenticated && (authStore.isEntrenador || authStore.usuari?.rol === 'admin')) {
    loadAnuncisPendingCount()
  }
})

watch(() => authStore.isAuthenticated, (newVal) => {
  if (newVal && authStore.isEntrenador) {
    compStore.loadPendingCount()
    testsStore.loadData()
  }
  if (newVal && (authStore.isEntrenador || authStore.usuari?.rol === 'admin')) {
    loadAnuncisPendingCount()
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
    label: t('userMenu.help'),
    icon: 'ti ti-book',
    command: () => router.push('/manual')
  },
  {
    label: t('userMenu.changeProfile'),
    icon: 'ti ti-user-edit',
    command: () => {
      changeProfileForm.value = {
        nom: authStore.usuari?.nom || '',
        email: authStore.usuari?.email || ''
      }
      changeProfileVisible.value = true
    }
  },
  {
    label: `Versió ${APP_VERSION}`,
    icon: 'ti ti-info-circle',
    command: () => { changelogVisible.value = true }
  },
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

const compMenu = ref()
const compMenuItems = computed(() => [
  {
    label: t('nav.weeks'),
    icon: 'ti ti-calendar',
    command: () => router.push('/weeks')
  },
  {
    label: t('nav.tests'),
    icon: 'ti ti-clipboard-data',
    command: () => router.push('/tests'),
    badge: testsStore.notificationCount > 0 ? testsStore.notificationCount : undefined
  },
  {
    label: t('nav.competitions'),
    icon: 'ti ti-list',
    command: () => router.push('/competicions/entrenador'),
    badge: compStore.pendingCount > 0 ? compStore.pendingCount : undefined
  },
  {
    label: t('nav.historyCompetitions'),
    icon: 'ti ti-history',
    command: () => router.push('/competicions/historic')
  },
  {
    label: t('nav.planning'),
    icon: 'ti ti-calendar-event',
    command: () => router.push('/planning')
  }
])
const toggleCompMenu = (event: Event) => {
  compMenu.value.toggle(event)
}

const configMenu = ref()
const configMenuItems = computed(() => [
  {
    label: t('nav.activities'),
    icon: 'ti ti-activity',
    command: () => router.push('/activitats')
  },
  {
    label: t('nav.settings'),
    icon: 'ti ti-settings',
    command: () => router.push('/entrenador/configuracio')
  }
])
const toggleConfigMenu = (event: Event) => {
  configMenu.value.toggle(event)
}

const atletesMenu = ref()
const atletesMenuItems = computed(() => [
  {
    label: t('nav.forms'),
    icon: 'ti ti-file-description',
    command: () => router.push('/entrenador/forms')
  },
  {
    label: t('nav.users'),
    icon: 'ti ti-users',
    command: () => router.push('/atletes')
  },
  {
    label: t('nav.athleteReports'),
    icon: 'ti ti-file-analytics',
    command: () => router.push('/informe')
  },
  {
    label: t('nav.dashboard'),
    icon: 'ti ti-layout-dashboard',
    command: () => router.push('/dashboard')
  }
])
const toggleAtletesMenu = (event: Event) => {
  atletesMenu.value.toggle(event)
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

const changeProfileVisible = ref(false)
const changeProfileLoading = ref(false)
const changeProfileForm = ref({ nom: '', email: '' })

const handleChangeProfile = async () => {
  if (!changeProfileForm.value.nom || !changeProfileForm.value.email) {
    toast.add({ severity: 'warn', summary: 'Avís', detail: 'Omple tots els camps.', life: 3000 })
    return
  }
  
  changeProfileLoading.value = true
  try {
    await authStore.updateProfile(changeProfileForm.value)
    toast.add({ severity: 'success', summary: 'Èxit', detail: 'Perfil actualitzat correctament', life: 3000 })
    changeProfileVisible.value = false
  } catch (error: any) {
    const msg = error.response?.data?.error || 'Error canviant el perfil'
    toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 3000 })
  } finally {
    changeProfileLoading.value = false
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
      <div class="nav-brand" style="display: flex; align-items: center; gap: 12px;">
        <img src="/logo.png" alt="Logo" style="height: 40px; width: auto;" />
        <span class="logo-text">{{ $t('app.title') }}</span>
      </div>
      
      <button v-if="authStore.isAuthenticated" class="hamburger-btn" @click="isMenuOpen = !isMenuOpen">
        <i :class="isMenuOpen ? 'ti ti-x' : 'ti ti-menu-2'"></i>
      </button>

      <div class="nav-menu" :class="{ 'is-open': isMenuOpen }">
        <nav class="nav-links" @click="isMenuOpen = false">
          <router-link to="/anuncis" class="nav-link menu-with-badge">
            {{ $t('nav.announcements') || 'Tauler d\'Anuncis' }}
            <span v-if="pendingAnuncisCount > 0 && (authStore.isEntrenador || authStore.usuari?.rol === 'admin')" class="badge">{{ pendingAnuncisCount }}</span>
          </router-link>
          <template v-if="authStore.isAtleta">
            <router-link to="/calendar" class="nav-link">{{ $t('nav.calendar') }}</router-link>
            <router-link to="/competicions/atleta" class="nav-link">{{ $t('nav.competitions') }}</router-link>
            <router-link to="/informe" class="nav-link">{{ $t('nav.myHistory') }}</router-link>
          </template>
          <template v-if="authStore.isEntrenador">
            <button @click="toggleAtletesMenu" class="nav-link menu-with-badge" style="background:none;border:none;cursor:pointer;font-family:inherit;font-size:inherit;">
              {{ $t('nav.users') }} <i class="ti ti-chevron-down text-sm"></i>
            </button>
            <button @click="toggleCompMenu" class="nav-link menu-with-badge" style="background:none;border:none;cursor:pointer;font-family:inherit;font-size:inherit;">
              {{ $t('nav.planningGroup') }} <i class="ti ti-chevron-down text-sm"></i>
              <span v-if="(compStore.pendingCount + testsStore.notificationCount) > 0" class="badge">{{ compStore.pendingCount + testsStore.notificationCount }}</span>
            </button>
            <button @click="toggleConfigMenu" class="nav-link menu-with-badge" style="background:none;border:none;cursor:pointer;font-family:inherit;font-size:inherit;">
              {{ $t('nav.settings') }} <i class="ti ti-chevron-down text-sm"></i>
            </button>
          </template>
          <template v-if="authStore.usuari?.rol === 'admin' && !isAdminImpersonating">
            <router-link to="/admin" class="nav-link"><i class="ti ti-shield-check"></i> Panell d'Admin</router-link>
            <router-link to="/admin/logs" class="nav-link"><i class="ti ti-list"></i> Registre d'Accions</router-link>
          </template>
        </nav>
        
        <div class="nav-user">
          <button @click="toggleUserMenu" class="user-menu-btn" aria-haspopup="true" aria-controls="overlay_menu">
            <span class="user-name">{{ authStore.usuari?.nom }}</span>
            <i class="ti ti-chevron-down text-sm"></i>
          </button>
          <Menu ref="userMenu" id="overlay_menu" :model="userMenuItems" :popup="true" appendTo="body" />
          <Menu ref="compMenu" id="comp_menu" :model="compMenuItems" :popup="true" appendTo="body">
            <template #item="{ item, props }">
              <a v-bind="props.action" class="flex align-center w-full justify-between p-2">
                <div class="flex align-center gap-2">
                  <i :class="item.icon"></i>
                  <span>{{ item.label }}</span>
                </div>
                <span v-if="item.badge" class="badge" style="margin-left: 8px;">{{ item.badge }}</span>
              </a>
            </template>
          </Menu>
          <Menu ref="configMenu" id="config_menu" :model="configMenuItems" :popup="true" appendTo="body">
            <template #item="{ item, props }">
              <a v-bind="props.action" class="flex align-center w-full justify-between p-2">
                <div class="flex align-center gap-2">
                  <i :class="item.icon"></i>
                  <span>{{ item.label }}</span>
                </div>
              </a>
            </template>
          </Menu>
          <Menu ref="atletesMenu" id="atletes_menu" :model="atletesMenuItems" :popup="true" appendTo="body">
            <template #item="{ item, props }">
              <a v-bind="props.action" class="flex align-center w-full justify-between p-2">
                <div class="flex align-center gap-2">
                  <i :class="item.icon"></i>
                  <span>{{ item.label }}</span>
                </div>
              </a>
            </template>
          </Menu>
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

    <Dialog v-model:visible="changeProfileVisible" :header="$t('userMenu.changeProfile')" modal :style="{ width: '400px' }">
      <div class="flex flex-col gap-4 mt-2">
        <div class="field">
          <label>Nom</label>
          <InputText v-model="changeProfileForm.nom" class="w-full" />
        </div>
        <div class="field">
          <label>Email</label>
          <InputText type="email" v-model="changeProfileForm.email" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel·lar" icon="ti ti-x" text @click="changeProfileVisible = false" />
        <Button label="Guardar" icon="ti ti-check" @click="handleChangeProfile" :loading="changeProfileLoading" />
      </template>
    </Dialog>

    <Dialog v-model:visible="changelogVisible" :header="`Novetats - ${APP_VERSION}`" modal :style="{ width: '600px', maxWidth: '90vw' }">
      <div class="flex flex-col gap-4 mt-2 text-surface-800 leading-relaxed text-sm">
        <div class="bg-primary-50 p-4 rounded-xl border border-primary-100 mb-2">
          <h3 class="font-bold text-primary-900 mb-2 flex items-center gap-2">
            <i class="ti ti-rocket text-xl"></i> Versió 1.1.0 (30 Juny 2026)
          </h3>
          <p class="text-primary-800">S'ha implementat el compliment normatiu del RGPD juntament amb múltiples millores a l'edició de formularis i navegació.</p>
        </div>

        <h4 class="font-bold text-surface-900 mt-2 border-b pb-1"><i class="ti ti-shield-check text-primary"></i> 1. Privacitat i RGPD</h4>
        <ul class="list-disc pl-5 space-y-1 text-surface-700">
          <li>Acceptació obligatòria de la Política de Privacitat per a tots els usuaris.</li>
          <li>Registre segur del consentiment, incloent l'adreça IP i versió de la política acceptada.</li>
          <li>Nova pantalla visual per a la informació legal (Primera Capa).</li>
        </ul>

        <h4 class="font-bold text-surface-900 mt-2 border-b pb-1"><i class="ti ti-file-description text-primary"></i> 2. Formularis (Form Builder)</h4>
        <ul class="list-disc pl-5 space-y-1 text-surface-700">
          <li><strong>Formularis globals:</strong> Ara els formularis són independents de l'entrenador.</li>
          <li><strong>Drag & Drop:</strong> Les preguntes del formulari es poden reordenar arrossegant i deixant anar (arrossega la icona de punts).</li>
        </ul>

        <h4 class="font-bold text-surface-900 mt-2 border-b pb-1"><i class="ti ti-layout-dashboard text-primary"></i> 3. Tauler i Vistes</h4>
        <ul class="list-disc pl-5 space-y-1 text-surface-700">
          <li>Els textos llargs als camps de notes ara es mostren completament en multilínia.</li>
          <li>Cerca per nom i paginació afegida al llistat d'atletes.</li>
          <li>Graella d'activitats redistribuïda a 2 columnes.</li>
          <li>Filtre afegit a la vista de Planificació per ocultar les competicions descartades.</li>
          <li>Filtre de setmanes ordenat de forma cronològica (de més antiga a més nova).</li>
        </ul>

        <h4 class="font-bold text-surface-900 mt-2 border-b pb-1"><i class="ti ti-compass text-primary"></i> 4. Navegació</h4>
        <ul class="list-disc pl-5 space-y-1 text-surface-700">
          <li>Reestructuració de la barra superior agrupant la navegació en Atletes, Planificació i Configuració.</li>
        </ul>
      </div>
      <template #footer>
        <Button label="Tancar" icon="ti ti-x" @click="changelogVisible = false" autofocus />
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
    max-height: calc(100vh - 64px);
    overflow-y: auto;
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
