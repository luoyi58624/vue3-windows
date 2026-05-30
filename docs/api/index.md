# API

## `WindowProvider`

用于给子树里的 `useWindows()` / `WindowsDesktop` 注入窗口默认配置。没有包 `WindowProvider` 时，会继续使用内置默认配置。

单个窗口的 `create()` 配置优先级高于 `WindowProvider`。

支持的默认配置：`animated`、`outsideClickBehavior`、`width`、`height`、`minWidth`、`minHeight`、`maxWidth`、`maxHeight`、`minimizable`、`maximizable`、`closable`、`accentType`、`bgColor`。

## `useWindows(options?)`

在 `WindowsDesktop` 的子组件中获取当前桌面的窗口 API。默认会优先复用祖先 `WindowsDesktop` 提供的窗口管理器。

如果没有上层 `WindowsDesktop`，`useWindows()` 会创建独立窗口管理器。独立模式没有 dock，因此会强制隐藏最小化按钮。

传入 `useWindows({ global: true })` 时，会绕过祖先 `WindowsDesktop`，强制创建独立窗口管理器。该模式仍然继承当前组件树里的 `WindowProvider`、`provide` / `inject` 和应用级上下文。

Options:

| Option | Type | Description |
| --- | --- | --- |
| `global` | `boolean` | 是否绕过祖先 `WindowsDesktop`，默认 `false`。 |

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
| `dock` | 完全替换 dock。slot props 包含 `manager`、`windows`、`minimizedWindows`、`setDockTarget`。自定义 dock 需要调用 `setDockTarget(element)` 注册最小化目标。 |

Ref 暴露 `WindowsRef` 的全部 API：`create`、`close`、`closeAll`、`hide`、`hideAll`、`show`、`showAll`、`minimize`、`moveTop`、`get`、`update`、`setState`、`windows`。

## `WindowsDock`

默认 dock 组件。它用于 `WindowsDesktop` 内部，通过上下文读取窗口 API，不暴露 task slot props 或 `TaskComponent`。

## `Win10Dock`

Win10 风格 dock 组件。它和 `WindowsDock` 一样通过 inject 获取窗口上下文，可以直接放在 `WindowsDesktop` 的 `dock` slot 中。

`Win10Dock` 支持 `left`、`tasks`、`right` slots。`tasks` slot 提供 `manager`、`windows`、`minimizedWindows` 和 `TaskComponent`。

## `create(options)`

| Option | Type | Description |
| --- | --- | --- |
| `id` | `string \| number` | Optional. The current window manager generates an incrementing id when omitted. |
| `title` | `string` | 窗口标题。 |
| `component` | `Component` | 窗口内容组件。 |
| `props` | `Record<string, unknown>` | 传给内容组件的 props。 |
| `outsideClickBehavior` | `'none' \| 'hide' \| 'minimize' \| 'remove'` | 点击窗口外部时的行为，默认 `none`。 |
| `width` | `number` | 初始窗口宽度，默认 `560`。 |
| `height` | `number` | 初始窗口高度；不传时按内容高度自适应。 |
| `minWidth` / `minHeight` | `number` | 最小窗口尺寸，默认 `360` / `300`。 |
| `maxWidth` / `maxHeight` | `number` | 最大窗口尺寸；自适应高度也会被限制在最大范围内。 |
| `minimizable` | `boolean` | 是否显示最小化按钮。独立 `useWindows()` 模式会强制为 `false`。 |
| `maximizable` | `boolean` | 是否显示最大化按钮。 |
| `closable` | `boolean` | 是否显示关闭按钮。 |

## `useCurrentWindow()`

在窗口内部组件里获取当前窗口上下文。

可直接操作当前窗口的 `close`、`hide`、`show`、`minimize`、`maximize`、`restore`、`moveTop`、`setState` 和 `update`。

当前窗口数据通过 `window` 读取，例如 `currentWindow.window.value.title`。运行时窗口位置和尺寸在 `currentWindow.window.value.rect`，包含 `left`、`top`、`width`、`height`。
