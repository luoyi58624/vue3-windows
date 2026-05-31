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
import { useCurrentWindow, useWindows, windowSetup } from 'vue3-windows'

windowSetup({
  width: 600,
  minWidth: 200,
  minHeight: 200,
  zIndex: 100,
})

const windows = useWindows()

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

- `useWindows()` 创建窗口管理器，返回创建、关闭、最小化、置顶、更新和状态切换 API
- `useWindows('groupId')` 可选指定窗口分组，不同分组的窗口位置和同 id 几何缓存互不影响
- `useCurrentWindow()` 只能在窗口内容组件中使用，用于操作当前窗口
- `windowSetup()` 用于设置全局默认配置，`useWindows(options)` / `useWindows(id, options)` 和 `create(options)` 可以继续覆盖这些默认值
- 窗口状态只有 `normal`、`minimized`、`maximized`，最小化表示窗口暂时隐藏但记录、内容组件和 DOM 状态仍保留
