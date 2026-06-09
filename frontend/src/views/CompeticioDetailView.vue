<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCompeticio } from '@/api/competicions'
import type { Competicio } from '@/types'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const competicio = ref<Competicio | null>(null)
const loading = ref(true)

onMounted(async () => {
  const id = route.params.id as string
  try {
    competicio.value = await getCompeticio(id)
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No s\'ha pogut carregar la competició', life: 3000 })
    router.back()
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="competicio-detail max-w-4xl mx-auto">
    <div class="page-header glass-card">
      <div class="flex align-center gap-4">
        <Button icon="ti ti-arrow-left" text rounded aria-label="Tornar" @click="router.back()" />
        <h1 class="page-title">Registre de la Competició</h1>
      </div>
    </div>

    <div v-if="loading" class="text-center py-8 text-secondary">
      <i class="ti ti-loader ti-spin text-3xl mb-2"></i>
      <p>Carregant...</p>
    </div>

    <div v-else-if="competicio" class="glass-card mt-4 comp-card">
      <div class="comp-title-area">
        <div class="flex justify-between align-start">
          <div>
            <h2>{{ competicio.nom }}</h2>
            <div class="badges mt-2">
              <span class="badge status-badge" :class="competicio.registrat ? 'bg-success' : 'bg-warning'">
                <i :class="competicio.registrat ? 'ti ti-check' : 'ti ti-clock'"></i>
                {{ competicio.registrat ? 'Planificada al calendari' : 'Pendent de revisar per l\'entrenador' }}
              </span>
              <span class="badge atleta-badge"><i class="ti ti-user"></i> {{ competicio.atleta_nom || 'Atleta' }}</span>
            </div>
          </div>
          <div class="date-badge">
            <span class="day">{{ new Date(competicio.data).getDate() }}</span>
            <span class="month">{{ new Date(competicio.data).toLocaleString('ca-ES', { month: 'short' }).toUpperCase() }}</span>
          </div>
        </div>
      </div>

      <div class="stats-grid mt-6">
        <div class="stat-box" v-if="competicio.kms">
          <i class="ti ti-route text-3xl text-accent"></i>
          <div class="stat-value">{{ competicio.kms }} km</div>
          <div class="stat-label">Distància</div>
        </div>
        <div class="stat-box" v-if="competicio.desnivell">
          <i class="ti ti-mountain text-3xl text-accent"></i>
          <div class="stat-value">{{ competicio.desnivell }} m+</div>
          <div class="stat-label">Desnivell positiu</div>
        </div>
      </div>

      <div class="comp-comments mt-6" v-if="competicio.comentaris">
        <h3><i class="ti ti-message-circle"></i> Comentaris addicionals</h3>
        <p>"{{ competicio.comentaris }}"</p>
      </div>

      <div class="mt-6 text-center actions-group" v-if="competicio.enllac || competicio.track_gpx_path">
        <a v-if="competicio.enllac" :href="competicio.enllac" target="_blank" class="web-button">
          <i class="ti ti-external-link"></i> Visitar la web oficial de la cursa
        </a>
        <a v-if="competicio.track_gpx_path" :href="competicio.track_gpx_path" download class="web-button gpx-button">
          <i class="ti ti-download"></i> Descarregar Track GPX
        </a>
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
.gap-4 { gap: 16px; }
.mt-2 { margin-top: 8px; }
.mt-4 { margin-top: 24px; }
.mt-6 { margin-top: 32px; }
.text-center { text-align: center; }
.py-8 { padding-top: 32px; padding-bottom: 32px; }
.text-secondary { color: var(--text-secondary); }
.text-accent { color: var(--accent-primary); }

.comp-card {
  padding: 32px;
}
.comp-title-area h2 {
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}
.stat-box {
  background: var(--bg-base);
  border: 1px solid var(--border);
  padding: 24px;
  border-radius: var(--radius-md);
  text-align: center;
}
.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-top: 12px;
}
.stat-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-top: 4px;
}

.comp-comments {
  background: var(--bg-base);
  padding: 20px;
  border-radius: var(--radius-md);
  border-left: 4px solid var(--accent-primary);
}
.comp-comments h3 {
  margin: 0 0 12px 0;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
}
.comp-comments p {
  margin: 0;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--text-secondary);
  font-style: italic;
}

.actions-group {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}
.web-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--accent-primary);
  color: white;
  padding: 12px 32px;
  border-radius: var(--radius-md);
  text-decoration: none;
  font-weight: 600;
  transition: opacity 0.2s;
}
.web-button.gpx-button {
  background: var(--bg-surface);
  color: var(--text-primary);
  border: 1px solid var(--border);
}
.web-button.gpx-button:hover {
  background: var(--bg-card);
}
.web-button:hover {
  opacity: 0.9;
}
</style>
