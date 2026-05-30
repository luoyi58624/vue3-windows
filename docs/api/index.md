# API

## `windowSetup(options)`

设置全局默认配置。它会合并传入字段，`undefined` 字段会清除对应全局默认值。

支持的默认配置：`outsideClickBehavior`、`width`、`height`、`minWidth`、`minHeight`、`maxWidth`、`maxHeight`、`minimizable`、`maximizable`、`closable`、`accentType`、`bgColor`。

配置优先级：`create(options)` > `useWindows(options)` > `windowSetup(options)` > 内置默认值。

## `useWindows(options?)`

创建当前组件作用域内的窗口管理器。组件卸载时，该管理器创建的窗口会自动关闭并清理渲染节点。

`options` 用于设置当前 manager 的默认窗口配置，字段和 `windowSetup()` 相同。

返回的 `WindowsRef`：

| API | Description |
| --- | --- |
| `windows` | 当前 manager 的窗口记录 `Ref<WindowRecord[]>`。 |
| `create(options?)` | 创建窗口；传入已有 `id` 时更新同 id 窗口。 |
| `close(id)` / `closeAll()` | 关闭单个或全部窗口，并移除记录。 |
| `minimize(id)` | 设置为 `minimized`，窗口不再渲染但记录保留。 |
| `moveTop(id)` | 置顶窗口；若窗口已最小化，则恢复后置顶。 |
| `get(id)` | 获取窗口记录。 |
| `update(id, patch)` | 更新窗口记录。 |
| `setState(id, state)` | 设置 `normal`、`minimized` 或 `maximized`。 |

## `create(options)`

| Option | Type | Description |
| --- | --- | --- |
| `id` | `string \| number` | Optional. 省略时自动生成递增 id。 |
| `title` | `string` | 窗口标题。 |
| `component` | `Component` | 窗口内容组件。 |
| `props` | `Record<string, unknown>` | 传给内容组件的 props。 |
| `state` | `'normal' \| 'minimized' \| 'maximized'` | 初始状态，默认 `normal`。 |
| `outsideClickBehavior` | `'none' \| 'minimize' \| 'remove'` | 点击窗口外部时的行为，默认 `none`。 |
| `width` / `height` | `number` | 初始窗口尺寸。 |
| `minWidth` / `minHeight` | `number` | 最小窗口尺寸，默认 `360` / `300`。 |
| `maxWidth` / `maxHeight` | `number` | 最大窗口尺寸。 |
| `minimizable` | `boolean` | 是否显示最小化按钮。 |
| `maximizable` | `boolean` | 是否显示最大化按钮。 |
| `closable` | `boolean` | 是否显示关闭按钮。 |
| `accentType` | `'primary' \| 'success' \| 'warning' \| 'danger' \| 'info'` | 窗口强调色。 |
| `bgColor` | `string` | 窗口背景色。 |

## `useCurrentWindow()`

在窗口内容组件里获取当前窗口上下文。

可操作当前窗口的 `close`、`remove`、`minimize`、`maximize`、`restore`、`moveTop`、`setState` 和 `update`。

当前窗口记录通过 `currentWindow.window.value` 读取，例如 `currentWindow.window.value.title`。运行时窗口位置和尺寸在 `currentWindow.window.value.rect`。
