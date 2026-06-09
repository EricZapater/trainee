<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { useCompeticionsStore } from '@/stores/useCompeticionsStore'
import { useTestsStore } from '@/stores/useTestsStore'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'

const router = useRouter()
const authStore = useAuthStore()
const compStore = useCompeticionsStore()
const testsStore = useTestsStore()
const isMenuOpen = ref(false)

onMounted(async () => {
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
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="app-container">
    <Toast />
    <ConfirmDialog />
    
    <header v-if="authStore.isAuthenticated" class="navbar glass-card">
      <div class="nav-brand">
        <span class="logo-text">TrainEE</span>
      </div>
      
      <button v-if="authStore.isAuthenticated" class="hamburger-btn" @click="isMenuOpen = !isMenuOpen">
        <i :class="isMenuOpen ? 'ti ti-x' : 'ti ti-menu-2'"></i>
      </button>

      <div class="nav-menu" :class="{ 'is-open': isMenuOpen }">
        <nav class="nav-links" @click="isMenuOpen = false">
          <template v-if="authStore.isAtleta">
            <router-link to="/calendar" class="nav-link">Calendari</router-link>
            <router-link to="/competicions/atleta" class="nav-link">Competicions</router-link>
            <router-link to="/informe" class="nav-link">El meu Històric</router-link>
          </template>
          <template v-if="authStore.isEntrenador">
            <router-link to="/dashboard" class="nav-link">Dashboard</router-link>
            <router-link to="/tests" class="nav-link menu-with-badge">
              Tests
              <span v-if="testsStore.notificationCount > 0" class="badge">{{ testsStore.notificationCount }}</span>
            </router-link>
            <router-link to="/weeks" class="nav-link">Setmanes</router-link>
            <router-link to="/activitats" class="nav-link">Activitats</router-link>
            <router-link to="/competicions/entrenador" class="nav-link menu-with-badge">
              Competicions
              <span v-if="compStore.pendingCount > 0" class="badge">{{ compStore.pendingCount }}</span>
            </router-link>
            <router-link to="/informe" class="nav-link">Informe Atletes</router-link>
          </template>
        </nav>
        
        <div class="nav-user">
          <span class="user-name">{{ authStore.usuari?.nom }}</span>
          <button @click="handleLogout" class="logout-btn" title="Tancar sessió">
            <i class="ti ti-logout"></i>
          </button>
        </div>
      </div>
    </header>

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

.user-name {
  font-weight: 500;
  color: var(--text-primary);
}

.logout-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 8px;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
}

.logout-btn:hover {
  color: var(--accent-danger);
  background: rgba(239, 68, 68, 0.1);
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
