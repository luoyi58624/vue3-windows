<script setup lang="ts">
import { inject, type Ref } from 'vue'

const count = inject<Ref<number>>('count')!
</script>

<template>
  <button type="button" @click="count++">count: {{ count }}</button>
</template>

<style scoped>

</style>
