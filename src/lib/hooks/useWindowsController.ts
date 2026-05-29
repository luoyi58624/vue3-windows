import { getCurrentInstance, onMounted, onScopeDispose } from 'vue'

import { useWindowsSetupOptions } from './setupWindows'
import { useWindowsManager } from './useWindowsManager'
import { mountWindowsRenderer, type WindowsRendererHandle } from './mountWindowsRenderer'
import { captureWindowOwnerContext, withWindowOwnerContext } from './windowOwnerContext'
import type { UseWindowsOptions, WindowAnchorTarget, WindowsRef } from '../types'

export function useWindowsController(
  anchorTarget: WindowAnchorTarget | null,
  options: UseWindowsOptions = {},
): WindowsRef {
  const manager = useWindowsManager()
  const setupOptions = useWindowsSetupOptions()
  const currentInstance = getCurrentInstance()
  let renderer: WindowsRendererHandle | null = null

  function getOwnerContext() {
    return captureWindowOwnerContext(currentInstance)
  }

  const api: WindowsRef = {
    ...manager.api,
    create(options) {
      return manager.api.create(withWindowOwnerContext(options, getOwnerContext()))
    },
  }

  onMounted(() => {
    const ownerContext = getOwnerContext()

    renderer = mountWindowsRenderer(manager, anchorTarget, {
      ...options,
      appContext: currentInstance?.appContext ?? null,
      ownerContext,
      setupOptions,
      api,
    })
  })

  onScopeDispose(() => {
    renderer?.dispose()
    renderer = null
    manager.api.closeAll()
  })

  return api
}
