<script setup lang="ts">
import Tag from 'primevue/tag'

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
  if (estat === 'oberta') return 'Setmana oberta'
  if (estat === 'tancada') return 'Setmana tancada'
  if (estat === 'traspassada') return 'Entrenament traspassat'
  return 'Desconegut'
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
