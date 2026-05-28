# API

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

## Window Expose

| 方法 / 状态 | 说明 |
| --- | --- |
| `windowState` | 当前窗口状态 |
| `minimize()` | 最小化 |
| `maximize()` | 最大化或还原 |
| `restore()` | 从最小化或最大化还原 |

## WindowManagerItem

```ts
export interface WindowManagerItem {
  id: number | string
  title: string
  visible: boolean
  state: 'normal' | 'minimized' | 'maximized'
  width?: string | number
  height?: string | number
  accentType?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  [key: string]: any
}
```

## WindowManager Slots

| 插槽 | 参数 | 说明 |
| --- | --- | --- |
| `title` | `{ item }` | 自定义窗口标题 |
| `window` | `{ item, minimizedCount, totalCount }` | 窗口内容 |
| `footer` | `{ item }` | 窗口底部 |
