import { markRaw, nextTick, ref, type Ref } from 'vue'
import type { ComponentPublicInstance } from 'vue'

import type {
  WindowGeometry,
  WindowId,
  WindowOptions,
  WindowOutsideClickBehavior,
  WindowRecord,
  WindowsGroupId,
  WindowsRef,
  WindowState,
} from '../types'

type ManagedWindowState = WindowState
type WindowExpose = ComponentPublicInstance & {
  moveTop: () => void
}
type RestorableWindowState = Exclude<WindowState, 'minimized'>
type WindowPosition = Pick<WindowGeometry, 'left' | 'top'>
type WindowGeometryState = {
  last_position: WindowPosition | null
  windows_record: Map<string, WindowGeometry>
}
type PersistedWindowGeometryState = {
  last_position?: WindowPosition | null
  windows_record?: Record<string, WindowGeometry>
}
type PersistedWindowGeometryStore = {
  version?: number
  last_position?: Record<string, WindowPosition | null | undefined>
  windows_record?: Record<string, Record<string, WindowGeometry> | undefined>
  groups?: Record<string, PersistedWindowGeometryState | undefined>
}

const WINDOW_GEOMETRY_STORAGE_KEY = 'vue3-windows:geometry'
const WINDOW_GEOMETRY_STORE_VERSION = 3
const DEFAULT_GEOMETRY_GROUP_KEY = 'global'
const GEOMETRY_PERSIST_DEBOUNCE_DELAY = 120

