<script setup lang="ts">
import { useAuthStore } from '@/stores/useAuthStore'

const authStore = useAuthStore()
</script>

<template>
  <div class="manual-layout max-w-7xl mx-auto py-6">
    <div class="header-section glass-card p-6 mb-6 border-round text-center">
      <h1 class="page-title m-0 text-primary flex align-items-center justify-content-center gap-3" style="font-size: 2.5rem; font-weight: 800;">
        <i class="ti ti-book text-accent text-4xl"></i> Manual d'Usuari
      </h1>
      <p class="text-secondary mt-4 text-xl" style="max-width: 800px; margin: 0 auto; line-height: 1.6;">
        Benvingut al manual de l'aplicació TrainEE. Aquí trobaràs explicacions sobre totes les funcionalitats disponibles segons el teu rol.
      </p>
    </div>

    <div class="content-section flex flex-col gap-6">
      
      <!-- Secció General (Tothom) -->
      <div class="glass-card p-6 border-round">
        <h2 class="text-2xl font-bold text-primary mb-5 border-bottom-1 pb-3 flex align-items-center gap-2">
          <i class="ti ti-world text-accent"></i> Funcionalitats Generals
        </h2>
        
        <div class="grid gap-4">
          <div class="col-12 md:col-6 feature-card">
            <h3 class="font-bold text-xl text-primary mb-3 flex align-items-center gap-2">
              <span class="icon-wrapper bg-indigo-100 text-indigo-600"><i class="ti ti-bell"></i></span>
              Tauler d'Anuncis
            </h3>
            <p class="text-secondary text-lg line-height-4">
              El Tauler d'Anuncis és un espai comunitari. Qualsevol usuari (atleta o entrenador) pot crear anuncis per compartir informació, pujar imatges i classificar-los amb etiquetes (tags). Tothom pot veure els anuncis de la plataforma. Tu pots desactivar els anuncis que hagis creat.
            </p>
          </div>
          
          <div class="col-12 md:col-6 feature-card">
            <h3 class="font-bold text-xl text-primary mb-3 flex align-items-center gap-2">
              <span class="icon-wrapper bg-teal-100 text-teal-600"><i class="ti ti-user"></i></span>
              Perfil i Configuració
            </h3>
            <p class="text-secondary text-lg line-height-4">
              Al menú superior dret (fent clic al teu nom) pots canviar el teu idioma (Català, Castellà, Anglès), canviar la teva contrasenya i tancar la sessió.
            </p>
          </div>
        </div>
      </div>

      <!-- Secció Atleta -->
      <div v-if="authStore.isAtleta" class="glass-card p-6 border-round">
        <h2 class="text-2xl font-bold mb-5 border-bottom-1 pb-3 flex align-items-center gap-2" style="color: var(--accent-primary);">
          <i class="ti ti-run"></i> Espai Atleta
        </h2>
        
        <div class="grid gap-4">
          <div class="col-12 md:col-4 feature-card">
            <h3 class="font-bold text-xl text-primary mb-3 flex align-items-center gap-2">
              <span class="icon-wrapper bg-blue-100 text-blue-600"><i class="ti ti-calendar"></i></span>
              Calendari i Entrenaments
            </h3>
            <p class="text-secondary text-lg line-height-4">
              Al teu <b>Calendari</b> veuràs els entrenaments que el teu entrenador t'ha planificat per a cada dia. Al final de la setmana, podràs fer clic a la targeta de la setmana per introduir el teu pes, polsacions, hores de son, RPE (Percepció de l'esforç) i afegir notes per al teu entrenador.
            </p>
          </div>

          <div class="col-12 md:col-4 feature-card">
            <h3 class="font-bold text-xl text-primary mb-3 flex align-items-center gap-2">
              <span class="icon-wrapper bg-yellow-100 text-yellow-600"><i class="ti ti-trophy"></i></span>
              Les meves Competicions
            </h3>
            <p class="text-secondary text-lg line-height-4">
              A l'apartat de <b>Competicions</b> pots registrar els esdeveniments en els que participaràs. Pots incloure l'enllaç de la cursa, pujar el fitxer GPX del recorregut, i indicar la distància i desnivell. El teu entrenador veurà aquesta informació i te la podrà aprovar i classificar (A, B, C).
            </p>
          </div>

          <div class="col-12 md:col-4 feature-card">
            <h3 class="font-bold text-xl text-primary mb-3 flex align-items-center gap-2">
              <span class="icon-wrapper bg-purple-100 text-purple-600"><i class="ti ti-report"></i></span>
              Informes i Tests
            </h3>
            <p class="text-secondary text-lg line-height-4">
              A l'apartat del teu <b>Històric / Informes</b> podràs visualitzar el teu rendiment i evolució. També respondràs als <b>Tests</b> que et proposi el teu entrenador des de la pestanya corresponent.
            </p>
          </div>
        </div>
      </div>

      <!-- Secció Entrenador -->
      <div v-if="authStore.isEntrenador || authStore.usuari?.rol === 'admin'" class="glass-card p-6 border-round">
        <h2 class="text-2xl font-bold mb-5 border-bottom-1 pb-3 flex align-items-center gap-2" style="color: var(--green-500);">
          <i class="ti ti-whistle"></i> Espai Entrenador
        </h2>
        
        <div class="grid gap-4">
          <div class="col-12 md:col-6 feature-card">
            <h3 class="font-bold text-xl text-primary mb-3 flex align-items-center gap-2">
              <span class="icon-wrapper bg-green-100 text-green-600"><i class="ti ti-layout-dashboard"></i></span>
              Dashboard
            </h3>
            <p class="text-secondary text-lg line-height-4">
              Mostra el resum dels teus atletes. Pots veure d'un cop d'ull l'estat de les seves setmanes (si han entregat els resultats), escriure notes setmanals i marcar la casella de <b>Gestionat</b> per portar el control de quins atletes ja has revisat aquesta setmana.
            </p>
          </div>

          <div class="col-12 md:col-6 feature-card">
            <h3 class="font-bold text-xl text-primary mb-3 flex align-items-center gap-2">
              <span class="icon-wrapper bg-orange-100 text-orange-600"><i class="ti ti-users"></i></span>
              Gestió d'Atletes
            </h3>
            <p class="text-secondary text-lg line-height-4">
              Pots activar/desactivar atletes temporalment (per exemple per lesions o descansos), veure el seu historial d'estats, i traspassar-los a altres entrenadors.
            </p>
          </div>

          <div class="col-12 md:col-6 feature-card">
            <h3 class="font-bold text-xl text-primary mb-3 flex align-items-center gap-2">
              <span class="icon-wrapper bg-cyan-100 text-cyan-600"><i class="ti ti-calendar-event"></i></span>
              Setmanes i Planning
            </h3>
            <p class="text-secondary text-lg line-height-4">
              Crea noves <b>Setmanes</b> i fes servir el <b>Planning</b> per assignar activitats arrossegant i deixant anar (Drag & Drop) sobre els dies dels teus atletes. Prèviament has de definir les teves <b>Activitats</b> personalitzades.
            </p>
          </div>

          <div class="col-12 md:col-6 feature-card">
            <h3 class="font-bold text-xl text-primary mb-3 flex align-items-center gap-2">
              <span class="icon-wrapper bg-pink-100 text-pink-600"><i class="ti ti-file-description"></i></span>
              Formularis Dinàmics
            </h3>
            <p class="text-secondary text-lg line-height-4">
              Crea formularis per recopilar informació dels atletes (com qüestionaris d'onboarding). Els formularis poden ser públics i també els pots copiar a altres entrenadors.
            </p>
          </div>

          <div class="col-12 md:col-6 feature-card">
            <h3 class="font-bold text-xl text-primary mb-3 flex align-items-center gap-2">
              <span class="icon-wrapper bg-yellow-100 text-yellow-600"><i class="ti ti-trophy"></i></span>
              Competicions i Tests
            </h3>
            <p class="text-secondary text-lg line-height-4">
              Aprova i etiqueta (A, B, C) les competicions afegides pels teus atletes. Programa recordatoris i proves (Tests) perquè els atletes els completin i monitoritza qui els ha realitzat.
            </p>
          </div>
          
          <div class="col-12 md:col-6 feature-card">
            <h3 class="font-bold text-xl text-primary mb-3 flex align-items-center gap-2">
              <span class="icon-wrapper bg-gray-200 text-gray-700"><i class="ti ti-settings"></i></span>
              Automatitzacions (Cron)
            </h3>
            <p class="text-secondary text-lg line-height-4">
              Des de l'engranatge de configuració pots programar automatismes, com per exemple la creació automàtica de noves setmanes i l'enviament de correus de recordatori als atletes els dimecres, dijous i divendres si no han omplert les seves dades.
            </p>
          </div>
        </div>
      </div>

      <!-- Secció Admin -->
      <div v-if="authStore.usuari?.rol === 'admin'" class="glass-card p-6 border-round">
        <h2 class="text-2xl font-bold mb-5 border-bottom-1 pb-3 flex align-items-center gap-2" style="color: var(--orange-500);">
          <i class="ti ti-shield-lock"></i> Espai Administrador
        </h2>
        
        <div class="grid gap-4">
          <div class="col-12 md:col-6 feature-card">
            <h3 class="font-bold text-xl text-primary mb-3 flex align-items-center gap-2">
              <span class="icon-wrapper bg-orange-100 text-orange-600"><i class="ti ti-id"></i></span>
              Admin Dashboard
            </h3>
            <p class="text-secondary text-lg line-height-4">
              Llistat complet d'usuaris del sistema. Et permet la funció <b>"Impersonate" (Accedir com a)</b> per obrir sessió directament amb qualsevol altre compte d'usuari per ajudar-los a configurar o depurar problemes.
            </p>
          </div>

          <div class="col-12 md:col-6 feature-card">
            <h3 class="font-bold text-xl text-primary mb-3 flex align-items-center gap-2">
              <span class="icon-wrapper bg-gray-800 text-gray-100"><i class="ti ti-terminal-2"></i></span>
              System Logs
            </h3>
            <p class="text-secondary text-lg line-height-4">
              Visualitza els registres interns de la plataforma, com entrades d'inici de sessió, canvis de contrasenya o errors crítics.
            </p>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.py-6 { padding-top: 2rem; padding-bottom: 2rem; }
.p-6 { padding: 2rem; }
.mb-5 { margin-bottom: 1.5rem; }
.mb-6 { margin-bottom: 2rem; }
.pb-3 { padding-bottom: 1rem; }
.gap-3 { gap: 1rem; }
.gap-6 { gap: 2rem; }

.text-xl { font-size: 1.25rem; }
.text-2xl { font-size: 1.5rem; }
.text-4xl { font-size: 2.5rem; }

.border-bottom-1 {
  border-bottom: 1px solid rgba(150, 150, 150, 0.2);
}

.line-height-4 {
  line-height: 1.8;
}

.feature-card {
  background: var(--surface-hover);
  border-radius: 12px;
  padding: 1.5rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: 1px solid rgba(150, 150, 150, 0.1);
}

.feature-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  font-size: 1.25rem;
}
</style>
