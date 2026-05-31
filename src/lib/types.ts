import type { Component } from 'vue'

export type AccentType = 'primary' | 'success' | 'warning' | 'danger' | 'info'

export type WindowState = 'normal' | 'minimized' | 'maximized'

export type WindowOutsideClickBehavior = 'none' | 'minimize' | 'remove'

/**
 * 窗口分组标识。
 *
 * 传给 `useWindows()` 后用于隔离同一组窗口的运行时缓存，例如不同页面可以用不同分组避免同名窗口复用几何信息。
 */
export type WindowsGroupId = number | string

/**
 * 窗口唯一标识。
 *
 * 可以传字符串、数字或 Vue 组件对象。传组件对象时，该组件对象会作为窗口单例 id；
 * 如果 `create()` 没有同时传 `component`，该组件也会被用作窗口内容组件。
 */
export type WindowId = number | string | Component

export interface WindowGeometry {
  left: number
  top: number
  width: number
  height: number
}

export interface WindowOptions {
  /**
   * 窗口唯一标识。
   *
   * 同一个 manager 内重复传入相同 id 会更新已有窗口，而不是创建新窗口。
   * 如果已有窗口处于 `minimized`，且本次没有显式传 `state`，窗口会按最小化前的
   * `normal` / `maximized` 状态重新显示。
   *
   * 当 id 是 Vue 组件对象且没有传 `component` 时，该组件会被当作窗口内容组件渲染。
   */
  id?: WindowId
  title?: string
  state?: WindowState
  outsideClickBehavior?: WindowOutsideClickBehavior
  /**
   * `normal` 状态的初始宽度。
   *
   * 显式传入时优先于同 `id` 上一次记录的窗口尺寸；省略时，同 `id` 会优先复用缓存尺寸。
   */
  width?: number
  /**
   * `normal` 状态的初始高度。
   *
   * 显式传入时优先于同 `id` 上一次记录的窗口尺寸；省略时，同 `id` 会优先复用缓存尺寸。
   */
  height?: number
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  minimizable?: boolean
  maximizable?: boolean
  closable?: boolean
  accentType?: AccentType
  bgColor?: string
  /**
   * 窗口渲染层级的起始 z-index。
   *
   * 该值会作为窗口层级种子的下限，内置默认值为 `100`；多窗口置顶时仍会在该值基础上递增。
   * 优先级为 `create(options)` > `useWindows(options)` > `windowSetup(options)` > 内置默认值。
   */
  zIndex?: number
  /**
   * 窗口内容组件。
   *
   * 如果省略该字段且 `id` 是 Vue 组件对象，则会默认使用 `id` 作为窗口内容组件。
   * 如果同时传入 `id` 组件和 `component`，则以显式传入的 `component` 为准。
   */
  component?: Component
  props?: Record<string, unknown>
  [key: string]: any
}

export interface WindowRecord extends WindowOptions {
  id: WindowId
  title: string
  state: WindowState
  /**
   * 窗口在 `normal` 状态下的运行时位置和尺寸。
   *
   * 同 `id` 窗口关闭后再次创建时，会优先复用上一次 `normal` 状态的 `rect`。
   * 该 `rect` 会持久化到 `localStorage` 的 `vue3-windows:geometry`。
   * 最大化时渲染出来的全屏尺寸不会写入这里，这样从 `maximized` 最小化后再恢复并还原时，
   * 窗口仍会回到原来的 `normal` 位置和尺寸。
   */
  rect?: WindowGeometry
}

export interface WindowsRef {
  windows: Readonly<import('vue').Ref<WindowRecord[]>>
  /**
   * 创建或更新窗口。
   *
   * 传入已有 id 时会更新已有窗口；如果该窗口处于 `minimized` 且本次没有显式传 `state`，
   * 会恢复到最小化前的 `normal` / `maximized` 状态。
   *
   * `options.id` 可以直接传 Vue 组件对象。此时如果没有传 `options.component`，
   * 该组件会被作为窗口内容组件渲染。
   */
  create(options?: WindowOptions): WindowRecord
  close(id: WindowId): void
  closeAll(): void
  minimize(id: WindowId): void
  moveTop(id: WindowId): void
  get(id: WindowId): WindowRecord | undefined
  update(id: WindowId, patch: Partial<WindowOptions>): void
  setState(id: WindowId, state: WindowState): void
}

export interface WindowsConfig {
  outsideClickBehavior?: WindowOutsideClickBehavior
  width?: number
  height?: number
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  minimizable?: boolean
  maximizable?: boolean
  closable?: boolean
  accentType?: AccentType
  bgColor?: string
  /**
   * 窗口渲染层级的起始 z-index，内置默认值为 `100`。
   */
  zIndex?: number
}

export interface UseWindowsOptions extends WindowsConfig {
  /**
   * 窗口分组标识。
   *
   * 同一个分组内，窗口会共享最近位置和同 id 窗口的几何缓存；不同分组之间互不影响。
   */
  id?: WindowsGroupId
}
