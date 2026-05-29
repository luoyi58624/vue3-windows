# vue3-windows

Vue 3 窗口工具。

## 安装

```bash
bun add vue3-windows
```

## 最简用法

```vue
<script setup lang="ts">
import { defineComponent, h } from 'vue'
import { globalWindow, useCurrentWindow } from 'vue3-windows'

const DetailWindow = defineComponent({
  setup() {
    const currentWindow = useCurrentWindow()
    return () => h('button', { type: 'button', onClick: currentWindow.close }, '关闭窗口')
  },
})

function openDetail() {
  globalWindow.create({
    id: 'detail',
    title: '详情',
    component: DetailWindow,
  })
}
</script>

<template>
  <button type="button" @click="openDetail">打开窗口</button>
</template>
```

## 说明

- `globalWindow` 是内置的全局窗口 API，不需要 `WindowsDesktop`
- 全局窗口没有 dock，会自动隐藏最小化按钮
- 需要桌面和 dock 时使用 `WindowsDesktop`
