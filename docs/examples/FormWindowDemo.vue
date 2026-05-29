<template>
  <section class="form-window-demo">
    <button type="button" class="form-window-demo__button" @click="openForm">
      打开表单窗口
    </button>
  </section>
</template>

<script setup lang="ts">
import { globalWindow } from 'vue3-windows'
import Form from "./Form.vue";

function openForm() {
  globalWindow.create({
    id: 'form-demo',
    title: 'Form 表单',
    width: 520,
    component: Form,
  })
}
</script>

<style scoped>

</style>
