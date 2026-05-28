# vue3-windows

Vue 3 多窗口组件库，提供可拖拽、可缩放、可最大化、可最小化到 dock 的窗口组件。

## 安装

```bash
bun add vue3-windows
```

## 快速使用

```vue
<template>
  <Window v-model="visible" title="资料窗口" width="560" height="420">
    <p>这里放窗口内容。</p>
  </Window>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Window } from 'vue3-windows'
import 'vue3-windows/style.css'

const visible = ref(true)
</script>
```

也可以全局注册：

```ts
import { createApp } from 'vue'
import Vue3Windows from 'vue3-windows'
import 'vue3-windows/style.css'

import App from './App.vue'

createApp(App).use(Vue3Windows).mount('#app')
```

## WindowManager 示例

`WindowManager` 适合管理一组本地窗口。关闭窗口时会从 `items` 中移除；最小化窗口会进入管理器自己的 dock。

```vue
<template>
  <button @click="openWindow">打开窗口</button>

  <section class="stage">
    <WindowManager v-model:items="windows">
      <template #window="{ item, minimizedCount, totalCount }">
        <p>{{ item.title }}</p>
        <p>总数：{{ totalCount }}，最小化：{{ minimizedCount }}</p>
      </template>
    </WindowManager>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { WindowManager, type WindowManagerItem } from 'vue3-windows'
import 'vue3-windows/style.css'

interface DemoWindow extends WindowManagerItem {
  id: number
}

const windows = ref<DemoWindow[]>([])
let id = 1

function openWindow() {
  windows.value.push({
    id: id++,
    title: '新窗口',
    visible: true,
    state: 'normal',
    width: 520,
    height: 320,
    accentType: 'primary',
  })
}
</script>

<style scoped>
.stage {
  position: relative;
  height: 600px;
  overflow: hidden;
}
</style>
```

## 文档与 demo

```bash
cd D:\project\vue\vue3-windows
bun install
bun run dev
```

这个项目通过 `packageManager` 声明为 Bun 项目，请不要用 `pnpm run dev` 或 `pnpm install`。如果看到 `This project is configured to use bun`，说明当前命令仍然是 pnpm，请切换为上面的 Bun 命令。

文档由 VitePress 驱动，demo 页面位于 `docs/demo/`，不会进入组件包源码。

## 构建发布包

```bash
bun run build:lib
```

构建产物会输出到 `dist`，包含 ESM、UMD、类型声明和样式文件。

## 更新历史

```bash
bun run changelog
```

该命令会读取 git commit message 并生成 `docs/changelog/index.md`。

## GitHub Pages

`.github/workflows/pages.yml` 会在 GitHub Release 发布后自动构建库和 VitePress 文档，并部署 `docs/.vitepress/dist` 到 GitHub Pages。

## Window Props

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `v-model` | `boolean` | `false` | 控制窗口显示 |
| `title` | `string` | `''` | 标题 |
| `width` | `string \| number` | `560` | 初始宽度 |
| `height` | `string \| number` | `420` | 初始高度 |
| `minWidth` | `number` | `360` | 最小宽度 |
| `minHeight` | `number` | `240` | 最小高度 |
| `modal` | `boolean` | `false` | 是否显示遮罩 |
| `draggable` | `boolean` | `true` | 是否可拖拽 |
| `resizable` | `boolean` | `true` | 是否可缩放 |
| `minimizable` | `boolean` | `true` | 是否可最小化 |
| `maximizable` | `boolean` | `true` | 是否可最大化 |
| `closable` | `boolean` | `true` | 是否显示关闭按钮 |
| `appendToBody` | `boolean` | `true` | 是否挂载到 `body` |
| `closeOnClickModal` | `boolean` | `false` | 点击遮罩关闭 |
| `closeOnPressEscape` | `boolean` | `true` | 按 `Escape` 关闭 |
| `minimizeTo` | `string \| HTMLElement \| null` | `null` | 最小化 dock 容器 |
| `accentType` | `'primary' \| 'success' \| 'warning' \| 'danger' \| 'info'` | `'primary'` | 主题强调色 |
| `dockIndex` | `number` | `0` | dock 堆叠位置 |
| `dockStep` | `number` | `84` | dock 横向间距 |

## Window Events

| 事件 | 说明 |
| --- | --- |
| `open` | 开始打开 |
| `opened` | 打开后 |
| `close` | 开始关闭 |
| `closed` | 关闭后 |
| `minimize-start` | 最小化动画开始前 |
| `minimize` | 最小化完成 |
| `maximize` | 最大化完成 |
| `restore` | 还原完成 |

## WindowManager 数据结构

```ts
export interface WindowManagerItem {
  id: number | string
  title: string
  visible: boolean
  state: 'normal' | 'minimized' | 'maximized'
  width?: string | number
  height?: string | number
  accentType?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
}
```

`WindowManager` 暴露 `window`、`title`、`footer` 插槽。`window` 插槽参数包括：

- `item`：当前窗口数据
- `minimizedCount`：当前最小化窗口数
- `totalCount`：当前窗口总数
