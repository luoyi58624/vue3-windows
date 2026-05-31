import { getCurrentInstance, onMounted, onScopeDispose } from 'vue'

import { useWindowsManager } from './useWindowsManager'
import { mountWindowsRenderer, type WindowsRendererHandle } from './mountWindowsRenderer'
import { captureWindowOwnerContext, withWindowOwnerContext } from './windowOwnerContext'
import type { UseWindowsOptions, WindowsRef } from '../types'

export function useWindowsController(options: UseWindowsOptions = {}): WindowsRef {
  const manager = useWindowsManager(undefined, options.id)
  const currentInstance = getCurrentInstance()
  let renderer: WindowsRendererHandle | null = null

  function getOwnerContext() {
    return captureWindowOwnerContext(currentInstance)
  }

  const api: WindowsRef = {
    ...manager.api,
    create(options) {
      return manager.api.create(withWindowOwnerContext(options ?? {}, getOwnerContext()))
    },
  }

  onMounted(() => {
    const ownerContext = getOwnerContext()

    renderer = mountWindowsRenderer(manager, {
      ...options,
      appContext: currentInstance?.appContext ?? null,
      ownerContext,
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
