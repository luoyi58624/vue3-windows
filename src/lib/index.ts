export { default as Win10Dock } from './components/Win10Dock.vue'
export { default as WindowProvider } from './components/WindowProvider.vue'
export { default as WindowsDesktop } from './components/WindowsDesktop.vue'
export { default as WindowsDock } from './components/WindowsDock.vue'
export { useCurrentWindow } from './hooks/currentWindow'
export type {
  AccentType,
  UseWindowsOptions,
  WindowAnchorTarget,
  WindowId,
  WindowOptions,
  WindowOutsideClickBehavior,
  Win10DockTaskSlotProps,
  WindowsSetupOptions,
  WindowsDesktopExpose,
  WindowsDesktopRef,
  WindowsRef,
  WindowState,
} from './types'
export { useWindows } from './hooks/useWindows'
