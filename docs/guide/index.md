# 介绍

`vue3-windows` 的入口很小：

- `useWindows()` 创建或访问窗口管理器
- `WindowsDesktop` 创建带 dock 的桌面窗口管理器
- `useCurrentWindow()` 让窗口内部组件操作当前窗口

## 最简示例

<ClientOnly>
  <SimpleWindowDemo />
</ClientOnly>

```vue
<script setup lang="ts">
import { useWindows } from 'vue3-windows'

const windows = useWindows()

function openWindow() {
  windows.create({
    id: 1,
    title: 'Demo',
  })
}
</script>

<template>
  <button type="button" @click="openWindow">打开窗口</button>
</template>
```

<script setup>
import SimpleWindowDemo from '../examples/SimpleWindowDemo.vue'
</script>
