import { computed, markRaw, nextTick, ref, type Ref } from 'vue'
import type { ComponentPublicInstance } from 'vue'

import type { CreateWindowOptions, WindowId, WindowOutsideClickBehavior, WindowsItem, WindowsRef, WindowState } from '../types'

type ManagedWindowState = WindowState
type WindowExpose = ComponentPublicInstance & {
  maximize: () => void
  minimize: () => void
  moveTop: () => void
  restore: () => void
}

export function useWindowsManager(model: Ref<WindowsItem[]> = ref<WindowsItem[]>([])) {
  const minimizedOrder = ref<WindowsItem['id'][]>([])
  const hiddenWindowIds = new Set<WindowId>()
  const windowRefs = new Map<WindowId, WindowExpose>()

  const visibleItems = computed(() => model.value.filter((item) => item.visible))
  const visibleItemMap = computed(() => new Map(visibleItems.value.map((item) => [item.id, item])))
  const minimizedItems = computed(() => {
    return minimizedOrder.value
      .map((id) => visibleItemMap.value.get(id))
      .filter((item): item is WindowsItem => Boolean(item && item.state === 'minimized'))
  })

  const api: WindowsRef = {
    items: model,
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

  function getDockIndex(id: WindowsItem['id']) {
    const item = visibleItemMap.value.get(id)
    if (!item) {
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

  function create(options: CreateWindowOptions) {
    const id = options.id
    const existing = get(id)

    if (existing) {
      const nextPatch: Partial<WindowsItem> = {
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

  const item: WindowsItem = {
    ...options,
    id,
    title: options.title ?? String(id),
    visible: options.visible ?? true,
    state: options.state ?? 'normal',
    component: options.component ? markRaw(options.component) : options.component,
  }

    model.value = [...model.value, item]
    moveTopOnNextTick(id)
    return item
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
    for (const item of model.value) {
      hide(item.id)
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
    for (const item of model.value) {
      show(item.id)
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
    return model.value.find((item) => item.id === id)
  }

  function update(id: WindowId, patch: Partial<WindowsItem>) {
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

  function handleOutsideClick(id: WindowsItem['id'], behavior: WindowOutsideClickBehavior) {
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

  function handleMinimizeStart(id: WindowsItem['id']) {
    if (visibleItemMap.value.has(id)) {
      queueMinimizedWindow(id)
    }
  }

  function updateWindowState(id: WindowsItem['id'], state: ManagedWindowState) {
    const target = model.value.find((item) => item.id === id)
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

  function handleVisibilityChange(id: WindowsItem['id'], visible: boolean) {
    const target = model.value.find((item) => item.id === id)
    if (!target) {
      return
    }

    if (visible) {
      target.visible = true
      return
    }

    handleClosed(id)
  }

  function handleClosed(id: WindowsItem['id']) {
    if (hiddenWindowIds.has(id)) {
      hiddenWindowIds.delete(id)
      return
    }

    removeMinimizedWindow(id)
    windowRefs.delete(id)
    model.value = model.value.filter((item) => item.id !== id)
  }

  function queueMinimizedWindow(id: WindowsItem['id']) {
    minimizedOrder.value = [...minimizedOrder.value.filter((itemId) => itemId !== id), id]
  }

  function removeMinimizedWindow(id: WindowsItem['id']) {
    minimizedOrder.value = minimizedOrder.value.filter((itemId) => itemId !== id)
  }

  return {
    model,
    visibleItems,
    minimizedItems,
    api,
    getDockIndex,
    setWindowRef,
    handleMinimizeStart,
    updateWindowState,
    handleVisibilityChange,
    handleOutsideClick,
    handleClosed,
  }
}
