<script setup lang="ts">
import Tag from 'primevue/tag'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{
  estat: 'oberta' | 'tancada' | 'traspassada' | null | string
}>()

const getSeverity = (estat: string) => {
  if (estat === 'oberta') return 'success'
  if (estat === 'tancada') return 'secondary'
  if (estat === 'traspassada') return 'info'
  return 'secondary'
}

const getLabel = (estat: string) => {
  if (estat === 'oberta') return t('weekStatus.open')
  if (estat === 'tancada') return t('weekStatus.closed')
  if (estat === 'traspassada') return t('weekStatus.transferred')
  return t('weekStatus.unknown')
}
</script>

<template>
  <Tag 
    v-if="estat" 
    :severity="getSeverity(estat)"
    :value="getLabel(estat)"
    class="status-badge"
  />
</template>

<style scoped>
.status-badge {
  font-weight: 500;
  letter-spacing: 0.02em;
}
</style>
