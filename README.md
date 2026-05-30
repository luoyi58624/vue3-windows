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

const windows = useWindows({ global: true })

const DetailWindow = defineComponent({
  setup() {
    const currentWindow = useCurrentWindow()
    return () => h('button', { type: 'button', onClick: currentWindow.close }, '关闭窗口')
  },
})

function openDetail() {
  windows.create({
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

- `useWindows()` 默认会复用祖先 `WindowsDesktop` 的窗口 API
- `useWindows({ global: true })` 会绕过祖先 `WindowsDesktop`，创建独立窗口管理器
- 独立窗口没有 dock，会自动隐藏最小化按钮
- 需要桌面和 dock 时使用 `WindowsDesktop`
