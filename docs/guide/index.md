# 快速开始

## 安装

```bash
bun add vue3-windows
```

## 单窗口

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

## 多窗口管理

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

## 本地开发

```bash
bun install
bun run dev
```

`bun run dev` 会启动 VitePress 文档站点，demo 页面在 `/demo/`。
