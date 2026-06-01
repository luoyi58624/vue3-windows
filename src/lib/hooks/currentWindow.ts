import { inject, provide, watch, type ComputedRef, type InjectionKey, type WatchOptions, type WatchStopHandle } from 'vue'

import type { WindowOptions, WindowRecord, WindowState, WindowsRef } from '../types'

export type CurrentWindowWatchListener = (
  window: WindowRecord,
  previousWindow: WindowRecord | undefined,
) => void

export type CurrentWindowSelector<T> = (window: WindowRecord) => T

export interface ProvidedCurrentWindowContext {
  window: ComputedRef<WindowRecord>
  api: ComputedRef<WindowsRef>
  minimizedCount: ComputedRef<number>
  totalCount: ComputedRef<number>
  close(): void
  remove(): void
  minimize(): void
  maximize(): void
  restore(): void
  moveTop(): void
  setState(state: WindowState): void
  update(patch: Partial<WindowOptions>): void
}

export interface CurrentWindowContext extends ProvidedCurrentWindowContext {
  watchWindow(listener: CurrentWindowWatchListener, options?: WatchOptions): WatchStopHandle
  watchWindow<T>(
    selector: CurrentWindowSelector<T>,
    listener: (value: T, previousValue: T | undefined) => void,
    options?: WatchOptions,
  ): WatchStopHandle
}

const currentWindowKey = Symbol('vue3-windows-current-window') as InjectionKey<ProvidedCurrentWindowContext>

export function provideCurrentWindowContext(context: ProvidedCurrentWindowContext) {
  provide(currentWindowKey, context)
}

export function useCurrentWindow() {
  const context = inject(currentWindowKey, null)
  if (!context) {
    throw new Error('useCurrentWindow must be used inside a window content component.')
  }

  const currentContext = context

  function watchWindow<T>(
    selectorOrListener: CurrentWindowSelector<T> | CurrentWindowWatchListener,
    listenerOrOptions?: ((value: T, previousValue: T | undefined) => void) | WatchOptions,
    maybeOptions?: WatchOptions,
  ) {
    if (typeof listenerOrOptions === 'function') {
      return watch(
        () => (selectorOrListener as CurrentWindowSelector<T>)(currentContext.window.value),
        (value, previousValue) => {
          ;(listenerOrOptions as (value: T, previousValue: T | undefined) => void)(value, previousValue)
        },
        maybeOptions,
      )
    }

    return watch(
      currentContext.window,
      (window, previousWindow) => {
        ;(selectorOrListener as CurrentWindowWatchListener)(window, previousWindow)
      },
      { deep: true, ...(listenerOrOptions as WatchOptions | undefined) },
    )
  }

  return {
    ...currentContext,
    watchWindow,
  }
}
