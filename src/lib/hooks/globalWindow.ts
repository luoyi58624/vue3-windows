import type { CreateWindowOptions, WindowId, WindowsItem, WindowsRef, WindowState } from '../types'
import { mountWindowsRenderer, type WindowsRendererHandle } from './mountWindowsRenderer'
import { useWindowsManager } from './useWindowsManager'

const manager = useWindowsManager()
let renderer: WindowsRendererHandle | null = null

function ensureRenderer() {
  if (typeof document === 'undefined') {
    return
  }

  if (renderer && !renderer.isConnected()) {
    renderer.dispose()
    renderer = null
  }

  if (!renderer) {
    renderer = mountWindowsRenderer(manager, null, {
      minimizable: false,
    })
  }
}

export const globalWindow: WindowsRef = {
  items: manager.api.items,
  create(options: CreateWindowOptions) {
    ensureRenderer()
    return manager.api.create(options)
  },
  close(id: WindowId) {
    ensureRenderer()
    manager.api.close(id)
  },
  closeAll() {
    manager.api.closeAll()
    renderer?.dispose()
    renderer = null
  },
  hide(id: WindowId) {
    ensureRenderer()
    manager.api.hide(id)
  },
  hideAll() {
    ensureRenderer()
    manager.api.hideAll()
  },
  show(id: WindowId) {
    ensureRenderer()
    manager.api.show(id)
  },
  showAll() {
    ensureRenderer()
    manager.api.showAll()
  },
  minimize(id: WindowId) {
    ensureRenderer()
    manager.api.minimize(id)
  },
  moveTop(id: WindowId) {
    ensureRenderer()
    manager.api.moveTop(id)
  },
  get(id: WindowId) {
    return manager.api.get(id)
  },
  update(id: WindowId, patch: Partial<WindowsItem>) {
    ensureRenderer()
    manager.api.update(id, patch)
  },
  setState(id: WindowId, state: WindowState) {
    ensureRenderer()
    manager.api.setState(id, state)
  },
}
