import { inject, provide, type ComputedRef, type InjectionKey } from 'vue'

import type { WindowRecord, WindowsRef } from '../types'

export interface WindowsDesktopContext {
  manager: WindowsRef
  windows: ComputedRef<WindowRecord[]>
  minimizedWindows: ComputedRef<WindowRecord[]>
}

const windowsDesktopKey = Symbol('vue3-windows-desktop') as InjectionKey<WindowsDesktopContext>

export function provideWindowsDesktopContext(context: WindowsDesktopContext) {
  provide(windowsDesktopKey, context)
}

export function useWindowsDesktopContext() {
  const context = useOptionalWindowsDesktopContext()
  if (!context) {
    throw new Error('WindowsDock must be used inside WindowsDesktop.')
  }

  return context
}

export function useOptionalWindowsDesktopContext() {
  const context = inject(windowsDesktopKey, null)
  return context
}