export function useWindowsManager(model: Ref<WindowRecord[]> = ref<WindowRecord[]>([]), groupId?: WindowsGroupId) {
  const windowRefs = new Map<WindowId, WindowExpose>()
  const restoreStates = new Map<WindowId, RestorableWindowState>()
  const geometryState = createGeometryState()
  let nextWindowId = 1
  let geometryPersistTimer: ReturnType<typeof window.setTimeout> | null = null

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
    const id = normalizeWindowId(options.id ?? createWindowId())
    const existing = hasExplicitId ? get(id) : undefined
    const component = resolveWindowComponent(id, options.component)

    if (existing) {
      const previousState = existing.state
      const nextPatch: Partial<WindowRecord> = {
        ...options,
        id,
        state: options.state ?? getCreateTargetState(existing),
      }
      if (component) {
        nextPatch.component = markRaw(component)
      }
      if (!options.title) {
        delete nextPatch.title
      }
      Object.assign(existing, nextPatch)
      syncRestoreState(id, existing.state, previousState)
      if (existing.state !== 'minimized') {
        moveTopOnNextTick(id)
      }
      return existing
    }

    const windowRecord: WindowRecord = {
      ...options,
      id,
      title: options.title ?? getDefaultWindowTitle(id, component),
      state: options.state ?? 'normal',
      component: component ? markRaw(component) : component,
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
    flushGeometryState()
    restoreStates.clear()
    windowRefs.clear()
    model.value = []
    cleanupGeometryPersist()
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
    return model.value.find((windowRecord) => windowRecord.id === normalizeWindowId(id))
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

      updateWindowState(id, getNormalStateTarget(target))
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

    if (target.state !== 'normal') {
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
      syncGeometryState(id, rect)
      return
    }

    target.rect = { ...rect }
    syncGeometryState(id, rect)
  }

  function getLastWindowPosition() {
    return geometryState.last_position ? { ...geometryState.last_position } : undefined
  }

  function getCachedWindowGeometry(id: WindowId) {
    const storageId = getStorageWindowId(id)
    const rect = storageId ? geometryState.windows_record.get(storageId) : undefined
    return rect ? { ...rect } : undefined
  }

  function handleClosed(id: WindowRecord['id']) {
    restoreStates.delete(id)
    windowRefs.delete(id)
    model.value = model.value.filter((windowRecord) => windowRecord.id !== id)
  }

  function syncGeometryState(id: WindowRecord['id'], rect: WindowGeometry) {
    geometryState.last_position = {
      left: rect.left,
      top: rect.top,
    }
    const storageId = getStorageWindowId(id)
    if (storageId) {
      geometryState.windows_record.set(storageId, { ...rect })
    }
    persistGeometryState()
  }

  function syncRestoreState(id: WindowRecord['id'], nextState: WindowState, previousState: WindowState = 'normal') {
    if (nextState === 'minimized') {
      restoreStates.set(id, previousState === 'maximized' ? 'maximized' : 'normal')
      return
    }

    restoreStates.set(id, nextState)
  }

  function getCreateTargetState(windowRecord: WindowRecord) {
    if (windowRecord.state === 'minimized') {
      return restoreStates.get(windowRecord.id) ?? 'normal'
    }

    return windowRecord.state
  }

  function getNormalStateTarget(windowRecord: WindowRecord) {
    if (windowRecord.state === 'minimized') {
      return restoreStates.get(windowRecord.id) ?? 'normal'
    }

    return 'normal'
  }

  function normalizeWindowId(id: WindowId): WindowId {
    if (isObjectWindowId(id)) {
      return markRaw(id) as WindowId
    }

    return id
  }

  function getStorageWindowId(id: WindowId) {
    const normalizedId = normalizeWindowId(id)
    if (typeof normalizedId === 'string') {
      return `string:${normalizedId}`
    }

    if (typeof normalizedId === 'number') {
      return `number:${normalizedId}`
    }

    const componentName = getComponentName(normalizedId)
    return componentName ? `component:${componentName}` : null
  }

  function isObjectWindowId(id: WindowId): id is Extract<WindowId, object> {
    return (typeof id === 'object' && id !== null) || typeof id === 'function'
  }

  function resolveWindowComponent(id: WindowId, component: WindowOptions['component']) {
    if (component) {
      return component
    }

    return isObjectWindowId(id) ? id : undefined
  }

  function getDefaultWindowTitle(id: WindowId, component: WindowOptions['component']) {
    if (typeof id === 'string' || typeof id === 'number') {
      return String(id)
    }

    return getComponentName(id) ?? getComponentName(component) ?? 'Window'
  }

  function getComponentName(component: WindowOptions['component']) {
    if (!component || typeof component === 'string') {
      return null
    }

    const namedComponent = component as { name?: string, __name?: string }
    return namedComponent.name ?? namedComponent.__name ?? null
  }

  function createGeometryState(): WindowGeometryState {
    const state: WindowGeometryState = {
      last_position: null,
      windows_record: new Map(),
    }
    const persistedState = readGeometryState()
    if (!persistedState) {
      return state
    }

    if (isWindowPosition(persistedState.last_position)) {
      state.last_position = { ...persistedState.last_position }
    }

    if (persistedState.windows_record && typeof persistedState.windows_record === 'object') {
      for (const [id, rect] of Object.entries(persistedState.windows_record)) {
        if (isWindowGeometry(rect)) {
          state.windows_record.set(id, { ...rect })
        }
      }
    }

    return state
  }

  function readGeometryState(): PersistedWindowGeometryState | null {
    const storage = getGeometryStorage()
    if (!storage) {
      return null
    }

    try {
      const rawValue = storage.getItem(WINDOW_GEOMETRY_STORAGE_KEY)
      if (!rawValue) {
        return readLegacyGroupGeometryState(storage)
      }

      return readGroupGeometryState(parsePersistedGeometryStore(rawValue)) ?? readLegacyGroupGeometryState(storage)
    } catch {
      return null
    }
  }

  function persistGeometryState() {
    const storage = getGeometryStorage()
    if (!storage) {
      return
    }

    registerGeometryPersistCleanup()
    if (geometryPersistTimer) {
      window.clearTimeout(geometryPersistTimer)
    }

    geometryPersistTimer = window.setTimeout(() => {
      geometryPersistTimer = null
      writeGeometryState(storage)
    }, GEOMETRY_PERSIST_DEBOUNCE_DELAY)
  }

  function flushGeometryState() {
    if (!geometryPersistTimer) {
      return
    }

    window.clearTimeout(geometryPersistTimer)
    geometryPersistTimer = null
    const storage = getGeometryStorage()
    if (!storage) {
      return
    }

    writeGeometryState(storage)
  }

  function writeGeometryState(storage: Storage) {
    const windows_record: Record<string, WindowGeometry> = {}
    for (const [id, rect] of geometryState.windows_record) {
      windows_record[id] = { ...rect }
    }

    try {
      const store = readGeometryStore(storage)
      store.last_position ??= {}
      store.windows_record ??= {}
      store.last_position[getGeometryGroupKey()] = geometryState.last_position
      store.windows_record[getGeometryGroupKey()] = windows_record
      storage.setItem(WINDOW_GEOMETRY_STORAGE_KEY, JSON.stringify(store))
    } catch {
      // localStorage can be unavailable or full; the in-memory cache remains usable.
    }
  }

  function cleanupGeometryPersist() {
    if (geometryPersistTimer) {
      window.clearTimeout(geometryPersistTimer)
      geometryPersistTimer = null
    }
    if (typeof window === 'undefined') {
      return
    }
    window.removeEventListener('beforeunload', flushGeometryState)
  }

  function registerGeometryPersistCleanup() {
    if (typeof window === 'undefined') {
      return
    }
    window.removeEventListener('beforeunload', flushGeometryState)
    window.addEventListener('beforeunload', flushGeometryState)
  }

  function getGeometryStorage() {
    if (typeof window === 'undefined') {
      return null
    }

    try {
      return window.localStorage
    } catch {
      return null
    }
  }

  function getGeometryGroupKey() {
    if (groupId === undefined) {
      return DEFAULT_GEOMETRY_GROUP_KEY
    }

    return String(groupId)
  }

  function serializeGeometryGroupId(id: WindowsGroupId) {
    return `${typeof id}:${String(id)}`
  }

  function readGeometryStore(storage: Storage): PersistedWindowGeometryStore {
    const rawValue = storage.getItem(WINDOW_GEOMETRY_STORAGE_KEY)
    const parsed = parsePersistedGeometryStore(rawValue)
    const store: PersistedWindowGeometryStore = {
      version: WINDOW_GEOMETRY_STORE_VERSION,
      last_position: {},
      windows_record: {},
    }

    if (parsed) {
      if (isPersistedWindowGeometryState(parsed)) {
        store.last_position![getGeometryGroupKey()] = parsed.last_position
        store.windows_record![getGeometryGroupKey()] = parsed.windows_record
      }

      if (isPersistedWindowGeometryStore(parsed)) {
        Object.assign(store.last_position!, parsed.last_position)
        Object.assign(store.windows_record!, parsed.windows_record)
      }

      for (const [key, state] of Object.entries(parsed.groups ?? {})) {
        store.last_position![normalizeStoredGroupKey(key)] = state?.last_position
        store.windows_record![normalizeStoredGroupKey(key)] = state?.windows_record
      }
    }

    const legacyGroupState = readLegacyGroupGeometryState(storage)
    if (legacyGroupState && !store.windows_record![getGeometryGroupKey()]) {
      store.last_position![getGeometryGroupKey()] = legacyGroupState.last_position
      store.windows_record![getGeometryGroupKey()] = legacyGroupState.windows_record
    }

    return store
  }

  function readLegacyGroupGeometryState(storage: Storage): PersistedWindowGeometryState | null {
    if (groupId === undefined) {
      return null
    }

    const legacyValue = parsePersistedGeometryStore(
      storage.getItem(`${WINDOW_GEOMETRY_STORAGE_KEY}:${serializeGeometryGroupId(groupId)}`),
    )
    return isPersistedWindowGeometryState(legacyValue) ? legacyValue : null
  }

  function parsePersistedGeometryStore(value: string | null): PersistedWindowGeometryStore | null {
    if (!value) {
      return null
    }

    try {
      const parsed = JSON.parse(value) as unknown
      return parsed && typeof parsed === 'object' ? parsed as PersistedWindowGeometryStore : null
    } catch {
      return null
    }
  }

  function readGroupGeometryState(value: PersistedWindowGeometryStore | null): PersistedWindowGeometryState | null {
    if (!value) {
      return null
    }

    if (isPersistedWindowGeometryStore(value)) {
      const groupKey = getGeometryGroupKey()
      const windowsRecord = value.windows_record?.[groupKey]
      if (windowsRecord) {
        return {
          last_position: value.last_position?.[groupKey],
          windows_record: windowsRecord,
        }
      }
    }

    const legacyGroupState = value.groups?.[serializeGeometryGroupId(groupId ?? DEFAULT_GEOMETRY_GROUP_KEY)]
      ?? value.groups?.[getGeometryGroupKey()]
    if (legacyGroupState) {
      return legacyGroupState
    }

    if (isPersistedWindowGeometryState(value)) {
      return value
    }

    return null
  }

  function isPersistedWindowGeometryStore(value: unknown): value is PersistedWindowGeometryStore {
    if (!value || typeof value !== 'object') {
      return false
    }

    const store = value as PersistedWindowGeometryStore
    return Boolean(store.version || store.groups || isGroupedWindowsRecord(store.windows_record))
  }

  function isGroupedWindowsRecord(value: unknown): value is PersistedWindowGeometryStore['windows_record'] {
    if (!value || typeof value !== 'object') {
      return false
    }

    return Object.values(value).some((record) => record && typeof record === 'object' && !isWindowGeometry(record))
  }

  function normalizeStoredGroupKey(key: string) {
    const match = /^(string|number):(.*)$/.exec(key)
    return match ? match[2] : key
  }

  function isPersistedWindowGeometryState(value: unknown): value is PersistedWindowGeometryState {
    if (!value || typeof value !== 'object') {
      return false
    }

    const state = value as PersistedWindowGeometryState
    const hasLastPosition = state.last_position !== undefined
    const hasWindowsRecord = state.windows_record !== undefined
    if (!hasLastPosition && !hasWindowsRecord) {
      return false
    }

    const validLastPosition =
      state.last_position === undefined
      || state.last_position === null
      || isWindowPosition(state.last_position)
    const validWindowsRecord = state.windows_record === undefined || isFlatWindowsRecord(state.windows_record)
    return validLastPosition && validWindowsRecord
  }

  function isFlatWindowsRecord(value: unknown): value is Record<string, WindowGeometry> {
    if (!value || typeof value !== 'object') {
      return false
    }

    return Object.values(value).every((rect) => isWindowGeometry(rect))
  }

  function isWindowPosition(value: unknown): value is WindowPosition {
    if (!value || typeof value !== 'object') {
      return false
    }

    const position = value as WindowPosition
    return Number.isFinite(position.left) && Number.isFinite(position.top)
  }

  function isWindowGeometry(value: unknown): value is WindowGeometry {
    if (!isWindowPosition(value)) {
      return false
    }

    const rect = value as WindowGeometry
    return Number.isFinite(rect.width) && Number.isFinite(rect.height)
  }

  return {
    model,
    api,
    setWindowRef,
    updateWindowState,
    updateWindowGeometry,
    getLastWindowPosition,
    getCachedWindowGeometry,
    handleOutsideClick,
    handleClosed,
  }
}
