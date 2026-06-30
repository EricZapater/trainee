<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores/useAuthStore'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import { acceptLegalConsent } from '@/api/auth'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const auth = useAuthStore()

const accepted = ref(false)
const loading = ref(false)

const POLICY_VERSION = 'v1.0'

const handleSubmit = async () => {
  if (!accepted.value) return
  
  loading.value = true
  try {
    await acceptLegalConsent(POLICY_VERSION)
    toast.add({ severity: 'success', summary: 'Completat', detail: 'Política de Privacitat acceptada', life: 3000 })
    // Forcem una recàrrega completa de la pàgina per netejar estat i refer les crides API
    const redirectPath = route.query.redirect as string
    if (redirectPath && redirectPath !== '/legal-consent') {
      window.location.href = redirectPath
    } else {
      window.location.href = '/'
    }
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.error || 'No s\'ha pogut desar el consentiment', life: 3000 })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-surface-50 p-4">
    <div class="glass-card max-w-3xl w-full p-8 shadow-lg rounded-2xl border border-surface-200">
      <div class="text-center mb-8">
        <i class="ti ti-shield-check text-5xl text-primary mb-4 inline-block"></i>
        <h1 class="text-3xl font-bold text-surface-900">Actualització de Privacitat</h1>
        <p class="text-secondary mt-2 text-lg">Per continuar utilitzant l'aplicació, cal que revisis i acceptis la nostra nova Política de Privacitat.</p>
      </div>

      <div class="mb-8">
        <h3 class="font-bold text-xl mb-6 text-surface-900 border-b pb-3 flex items-center gap-2">
          <i class="ti ti-file-info text-primary text-2xl"></i>
          Informació Bàsica sobre Protecció de Dades
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div class="bg-surface-0 p-5 rounded-xl border border-surface-200 shadow-sm hover:border-primary-300 transition-colors">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-primary">
                <i class="ti ti-user text-lg"></i>
              </div>
              <strong class="text-surface-900 text-base">Responsable</strong>
            </div>
            <p class="text-surface-600 leading-relaxed pl-11">
              TRAIL EVENTS SC (CIF:J24948713)
            </p>
          </div>

          <div class="bg-surface-0 p-5 rounded-xl border border-surface-200 shadow-sm hover:border-primary-300 transition-colors">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-primary">
                <i class="ti ti-target text-lg"></i>
              </div>
              <strong class="text-surface-900 text-base">Finalitat</strong>
            </div>
            <p class="text-surface-600 leading-relaxed pl-11">
              Gestió del compte de l'atleta, registre de la planificació setmanal (activitats i temps), accés al tauler d'anuncis i recordatoris exclusivament operatius. <b>No s'enviarà publicitat</b> de tercers.
            </p>
          </div>

          <div class="bg-surface-0 p-5 rounded-xl border border-surface-200 shadow-sm hover:border-primary-300 transition-colors">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-primary">
                <i class="ti ti-scale text-lg"></i>
              </div>
              <strong class="text-surface-900 text-base">Legitimació</strong>
            </div>
            <p class="text-surface-600 leading-relaxed pl-11">
              Execució de la relació contractual o de servei d'entrenament esportiu existent entre les parts d'acord amb l'article 6.1.b del RGPD.
            </p>
          </div>

          <div class="bg-surface-0 p-5 rounded-xl border border-surface-200 shadow-sm hover:border-primary-300 transition-colors">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-primary">
                <i class="ti ti-users text-lg"></i>
              </div>
              <strong class="text-surface-900 text-base">Destinataris</strong>
            </div>
            <p class="text-surface-600 leading-relaxed pl-11">
              Les dades no es cediran a tercers aliens al servei, excepte obligació legal. Allotjament en servidors segurs ubicats dins l'Espai Econòmic Europeu (EEE).
            </p>
          </div>

          <div class="bg-surface-0 p-5 rounded-xl border border-surface-200 shadow-sm hover:border-primary-300 transition-colors md:col-span-2">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-primary">
                <i class="ti ti-gavel text-lg"></i>
              </div>
              <strong class="text-surface-900 text-base">Drets</strong>
            </div>
            <p class="text-surface-600 leading-relaxed pl-11">
              Pots exercir en qualsevol moment els teus drets d'accés, rectificació, supressió, limitació i oposició mitjançant sol·licitud per escrit adreçada al correu electrònic: <span class="font-semibold text-primary">entrenadortrail@gmail.com</span>.
            </p>
          </div>
        </div>
      </div>

      <div class="flex items-start gap-4 p-4 bg-primary-50 rounded-xl border border-primary-100 mb-8">
        <Checkbox v-model="accepted" binary inputId="acceptPolicy" class="mt-1" />
        <label for="acceptPolicy" class="text-surface-800 cursor-pointer select-none font-medium text-sm leading-relaxed">
          He llegit, entenc i accepto la informació sobre el tractament de les meves dades reflectida en la Política de Privacitat per a l'ús de l'aplicació d'entrenament.
        </label>
      </div>

      <div class="flex justify-end">
        <Button 
          label="Continuar" 
          icon="ti ti-arrow-right" 
          iconPos="right"
          size="large"
          class="w-full sm:w-auto px-8 py-3 font-bold"
          :disabled="!accepted"
          :loading="loading"
          @click="handleSubmit" 
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Optional specific styling */
</style>
