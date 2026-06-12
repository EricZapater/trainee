import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      redirect: () => {
        const auth = useAuthStore()
        if (!auth.isAuthenticated) return '/login'
        return auth.isAtleta ? '/calendar' : '/dashboard'
      }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guestOnly: true }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { guestOnly: true }
    },
    {
      path: '/magic-login',
      name: 'magic-login',
      component: () => import('@/views/MagicLoginView.vue'),
      meta: { guestOnly: true }
    },
    {
      path: '/calendar',
      name: 'calendar',
      component: () => import('@/views/CalendarView.vue'),
      meta: { requiresAuth: true, role: 'atleta' }
    },
    {
      path: '/competicions/:id',
      name: 'competicio-detail',
      component: () => import('@/views/CompeticioDetailView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true, role: 'entrenador' }
    },
    {
      path: '/weeks',
      name: 'weeks',
      component: () => import('@/views/WeeksManagerView.vue'),
      meta: { requiresAuth: true, role: 'entrenador' }
    },
    {
      path: '/activitats',
      name: 'activitats',
      component: () => import('@/views/ActivitatsManagerView.vue'),
      meta: { requiresAuth: true, role: 'entrenador' }
    },
    {
      path: '/planning',
      name: 'planning',
      component: () => import('@/views/PlanningManagerView.vue'),
      meta: { requiresAuth: true, role: 'entrenador' }
    },
    {
      path: '/atletes',
      name: 'atletes',
      component: () => import('@/views/AtletesManagerView.vue'),
      meta: { requiresAuth: true, role: 'entrenador' }
    },
    {
      path: '/tests',
      name: 'tests',
      component: () => import('@/views/TestsManagerView.vue'),
      meta: { requiresAuth: true, role: 'entrenador' }
    },
    {
      path: '/tests/:id',
      name: 'test-detail',
      component: () => import('@/views/TestDetailView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/informe',
      name: 'informe',
      component: () => import('@/views/InformeView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/competicions/atleta',
      name: 'competicions_atleta',
      component: () => import('@/views/CompeticionsAtletaView.vue'),
      meta: { requiresAuth: true, role: 'atleta' }
    },
    {
      path: '/competicions/entrenador',
      name: 'competicions_entrenador',
      component: () => import('@/views/CompeticionsManagerView.vue'),
      meta: { requiresAuth: true, role: 'entrenador' }
    },
    {
      path: '/entrenador/forms',
      name: 'forms_manager',
      component: () => import('@/views/FormsManagerView.vue'),
      meta: { requiresAuth: true, role: 'entrenador' }
    },
    {
      path: '/entrenador/forms/:id/edit',
      name: 'form_builder',
      component: () => import('@/views/FormBuilderView.vue'),
      meta: { requiresAuth: true, role: 'entrenador' }
    },
    {
      path: '/entrenador/forms/:id/responses',
      name: 'form_responses',
      component: () => import('@/views/FormResponsesView.vue'),
      meta: { requiresAuth: true, role: 'entrenador' }
    },
    {
      path: '/entrenador/logs',
      name: 'system_logs',
      component: () => import('@/views/SystemLogsView.vue'),
      meta: { requiresAuth: true, role: 'entrenador' }
    },
    {
      path: '/entrenador/configuracio',
      name: 'system_settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { requiresAuth: true, role: 'entrenador' }
    },
    {
      path: '/admin',
      name: 'admin_dashboard',
      component: () => import('@/views/AdminDashboardView.vue'),
      meta: { requiresAuth: true, role: 'admin' }
    },
    {
      path: '/forms/:id',
      name: 'public_form',
      component: () => import('@/views/PublicFormView.vue'),
      meta: { public: true } // Explicit flag for clarity
    }
  ]

})

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore()
  await auth.loadFromStorage()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return next('/login')
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return next(auth.isAtleta ? '/calendar' : '/dashboard')
  }

  if (to.meta.role && to.meta.role !== auth.usuari?.rol) {
    return next(auth.isAtleta ? '/calendar' : '/dashboard')
  }

  next()
})

export default router
