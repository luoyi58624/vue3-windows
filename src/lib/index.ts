export { default as Win10Dock } from './components/Win10Dock.vue'
export { default as WindowProvider } from './components/WindowProvider.vue'
export { default as WindowsDesktop } from './components/WindowsDesktop.vue'
export { default as WindowsDock } from './components/WindowsDock.vue'
export { useCurrentWindow } from './hooks/currentWindow'
export { globalWindow } from './hooks/globalWindow'
export type {
  AccentType,
  CreateWindowOptions,
  UseWindowsOptions,
  WindowAnchorTarget,
  WindowId,
  WindowOutsideClickBehavior,
  Win10DockTaskSlotProps,
  WindowsItem,
  WindowsSetupOptions,
  WindowsDesktopExpose,
  WindowsDesktopRef,
  WindowsRef,
  WindowState,
} from './types'
export { useWindows } from './hooks/useWindows'
