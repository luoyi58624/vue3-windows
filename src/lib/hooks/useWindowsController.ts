import { getCurrentInstance, onMounted, onScopeDispose } from 'vue'

import { useWindowsSetupOptions } from './setupWindows'
import { useWindowsManager } from './useWindowsManager'
import { mountWindowsRenderer, type WindowsRendererHandle } from './mountWindowsRenderer'
import type { UseWindowsOptions, WindowAnchorTarget, WindowsRef } from '../types'

export function useWindowsController(
  anchorTarget: WindowAnchorTarget | null,
  options: UseWindowsOptions = {},
): WindowsRef {
  const manager = useWindowsManager()
  const setupOptions = useWindowsSetupOptions()
  const currentInstance = getCurrentInstance()
  let renderer: WindowsRendererHandle | null = null

  onMounted(() => {
    renderer = mountWindowsRenderer(manager, anchorTarget, {
      ...options,
      appContext: currentInstance?.appContext ?? null,
      setupOptions,
    })
  })

  onScopeDispose(() => {
    renderer?.dispose()
    renderer = null
    manager.api.closeAll()
  })

  return manager.api
}
