export type AccentType = 'primary' | 'success' | 'warning' | 'danger' | 'info'

export type WindowState = 'normal' | 'minimized' | 'maximized'

export interface WindowManagerItem {
  id: number | string
  title: string
  visible: boolean
  state: WindowState
  width?: string | number
  height?: string | number
  accentType?: AccentType
  [key: string]: any
}
