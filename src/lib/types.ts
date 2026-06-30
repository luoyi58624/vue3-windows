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
 * 仅支持字符串或数字。省略或传 `null` / `undefined` 时，
 * `create()` 会按 `component -> title -> 全局自增` 生成实际 id。
 */
export type WindowId = number | string

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
   * 当 `id` 为空时，会按 `component -> title -> 全局自增` 生成实际 id。
   */
  id?: WindowId | null
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
   * 是否在创建窗口时复用最近位置和同 `id` 的历史位置，默认 `true`。
   *
   * 设为 `false` 时，窗口会按当前尺寸居中打开。
   */
  rememberPosition?: boolean
  /**
   * 窗口内容组件。
   *
   * 当 `id` 为空时，会优先尝试用组件名作为实际 id；
   * 组件没有可用名称时，再回退到 `title` 或全局自增 id。
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
   * `options.id` 为空时，会按 `component -> title -> 全局自增` 推导实际 id。
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
  /**
   * 是否在创建窗口时复用最近位置和同 `id` 的历史位置，默认 `true`。
   *
   * 设为 `false` 时，窗口会按当前尺寸居中打开。
   */
  rememberPosition?: boolean
}

export interface UseWindowsOptions extends WindowsConfig {
  /**
   * 窗口分组标识。
   *
   * 同一个分组内，窗口会共享最近位置和同 id 窗口的几何缓存；不同分组之间互不影响。
   */
  id?: WindowsGroupId
}
