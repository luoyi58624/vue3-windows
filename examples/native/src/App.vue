<script setup lang="ts">
import { useWindows } from "vue3-windows";
import Child from "./child.vue";
import { provide, ref } from "vue";

const count = ref(0)
provide('count', count)
const windows = useWindows()
</script>

<template>
  <div>
    <button @click="windows.create({ title: 'Demo', component: Child })">
      打开窗口
    </button>
  </div>
</template>

<style scoped>

</style>
