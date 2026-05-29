# 介绍

`vue3-windows` windows 窗口管理器

## 入门示例

<ClientOnly>
  <SimpleWindowDemo />
</ClientOnly>

```vue
<script setup lang="ts">
import { useWindows } from 'vue3-windows'

const windows = useWindows()
</script>

<template>
  <button type="button" @click="windows.create({id: 'Demo'})">打开窗口</button>
</template>
```

<script setup>
import SimpleWindowDemo from '../examples/SimpleWindowDemo.vue'
</script>
