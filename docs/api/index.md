# API

## 最简单用法

最简单的方式是直接使用内置的全局窗口 API，不需要先放置 `WindowsDesktop`。

<ClientOnly>
  <SimpleWindowDemo />
</ClientOnly>

```vue
<script setup lang="ts">
import { globalWindow } from 'vue3-windows'

function openWindow() {
  globalWindow.create({
    id: 1,
    title: 'Demo',
  })
}
</script>

<template>
  <button type="button" @click="openWindow">Open</button>
</template>
```

<script setup>
import SimpleWindowDemo from '../examples/SimpleWindowDemo.vue'
</script>

## `WindowProvider`

用于给子树里的 `useWindows()` / `WindowsDesktop` 注入窗口默认配置。没有包 `WindowProvider` 时，会继续使用内置默认配置。

```vue
<template>
  <WindowProvider
    :animated="false"
    :min-width="520"
    :min-height="320"
    bg-color="var(--bgColor)"
  >
    <App />
  </WindowProvider>
</template>

<script setup lang="ts">
import { WindowProvider } from 'vue3-windows'
</script>
```

单个窗口的 `create()` 配置优先级更高：

```ts
windows.create({
  id: 1,
  title: 'Demo',
  minWidth: 360,
  minHeight: 240,
})
```

支持的默认配置：`animated`、`outsideClickBehavior`、`width`、`height`、`minWidth`、`minHeight`、`maxWidth`、`maxHeight`、`minimizable`、`maximizable`、`closable`、`accentType`、`bgColor`。

需要桌面和 dock 时，再使用 `WindowsDesktop`。也可以通过组件 ref 操作：

```vue
<template>
  <WindowsDesktop ref="desktopRef" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { WindowsDesktop } from 'vue3-windows'
import type { WindowsDesktopRef } from 'vue3-windows'

const desktopRef = ref<WindowsDesktopRef | null>(null)

desktopRef.value?.create({
  id: 'demo',
  title: 'Demo',
  component: DemoWindow,
})
</script>
```

## `globalWindow`

内置的全局窗口 API，可以在任意模块里直接导入使用。它不依赖 `WindowsDesktop`，也没有 dock，因此会强制隐藏最小化按钮。

```ts
import { globalWindow } from 'vue3-windows'

globalWindow.create({
  id: 'demo',
  title: 'Demo',
})
```

## `useWindows()`

在 `WindowsDesktop` 的子组件中获取当前桌面的窗口 API。它不接收参数。

```ts
const windows = useWindows()
windows.hideAll()
```

如果没有上层 `WindowsDesktop`，`useWindows()` 会创建独立窗口管理器。独立模式没有 dock，因此会强制隐藏最小化按钮。

## `WindowsDesktop`

桌面级窗口容器。它内部创建窗口管理器，通过组件 ref 暴露窗口 API，并默认渲染一个 `WindowsDock`。窗口默认最大化到全局视口，最小化会进入 dock 的任务区域；如果需要限制最大化范围，可以传入 `maximizeTarget`。

Props:

| Prop | Type | Description |
| --- | --- | --- |
| `animated` | `boolean` | 是否启用窗口动画，默认 `true`。 |
| `maximizeTarget` | `string \| HTMLElement \| Ref<HTMLElement \| null>` | 最大化锚点；不传时使用全局视口。 |

Slots:

| Slot | Description |
| --- | --- |
| `default` | 桌面内容，例如图标、快捷入口。 |
| `dock-left` | 默认 dock 的左侧内容。 |
| `dock-right` | 默认 dock 的右侧内容。 |
| `dock` | 完全替换 dock。slot props 包含 `windows`、`items`、`minimizedItems`、`setDockTarget`。自定义 dock 需要调用 `setDockTarget(element)` 注册最小化目标。 |

Ref 暴露 `WindowsRef` 的全部 API：`create`、`close`、`closeAll`、`hide`、`hideAll`、`show`、`showAll`、`minimize`、`moveTop`、`get`、`update`、`setState`、`items`。

## `WindowsDock`

Default dock component. It is used inside `WindowsDesktop`, reads window context internally, and does not expose task slot props or `TaskComponent`.

## `Win10Dock`

Win10 风格 dock 组件。它和 `WindowsDock` 一样通过 inject 获取窗口上下文，可以直接放在 `WindowsDesktop` 的 `dock` slot 中。

```vue
<WindowsDesktop>
  <template #dock="{ setDockTarget }">
    <Win10Dock @dock-target-change="setDockTarget" />
  </template>
</WindowsDesktop>
```

`Win10Dock` supports `left`, `tasks`, and `right` slots. The `tasks` slot provides `windows`, `items`, `minimizedItems`, and `TaskComponent`.

## `create(options)`

| Option | Type | Description |
| --- | --- | --- |
| `id` | `string \| number` | 必填，窗口唯一标识。 |
| `title` | `string` | 窗口标题。 |
| `component` | `Component` | 窗口内容组件。 |
| `props` | `Record<string, unknown>` | 传给内容组件的 props。 |
| `outsideClickBehavior` | `'none' \| 'hide' \| 'minimize' \| 'remove'` | 点击窗口外部时的行为，默认 `none`。 |
| `width` | `number` | 初始窗口宽度，默认 `560`。 |
| `height` | `number` | 初始窗口高度；不传时按内容高度自适应。 |
| `minWidth` / `minHeight` | `number` | 最小窗口尺寸，默认 `360` / `300`。 |
| `maxWidth` / `maxHeight` | `number` | 最大窗口尺寸；自适应高度也会被限制在最大范围内。 |
| `minimizable` | `boolean` | 是否显示最小化按钮。`globalWindow` 和独立 `useWindows()` 模式会强制为 `false`。 |
| `maximizable` | `boolean` | 是否显示最大化按钮。 |
| `closable` | `boolean` | 是否显示关闭按钮。 |

## `useCurrentWindow()`

在窗口内部组件里获取当前窗口上下文。

```ts
const currentWindow = useCurrentWindow()
currentWindow.close()
```

可直接操作当前窗口的 `close`、`hide`、`show`、`minimize`、`maximize`、`restore`、`moveTop`、`setState` 和 `update`。
