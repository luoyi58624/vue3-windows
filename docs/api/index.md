# API

## `windowSetup(options)`

设置全局默认配置。它会合并传入字段，`undefined` 字段会清除对应全局默认值。

支持的默认配置：`outsideClickBehavior`、`width`、`height`、`minWidth`、`minHeight`、`maxWidth`、`maxHeight`、`minimizable`、`maximizable`、`closable`、`accentType`、`bgColor`、`zIndex`。

`zIndex` 是窗口渲染层级的起始值，内置默认值为 `100`。多窗口置顶时会在该起始值基础上递增；如果需要避开 Element Plus 等组件库弹出层，通常保持默认值即可。

配置优先级：`create(options)` > `useWindows(options)` > `windowSetup(options)` > 内置默认值。

## `useWindows(options?)`

创建当前组件作用域内的窗口管理器。组件卸载时，该管理器创建的窗口会自动关闭并清理渲染节点。

默认直接调用 `useWindows()` 即可。需要分组时，可以额外传入可选的 `id`：`useWindows('groupId')`。

`id` 是当前 manager 的窗口分组标识，可传 `string` 或 `number`。不同分组会使用独立的窗口位置和同 id 几何缓存。

`options` 用于设置当前 manager 的默认窗口配置，字段和 `windowSetup()` 相同；分组也可以写成 `useWindows({ id, ...options })`。

返回的 `WindowsRef`：

| API | Description |
| --- | --- |
| `windows` | 当前 manager 的窗口记录 `Ref<WindowRecord[]>`。 |
| `create(options?)` | 创建窗口；传入已有 `id` 时更新同 id 窗口。若同 id 窗口已最小化且未显式传 `state`，会按最小化前的 `normal` / `maximized` 状态重新显示。 |
| `close(id)` / `closeAll()` | 关闭单个或全部窗口，并移除记录。 |
| `minimize(id)` | 设置为 `minimized`，窗口隐藏但记录、内容组件和 DOM 状态保留。 |
| `moveTop(id)` | 置顶窗口；若窗口已最小化，则恢复后置顶。 |
| `get(id)` | 获取窗口记录。 |
| `update(id, patch)` | 更新窗口记录。 |
| `setState(id, state)` | 设置 `normal`、`minimized` 或 `maximized`。当当前状态为 `minimized` 且目标为 `normal` 时，会按最小化前的 `normal` / `maximized` 状态还原。 |

## `create(options)`

| Option | Type | Description |
| --- | --- | --- |
| `id` | `string \| number \| Component` | Optional. 省略时自动生成递增 id；传组件对象时可把窗口内容组件作为单例窗口 id 使用。 |
| `title` | `string` | 窗口标题。 |
| `component` | `Component` | 窗口内容组件。 |
| `props` | `Record<string, unknown>` | 传给内容组件的 props。 |
| `state` | `'normal' \| 'minimized' \| 'maximized'` | 初始状态，默认 `normal`。 |
| `outsideClickBehavior` | `'none' \| 'minimize' \| 'remove'` | 点击窗口外部时的行为，默认 `none`。 |
| `width` / `height` | `number` | 初始窗口尺寸。 |
| `minWidth` / `minHeight` | `number` | 最小窗口尺寸，默认 `200` / `200`。 |
| `maxWidth` / `maxHeight` | `number` | 最大窗口尺寸。 |
| `minimizable` | `boolean` | 是否显示最小化按钮。 |
| `maximizable` | `boolean` | 是否显示最大化按钮。 |
| `closable` | `boolean` | 是否显示关闭按钮。 |
| `accentType` | `'primary' \| 'success' \| 'warning' \| 'danger' \| 'info'` | 窗口强调色。 |
| `bgColor` | `string` | 窗口背景色。 |
| `zIndex` | `number` | 窗口渲染层级的起始 z-index，默认 `100`；多窗口置顶时会在该值基础上递增。 |

### 窗口位置和尺寸记忆

每个 `useWindows()` manager 内部维护一个窗口几何状态，并统一持久化到 `localStorage` 的 `vue3-windows:geometry`。未传分组时使用 `global` 分组；传分组时会在 `windows_record` 下多一层分组 key：

```ts
{
  version: 3,
  last_position: {
    global: { left, top } | null,
    user: { left, top } | null,
    menu: { left, top } | null
  },
  windows_record: {
    global: Record<string, { left, top, width, height }>,
    user: Record<string, { left, top, width, height }>,
    menu: Record<string, { left, top, width, height }>
  }
}
```

- `last_position` 按分组记录最后一个 `normal` 状态窗口的位置。创建新窗口且没有历史 `rect` 时，会从当前分组的位置偏移打开；没有记录时居中打开。
- `windows_record` 先按分组存储，再按序列化后的 `id` 记录该窗口最近一次 `normal` 状态的位置和宽高。关闭页面并刷新后，再次用同一个分组和同一个 `id` 创建窗口，会从 `localStorage` 复用这份位置和尺寸。
- `create(options)` 显式传入的 `width` / `height` 优先于 `windows_record` 缓存尺寸，但位置仍复用同 `id` 的缓存位置。
- 最大化渲染出的全屏尺寸不会写入 `windows_record`，也不会覆盖 `WindowRecord.rect`。
- `string` / `number` id 会完整持久化；组件 id 会使用组件 `name` / `__name` 作为持久化 key，匿名组件无法跨刷新稳定恢复。

### 组件作为 `id`

`id` 可以直接传 Vue 组件对象：

```ts
windows.create({
  id: DetailWindow,
})
```

此时规则如下：

- 如果没有传 `component`，会默认用 `id` 这个组件作为窗口内容组件。
- 如果同时传了 `id` 组件和 `component`，显式传入的 `component` 优先。
- 同一个组件对象再次作为 `id` 传入时，会更新已有窗口，不会创建第二个窗口。
- 对应的 `get()`、`close()`、`minimize()`、`moveTop()`、`setState()` 也都可以直接传这个组件对象。

## `useCurrentWindow()`

在窗口内容组件里获取当前窗口上下文。

可操作当前窗口的 `close`、`remove`、`minimize`、`maximize`、`restore`、`moveTop`、`setState` 和 `update`。

当前窗口记录通过 `currentWindow.window.value` 读取，例如 `currentWindow.window.value.title`。运行时 `normal` 状态的位置和尺寸在 `currentWindow.window.value.rect`；最大化渲染出的全屏尺寸不会覆盖它，所以 `maximized -> minimized -> 恢复最大化 -> 还原` 会回到原来的 `normal` 尺寸。
