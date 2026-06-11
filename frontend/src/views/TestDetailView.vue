<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getTest } from '@/api/tests'
import type { Test } from '@/types'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { t } = useI18n()

const testItem = ref<Test | null>(null)
const loading = ref(true)

onMounted(async () => {
  const id = route.params.id as string
  try {
    testItem.value = await getTest(id)
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'ha pogut carregar el test', life: 3000 })
    router.back()
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="test-detail max-w-4xl mx-auto">
    <div class="page-header glass-card">
      <div class="flex align-center gap-4">
        <Button icon="ti ti-arrow-left" text rounded aria-label="Tornar" @click="router.back()" />
        <h1 class="page-title">{{ $t('testDetail.title') }}</h1>
      </div>
    </div>

    <div v-if="loading" class="text-center py-8 text-secondary">
      <i class="ti ti-loader ti-spin text-3xl mb-2"></i>
      <p>{{ $t('testDetail.loading') }}</p>
    </div>

    <div v-else-if="testItem" class="glass-card mt-4 test-card">
      <div class="test-title-area">
        <div class="flex justify-between align-start">
          <div>
            <h2>{{ testItem.titol }}</h2>
            <div class="badges mt-2">
              <span class="badge status-badge" :class="testItem.registrat ? 'bg-success' : 'bg-warning'">
                <i :class="testItem.registrat ? 'ti ti-check' : 'ti ti-clock'"></i>
                {{ testItem.registrat ? $t('testDetail.planned') : $t('testDetail.pendingReview') }}
              </span>
              <span class="badge atleta-badge"><i class="ti ti-user"></i> {{ testItem.atleta_nom || 'Atleta' }}</span>
            </div>
          </div>
          <div class="date-badge">
            <span class="day">{{ new Date(testItem.data_test).getDate() }}</span>
            <span class="month">{{ new Date(testItem.data_test).toLocaleString('ca-ES', { month: 'short' }).toUpperCase() }}</span>
          </div>
        </div>
      </div>

      <div class="test-comments mt-6" v-if="testItem.comentaris">
        <h3><i class="ti ti-message-circle text-accent"></i> {{ $t('testDetail.instructions') }}</h3>
        <p>"{{ testItem.comentaris }}"</p>
      </div>

      <div class="recordatori-alert mt-6" v-if="testItem.data_recordatori">
        <div class="flex gap-3 align-center">
          <i class="ti ti-bell-ringing text-2xl text-warning"></i>
          <div>
            <h4 v-html="$t('testDetail.scheduledDate', { date: `<strong>${new Date(testItem.data_recordatori).toLocaleDateString('ca-ES')}</strong>` })"></h4>
            <p class="text-sm">{{ $t('testDetail.coachNotice') }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  padding: 16px 24px;
}
.page-title {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
}
.flex { display: flex; }
.align-center { align-items: center; }
.align-start { align-items: flex-start; }
.justify-between { justify-content: space-between; }
.gap-3 { gap: 12px; }
.gap-4 { gap: 16px; }
.mt-2 { margin-top: 8px; }
.mt-4 { margin-top: 24px; }
.mt-6 { margin-top: 32px; }
.text-center { text-align: center; }
.py-8 { padding-top: 32px; padding-bottom: 32px; }
.text-secondary { color: var(--text-secondary); }
.text-accent { color: var(--accent-primary); }
.text-warning { color: var(--accent-warning); }

.test-card {
  padding: 32px;
}
.test-title-area h2 {
  margin: 0;
  font-size: 2rem;
  color: var(--text-primary);
}
.badges {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 0.85rem;
  font-weight: 600;
}
.bg-success { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
.bg-warning { background: rgba(234, 179, 8, 0.15); color: #facc15; }
.atleta-badge { background: rgba(99, 102, 241, 0.15); color: #818cf8; }

.date-badge {
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 12px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 80px;
}
.date-badge .day {
  font-size: 2.2rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
}
.date-badge .month {
  font-size: 0.95rem;
  color: var(--accent-primary);
  font-weight: 700;
  margin-top: 4px;
}

.test-comments {
  background: var(--bg-base);
  padding: 20px;
  border-radius: var(--radius-md);
  border-left: 4px solid var(--accent-primary);
}
.test-comments h3 {
  margin: 0 0 12px 0;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
}
.test-comments p {
  margin: 0;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--text-secondary);
  font-style: italic;
}

.recordatori-alert {
  background: rgba(234, 179, 8, 0.1);
  border: 1px solid rgba(234, 179, 8, 0.3);
  padding: 16px 20px;
  border-radius: var(--radius-md);
}
.recordatori-alert h4 {
  margin: 0;
  color: var(--text-primary);
  font-weight: 500;
}
.recordatori-alert p {
  margin: 4px 0 0 0;
  color: var(--text-secondary);
}
</style>
