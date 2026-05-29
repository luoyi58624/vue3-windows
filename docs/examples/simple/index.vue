<template>
  <section class="simple-window-demo">
    <button type="button" class="simple-window-demo__button" @click="windows.create({ id: 'count', component: Child })">
      打开窗口
    </button>
    <Child/>
  </section>
</template>

<script setup lang="ts">
import { useWindows } from 'vue3-windows'
import { provide, ref } from 'vue'
import Child from './count.vue'

const count = ref(0)
provide('count', count)
const windows = useWindows({ global: true })
</script>

<style scoped>
.simple-window-demo {
  display: flex;
  align-items: center;
  min-height: 96px;
  padding: 16px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 8px;
  background: #f8fafc;
}

.simple-window-demo__button {
  height: 34px;
  padding: 0 12px;
  border: 1px solid rgba(148, 163, 184, 0.36);
  border-radius: 6px;
  background: #fff;
  color: #334155;
  cursor: pointer;
}
</style>
