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
import { useCurrentWindow, useWindows } from 'vue3-windows'

const windows = useWindows({ simple: true })

const DetailWindow = defineComponent({
  setup() {
    const currentWindow = useCurrentWindow()
    return () => h('button', { type: 'button', onClick: currentWindow.close }, '关闭窗口')
  },
})

function openDetail() {
  windows.create({
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

- `useWindows({ simple: true })` 不需要 `WindowsDesktop`，会创建独立窗口管理器
- 独立模式没有 dock，会自动隐藏最小化按钮
- 需要桌面和 dock 时使用 `WindowsDesktop`
