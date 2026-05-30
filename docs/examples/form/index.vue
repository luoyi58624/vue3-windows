<template>
  <section class="form-window-demo">
    <button type="button" class="form-window-demo__button" @click="openForm">
      打开表单窗口
    </button>
  </section>
</template>

<script setup lang="ts">
import { useWindows } from 'vue3-windows'
import Form from './Form.vue'

const windows = useWindows({ global: true })

function openForm() {
  windows.create({
    title: 'Form 表单',
    width: 520,
    component: Form,
  })
}
</script>

<style scoped>
.form-window-demo {
  display: flex;
  align-items: center;
  min-height: 96px;
  padding: 16px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 8px;
  background: #f8fafc;
}

.form-window-demo__button {
  height: 34px;
  padding: 0 12px;
  border: 1px solid rgba(148, 163, 184, 0.36);
  border-radius: 6px;
  background: #fff;
  color: #334155;
  cursor: pointer;
}

</style>
