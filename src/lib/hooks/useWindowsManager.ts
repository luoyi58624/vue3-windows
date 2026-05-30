import { computed, markRaw, nextTick, ref, type Ref } from 'vue'
import type { ComponentPublicInstance } from 'vue'

import type { WindowGeometry, WindowId, WindowOptions, WindowOutsideClickBehavior, WindowRecord, WindowsRef, WindowState } from '../types'

type ManagedWindowState = WindowState
type WindowExpose = ComponentPublicInstance & {
  maximize: () => void
  minimize: () => void
  moveTop: () => void
  restore: () => void
}

export function useWindowsManager(model: Ref<WindowRecord[]> = ref<WindowRecord[]>([])) {
  const minimizedOrder = ref<WindowRecord['id'][]>([])
  const hiddenWindowIds = new Set<WindowId>()
  const windowRefs = new Map<WindowId, WindowExpose>()
  let nextWindowId = 1

  const visibleWindows = computed(() => model.value.filter((windowRecord) => windowRecord.visible))
  const visibleWindowMap = computed(() => new Map(visibleWindows.value.map((windowRecord) => [windowRecord.id, windowRecord])))
  const minimizedWindows = computed(() => {
    return minimizedOrder.value
      .map((id) => visibleWindowMap.value.get(id))
      .filter((windowRecord): windowRecord is WindowRecord => Boolean(windowRecord && windowRecord.state === 'minimized'))
  })

  const api: WindowsRef = {
    windows: model,
    create,
    close,
    closeAll,
    hide,
    hideAll,
    show,
    showAll,
    minimize,
    moveTop,
    get,
    update,
    setState,
  }

  function getDockIndex(id: WindowRecord['id']) {
    const windowRecord = visibleWindowMap.value.get(id)
    if (!windowRecord) {
      return 0
    }

    const existingIndex = minimizedOrder.value.indexOf(id)
    return existingIndex === -1 ? minimizedOrder.value.length : existingIndex
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
        visible: options.visible ?? true,
        state: options.state ?? 'normal',
      }
      if (options.component) {
        nextPatch.component = markRaw(options.component)
      }
      if (!options.title) {
        delete nextPatch.title
      }
      Object.assign(existing, nextPatch)
      hiddenWindowIds.delete(id)
      moveTopOnNextTick(id)
      return existing
    }

    const windowRecord: WindowRecord = {
      ...options,
      id,
      title: options.title ?? String(id),
      visible: options.visible ?? true,
      state: options.state ?? 'normal',
      component: options.component ? markRaw(options.component) : options.component,
    }

    model.value = [...model.value, windowRecord]
    moveTopOnNextTick(id)
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
    hiddenWindowIds.clear()
    minimizedOrder.value = []
    windowRefs.clear()
    model.value = []
  }

  function hide(id: WindowId) {
    const target = get(id)
    if (!target) {
      return
    }

    if (!target.visible) {
      return
    }

    hiddenWindowIds.add(id)
    target.visible = false
    if (target.state === 'minimized') {
      target.state = 'normal'
    }
    removeMinimizedWindow(id)
  }

  function hideAll() {
    for (const windowRecord of model.value) {
      hide(windowRecord.id)
    }
  }

  function show(id: WindowId) {
    const target = get(id)
    if (!target) {
      return
    }

    if (target.visible && !hiddenWindowIds.has(id)) {
      return
    }

    hiddenWindowIds.delete(id)
    target.visible = true
    moveTopOnNextTick(id)
  }

  function showAll() {
    for (const windowRecord of model.value) {
      show(windowRecord.id)
    }
  }

  function minimize(id: WindowId) {
    const target = get(id)
    if (!target) {
      return
    }

    if (!target.visible || target.state === 'minimized') {
      return
    }

    const windowRef = windowRefs.get(id)
    if (windowRef) {
      windowRef.minimize()
      return
    }

    nextTick(() => {
      windowRefs.get(id)?.minimize()
    })
  }

  function moveTop(id: WindowId) {
    const target = get(id)
    if (!target) {
      return
    }

    if (!target.visible) {
      show(id)
      return
    }

    if (target.state === 'minimized') {
      const windowRef = windowRefs.get(id)
      windowRef?.moveTop()
      nextTick(() => {
        windowRef?.restore()
      })
      removeMinimizedWindow(id)
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
      if (!target.visible) {
        show(id)
        return
      }

      if (target.state === 'normal') {
        return
      }

      windowRefs.get(id)?.restore()
      return
    }

    if (!target.visible) {
      return
    }

    if (state === 'minimized') {
      if (target.state === 'minimized') {
        return
      }

      windowRefs.get(id)?.minimize()
      return
    }

    if (state === 'maximized') {
      if (target.state === 'maximized') {
        return
      }

      windowRefs.get(id)?.maximize()
      return
    }

    updateWindowState(id, state)
  }

  function handleOutsideClick(id: WindowRecord['id'], behavior: WindowOutsideClickBehavior) {
    switch (behavior) {
      case 'hide':
        hide(id)
        return
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

  function handleMinimizeStart(id: WindowRecord['id']) {
    if (visibleWindowMap.value.has(id)) {
      queueMinimizedWindow(id)
    }
  }

  function updateWindowState(id: WindowRecord['id'], state: ManagedWindowState) {
    const target = model.value.find((windowRecord) => windowRecord.id === id)
    if (!target) {
      return
    }

    target.state = state

    if (state === 'minimized' && target.visible) {
      queueMinimizedWindow(id)
      return
    }

    removeMinimizedWindow(id)
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

  function handleVisibilityChange(id: WindowRecord['id'], visible: boolean) {
    const target = model.value.find((windowRecord) => windowRecord.id === id)
    if (!target) {
      return
    }

    if (visible) {
      target.visible = true
      return
    }

    handleClosed(id)
  }

  function handleClosed(id: WindowRecord['id']) {
    if (hiddenWindowIds.has(id)) {
      hiddenWindowIds.delete(id)
      return
    }

    removeMinimizedWindow(id)
    windowRefs.delete(id)
    model.value = model.value.filter((windowRecord) => windowRecord.id !== id)
  }

  function queueMinimizedWindow(id: WindowRecord['id']) {
    minimizedOrder.value = [...minimizedOrder.value.filter((windowId) => windowId !== id), id]
  }

  function removeMinimizedWindow(id: WindowRecord['id']) {
    minimizedOrder.value = minimizedOrder.value.filter((windowId) => windowId !== id)
  }

  return {
    model,
    visibleWindows,
    minimizedWindows,
    api,
    getDockIndex,
    setWindowRef,
    handleMinimizeStart,
    updateWindowState,
    updateWindowGeometry,
    handleVisibilityChange,
    handleOutsideClick,
    handleClosed,
  }
}
