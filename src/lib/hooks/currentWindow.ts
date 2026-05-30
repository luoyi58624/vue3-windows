import { inject, provide, type ComputedRef, type InjectionKey } from 'vue'

import type { WindowOptions, WindowRecord, WindowState, WindowsRef } from '../types'

export interface CurrentWindowContext {
  window: ComputedRef<WindowRecord>
  api: ComputedRef<WindowsRef>
  minimizedCount: ComputedRef<number>
  totalCount: ComputedRef<number>
  close(): void
  remove(): void
  hide(): void
  show(): void
  minimize(): void
  maximize(): void
  restore(): void
  moveTop(): void
  setState(state: WindowState): void
  update(patch: Partial<WindowOptions>): void
}

const currentWindowKey = Symbol('vue3-windows-current-window') as InjectionKey<CurrentWindowContext>

export function provideCurrentWindowContext(context: CurrentWindowContext) {
  provide(currentWindowKey, context)
}

export function useCurrentWindow() {
  const context = inject(currentWindowKey, null)
  if (!context) {
    throw new Error('useCurrentWindow must be used inside a window content component.')
  }

  return context
}
