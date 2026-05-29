<script setup lang="ts">
import { inject } from 'vue'

type CountContext = {
  readonly value: number
  increment(): void
}

function increment() {
  countContext?.increment()
}

const countContext = inject<CountContext>('count')
</script>

<template>
  <button type="button" @click="increment">count: {{ countContext?.value ?? 0 }}</button>
</template>

<style scoped>

</style>
