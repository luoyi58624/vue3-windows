import type { Component } from 'vue'

export type AccentType = 'primary' | 'success' | 'warning' | 'danger' | 'info'

export type WindowState = 'normal' | 'minimized' | 'maximized'

export type WindowOutsideClickBehavior = 'none' | 'minimize' | 'remove'

export type WindowId = number | string

export interface WindowGeometry {
  left: number
  top: number
  width: number
  height: number
}

export interface WindowOptions {
  id?: WindowId
  title?: string
  state?: WindowState
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
  component?: Component
  props?: Record<string, unknown>
  [key: string]: any
}

export interface WindowRecord extends WindowOptions {
  id: WindowId
  title: string
  state: WindowState
  rect?: WindowGeometry
}

export interface WindowsRef {
  windows: Readonly<import('vue').Ref<WindowRecord[]>>
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
}

export interface UseWindowsOptions extends WindowsConfig {}
