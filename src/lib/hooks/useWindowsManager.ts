import { markRaw, nextTick, ref, type Ref } from 'vue'
import type { ComponentPublicInstance } from 'vue'

import type { WindowGeometry, WindowId, WindowOptions, WindowOutsideClickBehavior, WindowRecord, WindowsRef, WindowState } from '../types'

type ManagedWindowState = WindowState
type WindowExpose = ComponentPublicInstance & {
  moveTop: () => void
}
type RestorableWindowState = Exclude<WindowState, 'minimized'>

export function useWindowsManager(model: Ref<WindowRecord[]> = ref<WindowRecord[]>([])) {
  const windowRefs = new Map<WindowId, WindowExpose>()
  const restoreStates = new Map<WindowId, RestorableWindowState>()
  let nextWindowId = 1

  const api: WindowsRef = {
    windows: model,
    create,
    close,
    closeAll,
    minimize,
    moveTop,
    get,
    update,
    setState,
  }

  function setWindowRef(id: WindowId, instance: Element | ComponentPublicInstance | null) {
    if (!instance) {
      windowRefs.delete(id)
      return
    }

    windowRefs.set(id, instance as WindowExpose)
  }

  function create(options: WindowOptions = {}) {
    const hasExplicitId = options.id !== undefined
    const id = options.id ?? createWindowId()
    const existing = hasExplicitId ? get(id) : undefined

    if (existing) {
      const nextPatch: Partial<WindowRecord> = {
        ...options,
        id,
        state: options.state ?? 'normal',
      }
      if (options.component) {
        nextPatch.component = markRaw(options.component)
      }
      if (!options.title) {
        delete nextPatch.title
      }
      Object.assign(existing, nextPatch)
      syncRestoreState(id, existing.state)
      if (existing.state !== 'minimized') {
        moveTopOnNextTick(id)
      }
      return existing
    }

    const windowRecord: WindowRecord = {
      ...options,
      id,
      title: options.title ?? String(id),
      state: options.state ?? 'normal',
      component: options.component ? markRaw(options.component) : options.component,
    }

    model.value = [...model.value, windowRecord]
    syncRestoreState(id, windowRecord.state)
    if (windowRecord.state !== 'minimized') {
      moveTopOnNextTick(id)
    }
    return windowRecord
  }

  function createWindowId() {
    while (get(nextWindowId)) {
      nextWindowId += 1
    }

    const id = nextWindowId
    nextWindowId += 1
    return id
  }

  function close(id: WindowId) {
    handleClosed(id)
  }

  function closeAll() {
    restoreStates.clear()
    windowRefs.clear()
    model.value = []
  }

  function minimize(id: WindowId) {
    updateWindowState(id, 'minimized')
  }

  function moveTop(id: WindowId) {
    const target = get(id)
    if (!target) {
      return
    }

    if (target.state === 'minimized') {
      updateWindowState(id, restoreStates.get(id) ?? 'normal')
      nextTick(() => {
        windowRefs.get(id)?.moveTop()
      })
      return
    }

    windowRefs.get(id)?.moveTop()
  }

  function moveTopOnNextTick(id: WindowId) {
    nextTick(() => {
      moveTop(id)
    })
  }

  function get(id: WindowId) {
    return model.value.find((windowRecord) => windowRecord.id === id)
  }

  function update(id: WindowId, patch: Partial<WindowOptions>) {
    const target = get(id)
    if (!target) {
      return
    }

    Object.assign(target, patch, { id: target.id })
  }

  function setState(id: WindowId, state: WindowState) {
    const target = get(id)
    if (!target) {
      return
    }

    if (state === 'normal') {
      if (target.state === 'normal') {
        return
      }

      updateWindowState(id, 'normal')
      moveTopOnNextTick(id)
      return
    }

    if (state === 'minimized') {
      if (target.state === 'minimized') {
        return
      }

      updateWindowState(id, 'minimized')
      return
    }

    if (state === 'maximized') {
      if (target.state === 'maximized') {
        return
      }

      updateWindowState(id, 'maximized')
      moveTopOnNextTick(id)
      return
    }

    updateWindowState(id, state)
  }

  function handleOutsideClick(id: WindowRecord['id'], behavior: WindowOutsideClickBehavior) {
    switch (behavior) {
      case 'minimize':
        minimize(id)
        return
      case 'remove':
        close(id)
        return
      default:
        return
    }
  }

  function updateWindowState(id: WindowRecord['id'], state: ManagedWindowState) {
    const target = model.value.find((windowRecord) => windowRecord.id === id)
    if (!target) {
      return
    }

    syncRestoreState(id, state, target.state)
    target.state = state
  }

  function updateWindowGeometry(id: WindowRecord['id'], rect: WindowGeometry) {
    const target = model.value.find((windowRecord) => windowRecord.id === id)
    if (!target) {
      return
    }

    const currentRect = target.rect
    if (
      currentRect
      && currentRect.left === rect.left
      && currentRect.top === rect.top
      && currentRect.width === rect.width
      && currentRect.height === rect.height
    ) {
      return
    }

    target.rect = { ...rect }
  }

  function handleClosed(id: WindowRecord['id']) {
    restoreStates.delete(id)
    windowRefs.delete(id)
    model.value = model.value.filter((windowRecord) => windowRecord.id !== id)
  }

  function syncRestoreState(id: WindowRecord['id'], nextState: WindowState, previousState: WindowState = 'normal') {
    if (nextState === 'minimized') {
      restoreStates.set(id, previousState === 'maximized' ? 'maximized' : 'normal')
      return
    }

    restoreStates.set(id, nextState)
  }

  return {
    model,
    api,
    setWindowRef,
    updateWindowState,
    updateWindowGeometry,
    handleOutsideClick,
    handleClosed,
  }
}
