import type { CreateWindowOptions, WindowId, WindowsItem, WindowsRef, WindowState } from '../types'
import { mountWindowsRenderer, type WindowsRendererHandle } from './mountWindowsRenderer'
import { useWindowsManager } from './useWindowsManager'
import { captureWindowOwnerContext, withWindowOwnerContext, type WindowOwnerContext } from './windowOwnerContext'

const manager = useWindowsManager()
let renderer: WindowsRendererHandle | null = null
let rendererOwnerContext: WindowOwnerContext | null = null

function ensureRenderer(ownerContext: WindowOwnerContext | null, api: WindowsRef) {
  if (typeof document === 'undefined') {
    return
  }

  if (renderer && !renderer.isConnected()) {
    renderer.dispose()
    renderer = null
    rendererOwnerContext = null
  }

  if (renderer && ownerContext && !rendererOwnerContext && !manager.model.value.length) {
    renderer.dispose()
    renderer = null
    rendererOwnerContext = null
  }

  if (!renderer) {
    renderer = mountWindowsRenderer(manager, null, {
      minimizable: false,
      ownerContext,
      api,
    })
    rendererOwnerContext = ownerContext
  }
}

function createGlobalWindowsRef(ownerContext: WindowOwnerContext | null): WindowsRef {
  const api: WindowsRef = {
    items: manager.api.items,
    create(options: CreateWindowOptions) {
      const context = ownerContext ?? captureWindowOwnerContext()
      ensureRenderer(context, api)
      return manager.api.create(withWindowOwnerContext(options, context))
    },
    close(id: WindowId) {
      ensureRenderer(ownerContext, api)
      manager.api.close(id)
    },
    closeAll() {
      manager.api.closeAll()
      renderer?.dispose()
      renderer = null
      rendererOwnerContext = null
    },
    hide(id: WindowId) {
      ensureRenderer(ownerContext, api)
      manager.api.hide(id)
    },
    hideAll() {
      ensureRenderer(ownerContext, api)
      manager.api.hideAll()
    },
    show(id: WindowId) {
      ensureRenderer(ownerContext, api)
      manager.api.show(id)
    },
    showAll() {
      ensureRenderer(ownerContext, api)
      manager.api.showAll()
    },
    minimize(id: WindowId) {
      ensureRenderer(ownerContext, api)
      manager.api.minimize(id)
    },
    moveTop(id: WindowId) {
      ensureRenderer(ownerContext, api)
      manager.api.moveTop(id)
    },
    get(id: WindowId) {
      return manager.api.get(id)
    },
    update(id: WindowId, patch: Partial<WindowsItem>) {
      ensureRenderer(ownerContext, api)
      manager.api.update(id, patch)
    },
    setState(id: WindowId, state: WindowState) {
      ensureRenderer(ownerContext, api)
      manager.api.setState(id, state)
    },
  }

  return api
}

export const globalWindow: WindowsRef = createGlobalWindowsRef(null)

export function useGlobalWindow(): WindowsRef {
  return createGlobalWindowsRef(captureWindowOwnerContext())
}
