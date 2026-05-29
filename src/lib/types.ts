import type { Component } from 'vue'

export type AccentType = 'primary' | 'success' | 'warning' | 'danger' | 'info'

export type WindowState = 'normal' | 'minimized' | 'maximized'

export type WindowOutsideClickBehavior = 'none' | 'hide' | 'minimize' | 'remove'

export type WindowId = number | string

export type WindowAnchorTarget = string | HTMLElement | import('vue').Ref<HTMLElement | null | undefined>

export interface WindowsItem {
  id: WindowId
  title: string
  visible: boolean
  state: WindowState
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

export interface CreateWindowOptions extends Partial<Omit<WindowsItem, 'id'>> {
  id: WindowId
}

export interface WindowsRef {
  items: Readonly<import('vue').Ref<WindowsItem[]>>
  create(options: CreateWindowOptions): WindowsItem
  close(id: WindowId): void
  closeAll(): void
  hide(id: WindowId): void
  hideAll(): void
  show(id: WindowId): void
  showAll(): void
  minimize(id: WindowId): void
  moveTop(id: WindowId): void
  get(id: WindowId): WindowsItem | undefined
  update(id: WindowId, patch: Partial<WindowsItem>): void
  setState(id: WindowId, state: WindowState): void
}

export interface UseWindowsOptions {
  animated?: boolean
  maximizeTarget?: WindowAnchorTarget | null
  minimizable?: boolean
}

export interface WindowsSetupOptions {
  animated?: boolean
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

export interface WindowsDesktopRef extends Omit<WindowsRef, 'items'> {
  items: WindowsItem[]
}

export interface WindowsDesktopExpose extends WindowsRef {}

export interface Win10DockTaskSlotProps {
  windows: WindowsRef
  items: WindowsItem[]
  minimizedItems: WindowsItem[]
  TaskComponent: Component
}
