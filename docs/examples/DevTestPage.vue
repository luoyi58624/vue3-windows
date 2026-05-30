<script setup lang="ts">
import { ref } from 'vue'
import { Win10Dock, WindowsDesktop, type WindowsDesktopRef } from 'vue3-windows'

const windowsRef = ref<WindowsDesktopRef | null>(null)

function openWindow() {
  windowsRef.value!.create()
}
</script>

<template>
  <WindowsDesktop ref="windowsRef">
    <div class="window-content">
      <button type="button" @click="openWindow">打开窗口</button>
    </div>
    <Win10Dock></Win10Dock>
  </WindowsDesktop>
</template>

<style>
button {
  height: 34px;
  padding: 0 12px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 8px;
  background: #fff;
  color: #0f172a;
  font-weight: 600;
  cursor: pointer;
}
</style>
