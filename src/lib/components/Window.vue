<template>
  <span ref="originAnchorRef" class="window-dialog__origin-anchor" aria-hidden="true" />

  <Teleport :to="panelTarget">
    <div class="window-dialog-layer" :style="layerStyle">
      <div
        v-if="modal && state !== 'minimized'"
        class="window-dialog-overlay"
        :class="{ 'is-clickable': outsideClickBehavior !== 'none' || closeOnClickModal }"
        @click="handleOverlayClick"
      />

      <section
        v-show="state !== 'minimized'"
        ref="panelRef"
        class="window-dialog"
        :class="dialogClass"
        :style="panelStyle"
        role="dialog"
        :aria-modal="modal ? 'true' : 'false'"
        :aria-label="dialogLabel"
        tabindex="-1"
        @pointerdown.capture="handlePanelPointerDown"
        @focusin="bringToFront"
      >
        <div class="window-dialog__surface">
          <header
            class="window-dialog__header"
            :class="{ 'is-drag-disabled': !draggable || state === 'maximized' }"
            @mousedown="startDrag"
            @dblclick="handleHeaderDblClick"
          >
            <div class="window-dialog__title-wrap">
              <span class="window-dialog__accent" aria-hidden="true" />
              <span class="window-dialog__title">
                <slot name="title">{{ title }}</slot>
              </span>
            </div>

            <div class="window-dialog__controls">
              <button
                v-if="minimizable"
                type="button"
                class="window-dialog__control"
                title="最小化"
                aria-label="最小化"
                @mousedown.stop
                @click.stop="handleMinimize"
              >
                <svg viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M2 6h8" />
                </svg>
              </button>
              <button
                v-if="maximizable"
                type="button"
                class="window-dialog__control"
                :title="state === 'maximized' ? '还原' : '最大化'"
                :aria-label="state === 'maximized' ? '还原' : '最大化'"
                @mousedown.stop
                @click.stop="toggleMaximize"
              >
                <svg v-if="state === 'maximized'" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M4 2h5.5v5.5H7.2" />
                  <rect x="2" y="4" width="5.8" height="5.8" rx="0.8" />
                </svg>
                <svg v-else viewBox="0 0 12 12" aria-hidden="true">
                  <rect x="2.5" y="2.5" width="7" height="7" rx="1" />
                </svg>
              </button>
              <button
                v-if="closable"
                type="button"
                class="window-dialog__control window-dialog__control--close"
                title="关闭"
                aria-label="关闭"
                @mousedown.stop
                @click.stop="closeWindow"
              >
                <svg viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M3 3l6 6M9 3L3 9" />
                </svg>
              </button>
            </div>
          </header>

          <div class="window-dialog__body">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="window-dialog__footer">
            <slot name="footer" />
          </footer>
        </div>

        <template v-if="resizable && state === 'normal' && !isDragging">
          <div
            v-for="direction in resizeDirections"
            :key="direction"
            class="window-dialog__resize-handle"
            :class="`window-dialog__resize-handle--${direction}`"
            aria-hidden="true"
            @mousedown.stop.prevent="startResize(direction, $event)"
          />
        </template>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

import type { AccentType, WindowGeometry, WindowId, WindowOutsideClickBehavior, WindowState } from '../types'

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
type WindowRect = WindowGeometry
type WindowPosition = Pick<WindowGeometry, 'left' | 'top'>
type WindowSizeLimits = {
  minWidth: number
  minHeight: number
  maxWidth: number
  maxHeight: number
}
type WindowRuntimeState = {
  activeWindowId: symbol | null
  zIndexSeed: number
  documentScrollLockWindowIds: Set<symbol>
  documentElementOverflow: string | null
  bodyOverflow: string | null
}

const RUNTIME_KEY = '__window_dialog_runtime__'
const WINDOW_ACTIVE_EVENT = 'vue3-windows-active-window'
const WINDOW_DEFAULT_WIDTH = 600
const WINDOW_DEFAULT_HEIGHT = 360
const WINDOW_OPEN_OFFSET = 28
const VIEWPORT_MARGIN = 16
const TOP_DRAG_MARGIN = 8
const HEADER_VISIBLE_WIDTH = 120
const HEADER_VISIBLE_HEIGHT = 44
const DRAG_START_THRESHOLD = 4
const MAXIMIZED_RESTORE_RIGHT_ANCHOR_WIDTH = 160
const RESTORE_POINTER_GUTTER = 72
const WINDOW_DEFAULT_Z_INDEX = 100

const resizeDirections: ResizeDirection[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

const ACCENT_PALETTE: Record<AccentType, { start: string, end: string, shadow: string }> = {
  primary: {
    start: '#3b82f6',
    end: '#2563eb',
    shadow: 'rgba(37, 99, 235, 0.16)',
  },
  success: {
    start: '#22c55e',
    end: '#16a34a',
    shadow: 'rgba(34, 197, 94, 0.16)',
  },
  warning: {
    start: '#f59e0b',
    end: '#d97706',
    shadow: 'rgba(245, 158, 11, 0.18)',
  },
  danger: {
    start: '#ef4444',
    end: '#dc2626',
    shadow: 'rgba(239, 68, 68, 0.16)',
  },
  info: {
    start: '#06b6d4',
    end: '#0891b2',
    shadow: 'rgba(6, 182, 212, 0.16)',
  },
}

const props = withDefaults(
  defineProps<{
    title?: string
    state?: WindowState
    outsideClickBehavior?: WindowOutsideClickBehavior
    width?: number
    height?: number
    minWidth?: number
    minHeight?: number
    maxWidth?: number
    maxHeight?: number
    modal?: boolean
    draggable?: boolean
    minimizable?: boolean
    maximizable?: boolean
    closable?: boolean
    resizable?: boolean
    appendToBody?: boolean
    closeOnClickModal?: boolean
    closeOnPressEscape?: boolean
    accentType?: AccentType
    bgColor?: string
    zIndex?: number
    windowId?: WindowId
    initialRect?: WindowGeometry
    lastPosition?: WindowPosition
  }>(),
  {
    title: '',
    state: 'normal',
    outsideClickBehavior: 'none',
    minWidth: 200,
    minHeight: 200,
    maxWidth: Number.POSITIVE_INFINITY,
    modal: false,
    draggable: true,
    minimizable: true,
    maximizable: true,
    closable: true,
    resizable: true,
    appendToBody: true,
    closeOnClickModal: false,
    closeOnPressEscape: true,
    accentType: 'primary',
    bgColor: undefined,
    zIndex: WINDOW_DEFAULT_Z_INDEX,
  },
)

const emit = defineEmits<{
  minimize: []
  maximize: []
  restore: []
  closed: []
  'geometry-change': [rect: WindowGeometry]
  'outside-click': [behavior: WindowOutsideClickBehavior]
}>()

const instanceId = Symbol('window-dialog')
const originAnchorRef = ref<HTMLElement>()
const panelRef = ref<HTMLElement>()
const isDragging = ref(false)
const hasInitialized = ref(false)
const hasManualHeight = ref(false)
const isActiveWindow = ref(false)
const panelTarget = ref<string | HTMLElement>('body')
const zIndex = ref(normalizeZIndexBase(props.zIndex))
const viewportVersion = ref(0)

const windowRect = reactive<WindowRect>({
  left: 0,
  top: 0,
  width: WINDOW_DEFAULT_WIDTH,
  height: WINDOW_DEFAULT_HEIGHT,
})

let cleanupPointerTracking: (() => void) | null = null
let cleanupEscapeTracking: (() => void) | null = null
let panelResizeObserver: ResizeObserver | null = null
let geometryChangePending = false

const state = computed(() => props.state)
const isAutoHeightWindow = computed(() => props.height === undefined && !hasManualHeight.value)
const dialogLabel = computed(() => props.title || 'Dialog')
const dialogClass = computed(() => [
  `window-dialog--${state.value}`,
  {
    'window-dialog--dragging': isDragging.value,
    'window-dialog--active': isActiveWindow.value,
    'window-dialog--auto-height': isAutoHeightWindow.value,
  },
])
const layerStyle = computed(() => ({
  zIndex: String(zIndex.value),
}))
const accentVars = computed(() => {
  const accent = ACCENT_PALETTE[props.accentType]
  const vars: Record<string, string> = {
    '--window-dialog-accent-start': accent.start,
    '--window-dialog-accent-end': accent.end,
    '--window-dialog-accent-shadow': accent.shadow,
  }

  if (props.bgColor) {
    vars['--window-dialog-bg-color'] = props.bgColor
  }

  return vars
})
const panelStyle = computed(() => {
  viewportVersion.value

  if (state.value === 'maximized') {
    const maximizedRect = getMaximizedRect()

    return {
      ...accentVars.value,
      left: `${maximizedRect.left}px`,
      top: `${maximizedRect.top}px`,
      width: `${maximizedRect.width}px`,
      height: `${maximizedRect.height}px`,
      zIndex: String(zIndex.value + 1),
    }
  }

  const limits = getSizeLimits(getViewport())
  const maxHeight = Math.max(limits.maxHeight, windowRect.height)
  const style: Record<string, string> = {
    ...accentVars.value,
    left: `${windowRect.left}px`,
    top: `${windowRect.top}px`,
    width: `${windowRect.width}px`,
    maxHeight: `${maxHeight}px`,
    zIndex: String(zIndex.value + 1),
  }

  if (limits.minHeight > 0) {
    style.minHeight = `${limits.minHeight}px`
  }

  if (!isAutoHeightWindow.value) {
    style.height = `${windowRect.height}px`
  }

  return style
})

watch(
  () => props.appendToBody,
  () => {
    resolvePanelTarget()
  },
)

watch(
  () => props.zIndex,
  (nextZIndex) => {
    const nextBaseZIndex = normalizeZIndexBase(nextZIndex)
    if (zIndex.value < nextBaseZIndex) {
      zIndex.value = nextWindowZIndex(nextBaseZIndex)
    }
  },
)

watch(
  () => [state.value, props.closeOnPressEscape] as const,
  ([nextState, closable]) => {
    if (nextState !== 'minimized' && closable) {
      enableEscapeClose()
      return
    }
    disableEscapeClose()
  },
  { immediate: true },
)

watch(
  () => state.value,
  (nextState) => {
    if (!(isDragging.value && nextState === 'normal')) {
      stopPointerTracking()
    }
    syncDocumentScrollLock()
    focusPanelOnNextTick()
    scheduleGeometryChange()
  },
)

watch(
  () => [props.width, props.height, props.minWidth, props.minHeight, props.maxWidth, props.maxHeight] as const,
  () => {
    if (!hasInitialized.value) {
      applyRect(createInitialRect())
      return
    }

    if (state.value === 'normal') {
      applyRect(windowRect)
    }
  },
)

watch(
  panelRef,
  (panel, previousPanel) => {
    if (!panelResizeObserver) {
      return
    }

    if (previousPanel) {
      panelResizeObserver.unobserve(previousPanel)
    }

    if (panel) {
      panelResizeObserver.observe(panel)
      scheduleGeometryChange()
    }
  },
  { flush: 'post' },
)

onMounted(() => {
  resolvePanelTarget()
  initializeWindow()
  startGeometryObserver()
  window.addEventListener(WINDOW_ACTIVE_EVENT, handleActiveWindowChange)
  document.addEventListener('pointerdown', handleDocumentPointerDown, true)
  window.addEventListener('resize', handleViewportResize)
  syncDocumentScrollLock()
  if (state.value !== 'minimized') {
    bringToFront()
    focusPanelOnNextTick()
  }
  scheduleGeometryChange()
})

onBeforeUnmount(() => {
  stopPointerTracking()
  disableEscapeClose()
  stopGeometryObserver()
  releaseDocumentScrollLock()
  window.removeEventListener(WINDOW_ACTIVE_EVENT, handleActiveWindowChange)
  window.removeEventListener('resize', handleViewportResize)
  document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
})

function initializeWindow() {
  if (hasInitialized.value) {
    return
  }

  // 有缓存 rect 且本次没有显式 height 时，也要按缓存高度恢复，不能继续走 auto-height。
  if (props.initialRect && props.height === undefined) {
    hasManualHeight.value = true
  }

  applyRect(createInitialRect())
  hasInitialized.value = true
}

function createInitialRect() {
  if (props.initialRect) {
    return clampRect(props.initialRect, getPreservedSizeLimits(props.initialRect))
  }

  const viewport = getViewport()
  const limits = getSizeLimits(viewport)
  const width = clampValue(props.width ?? WINDOW_DEFAULT_WIDTH, limits.minWidth, limits.maxWidth)
  const height = clampValue(props.height ?? WINDOW_DEFAULT_HEIGHT, limits.minHeight, limits.maxHeight)
  const candidate = props.lastPosition
    ? {
        left: props.lastPosition.left + WINDOW_OPEN_OFFSET,
        top: props.lastPosition.top + WINDOW_OPEN_OFFSET,
        width,
        height,
      }
    : {
        left: Math.round((viewport.width - width) / 2),
        top: Math.round((viewport.height - height) / 2),
        width,
        height,
      }

  return clampRect(candidate, limits)
}

function bringToFront() {
  const runtimeState = getWindowRuntimeState()
  if (runtimeState.activeWindowId !== instanceId) {
    zIndex.value = nextWindowZIndex(props.zIndex)
  }
  syncActiveWindowRuntime()
}

function syncActiveWindowRuntime() {
  const runtimeState = getWindowRuntimeState()
  runtimeState.activeWindowId = instanceId

  isActiveWindow.value = true
  window.dispatchEvent(new CustomEvent(WINDOW_ACTIVE_EVENT, {
    detail: {
      id: instanceId,
    },
  }))
}

function handleActiveWindowChange(event: Event) {
  const activeEvent = event as CustomEvent<{ id?: symbol }>
  isActiveWindow.value = activeEvent.detail?.id === instanceId
}

function handlePanelPointerDown(event: PointerEvent) {
  bringToFront()
  if (shouldKeepTargetFocus(event)) {
    return
  }

  focusPanel()
}

function focusPanel() {
  panelRef.value?.focus({ preventScroll: true })
}

function focusPanelOnNextTick() {
  nextTick(() => {
    if (state.value !== 'minimized') {
      focusPanel()
    }
  })
}

function shouldKeepTargetFocus(event: Event) {
  const targetElement = getEventTargetElement(event)
  if (!targetElement || targetElement === panelRef.value) {
    return false
  }

  return Boolean(targetElement.closest(
    'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"]), [contenteditable=""], [contenteditable="true"]',
  ))
}

function closeWindow() {
  emit('closed')
}

function handleMinimize() {
  stopPointerTracking()
  emit('minimize')
}

function toggleMaximize() {
  stopPointerTracking()
  if (state.value === 'maximized') {
    emit('restore')
    return
  }

  emit('maximize')
}

function startDrag(event: MouseEvent) {
  if (!props.draggable || event.button !== 0) {
    return
  }

  bringToFront()

  if (state.value === 'maximized') {
    startMaximizedDrag(event)
    return
  }

  const startRect = getCurrentWindowRect()
  applyRect(startRect)
  const startX = event.clientX
  const startY = event.clientY

  beginPointerTracking(null, (moveEvent) => {
    applyRect({
      ...startRect,
      left: startRect.left + moveEvent.clientX - startX,
      top: startRect.top + moveEvent.clientY - startY,
    })
  })
}

function startMaximizedDrag(event: MouseEvent) {
  if (!props.maximizable) {
    return
  }

  let hasRestored = false
  let restoredRect: WindowRect | null = null
  let dragOffsetX = 0
  let dragOffsetY = 0
  const startX = event.clientX
  const startY = event.clientY

  beginPointerTracking(null, (moveEvent) => {
    if (!hasRestored) {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY
      if (Math.hypot(deltaX, deltaY) < DRAG_START_THRESHOLD) {
        return
      }

      restoredRect = getMaximizedDragRestoreRect(event)
      dragOffsetX = startX - restoredRect.left
      dragOffsetY = startY - restoredRect.top
      hasRestored = true
      emit('restore')
    }

    applyRect({
      ...restoredRect!,
      left: moveEvent.clientX - dragOffsetX,
      top: moveEvent.clientY - dragOffsetY,
    })
  })
}

function getMaximizedDragRestoreRect(event: MouseEvent) {
  const viewport = getViewport()
  const restoredWidth = clampValue(props.width ?? WINDOW_DEFAULT_WIDTH, props.minWidth, Math.min(props.maxWidth, viewport.width - VIEWPORT_MARGIN * 2))
  const restoredHeight = clampValue(props.height ?? WINDOW_DEFAULT_HEIGHT, props.minHeight, Math.min(props.maxHeight ?? Number.POSITIVE_INFINITY, viewport.height - TOP_DRAG_MARGIN - HEADER_VISIBLE_HEIGHT))
  const offsetX = getMaximizedRestorePointerOffsetX(event.clientX, viewport.width, restoredWidth)

  return clampRect({
    left: Math.round(event.clientX - offsetX),
    top: TOP_DRAG_MARGIN,
    width: restoredWidth,
    height: restoredHeight,
  })
}

function handleHeaderDblClick() {
  if (props.maximizable) {
    toggleMaximize()
  }
}

function startResize(direction: ResizeDirection, event: MouseEvent) {
  if (state.value !== 'normal') {
    return
  }

  bringToFront()
  const startRect = getCurrentWindowRect()
  const resizeLimits = getResizeSizeLimits(startRect, direction)
  applyRect(startRect, { limits: resizeLimits })

  if (direction.includes('n') || direction.includes('s')) {
    hasManualHeight.value = true
  }

  const startX = event.clientX
  const startY = event.clientY

  beginPointerTracking(getResizeCursor(direction), (moveEvent) => {
    applyRect(
      getResizedRect(
        startRect,
        direction,
        moveEvent.clientX - startX,
        moveEvent.clientY - startY,
        resizeLimits,
      ),
      { limits: resizeLimits },
    )
  })
}

function handleOverlayClick() {
  handleOutsideClick()
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (props.modal || state.value === 'minimized' || !isActiveWindow.value) {
    return
  }

  const targetElement = getEventTargetElement(event)
  if (targetElement?.closest('.window-dialog, .window-dialog__resize-handle')) {
    return
  }

  handleOutsideClick()
}

function handleOutsideClick() {
  const behavior = getOutsideClickBehavior()
  if (behavior === 'none') {
    return
  }

  emit('outside-click', behavior)
}

function getOutsideClickBehavior(): WindowOutsideClickBehavior {
  if (props.outsideClickBehavior !== 'none') {
    return props.outsideClickBehavior
  }

  return props.closeOnClickModal ? 'remove' : 'none'
}

function getEventTargetElement(event: Event) {
  const target = event.target
  if (target instanceof Element) {
    return target
  }

  if (target instanceof Node) {
    return target.parentElement
  }

  return null
}

function beginPointerTracking(cursor: string | null, onMove: (event: MouseEvent) => void) {
  stopPointerTracking()

  isDragging.value = true
  document.body.classList.add('window-dialog--interacting')
  if (cursor) {
    document.body.style.cursor = cursor
  }

  const handleMove = (moveEvent: MouseEvent) => {
    onMove(moveEvent)
  }

  const handleUp = () => {
    stopPointerTracking()
  }

  document.addEventListener('mousemove', handleMove)
  document.addEventListener('mouseup', handleUp)

  cleanupPointerTracking = () => {
    isDragging.value = false
    document.body.classList.remove('window-dialog--interacting')
    if (cursor) {
      document.body.style.cursor = ''
    }
    document.removeEventListener('mousemove', handleMove)
    document.removeEventListener('mouseup', handleUp)
    cleanupPointerTracking = null
  }
}

function stopPointerTracking() {
  cleanupPointerTracking?.()
}

function enableEscapeClose() {
  if (cleanupEscapeTracking) {
    return
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && props.closeOnPressEscape && state.value !== 'minimized') {
      closeWindow()
    }
  }

  document.addEventListener('keydown', handleKeydown)
  cleanupEscapeTracking = () => {
    document.removeEventListener('keydown', handleKeydown)
    cleanupEscapeTracking = null
  }
}

function disableEscapeClose() {
  cleanupEscapeTracking?.()
}

function syncDocumentScrollLock() {
  if (state.value === 'maximized') {
    const runtimeState = getWindowRuntimeState()
    if (runtimeState.documentScrollLockWindowIds.size === 0) {
      runtimeState.documentElementOverflow = document.documentElement.style.overflow
      runtimeState.bodyOverflow = document.body.style.overflow
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
    }
    runtimeState.documentScrollLockWindowIds.add(instanceId)
    return
  }

  releaseDocumentScrollLock()
}

function releaseDocumentScrollLock() {
  const runtimeState = getWindowRuntimeState()
  if (!runtimeState.documentScrollLockWindowIds.delete(instanceId)) {
    return
  }

  if (runtimeState.documentScrollLockWindowIds.size > 0) {
    return
  }

  document.documentElement.style.overflow = runtimeState.documentElementOverflow ?? ''
  document.body.style.overflow = runtimeState.bodyOverflow ?? ''
  runtimeState.documentElementOverflow = null
  runtimeState.bodyOverflow = null
}

function resolvePanelTarget() {
  if (!props.appendToBody && originAnchorRef.value?.parentElement) {
    panelTarget.value = originAnchorRef.value.parentElement
    return
  }

  panelTarget.value = 'body'
}

function handleViewportResize() {
  viewportVersion.value += 1
  resolvePanelTarget()

  if (state.value === 'normal') {
    applyRect(windowRect)
  }

  scheduleGeometryChange()
}

function getMaximizedRect(): WindowRect {
  const viewport = getViewport()
  return {
    left: 0,
    top: 0,
    width: viewport.width,
    height: viewport.height,
  }
}

function getMaximizedRestorePointerOffsetX(startX: number, viewportWidth: number, restoreWidth: number) {
  if (viewportWidth <= 0) {
    return restoreWidth / 2
  }

  const distanceFromRight = viewportWidth - startX
  const isNearWindowControls = distanceFromRight >= 0 && distanceFromRight <= MAXIMIZED_RESTORE_RIGHT_ANCHOR_WIDTH
  const rawOffset = isNearWindowControls
    ? restoreWidth - distanceFromRight
    : (startX / viewportWidth) * restoreWidth

  return clampValue(rawOffset, RESTORE_POINTER_GUTTER, restoreWidth - RESTORE_POINTER_GUTTER)
}

function getResizeCursor(direction: ResizeDirection) {
  switch (direction) {
    case 'n':
    case 's':
      return 'ns-resize'
    case 'e':
    case 'w':
      return 'ew-resize'
    case 'ne':
    case 'sw':
      return 'nesw-resize'
    case 'nw':
    case 'se':
      return 'nwse-resize'
  }
}

function getCurrentWindowRect() {
  const rect = panelRef.value?.getBoundingClientRect()
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    return { ...windowRect }
  }

  return {
    left: Math.round(rect.left),
    top: Math.round(rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  }
}

function getRenderedWindowRect(): WindowRect {
  if (state.value === 'maximized') {
    return getMaximizedRect()
  }

  return getCurrentWindowRect()
}

function startGeometryObserver() {
  if (typeof ResizeObserver === 'undefined') {
    return
  }

  panelResizeObserver = new ResizeObserver(() => {
    scheduleGeometryChange()
  })

  if (panelRef.value) {
    panelResizeObserver.observe(panelRef.value)
    scheduleGeometryChange()
  }
}

function stopGeometryObserver() {
  panelResizeObserver?.disconnect()
  panelResizeObserver = null
  geometryChangePending = false
}

function scheduleGeometryChange() {
  if (geometryChangePending) {
    return
  }

  geometryChangePending = true
  nextTick(() => {
    geometryChangePending = false
    emitGeometryChange()
  })
}

function emitGeometryChange() {
  if (!hasInitialized.value || state.value === 'minimized') {
    return
  }

  emit('geometry-change', getRenderedWindowRect())
}

function getResizedRect(
  startRect: WindowRect,
  direction: ResizeDirection,
  deltaX: number,
  deltaY: number,
  limits: WindowSizeLimits = getSizeLimits(getViewport()),
): WindowRect {
  const viewport = getViewport()
  const includesWest = direction.includes('w')
  const includesEast = direction.includes('e')
  const includesNorth = direction.includes('n')
  const includesSouth = direction.includes('s')

  let left = startRect.left
  let top = startRect.top
  let width = startRect.width
  let height = startRect.height

  if (includesEast) {
    width = clampValue(startRect.width + deltaX, limits.minWidth, limits.maxWidth)
  }

  if (includesSouth) {
    height = clampValue(startRect.height + deltaY, limits.minHeight, limits.maxHeight)
  }

  if (includesWest) {
    const rawWidth = clampValue(startRect.width - deltaX, limits.minWidth, limits.maxWidth)
    left = startRect.left + startRect.width - rawWidth
    width = rawWidth
  }

  if (includesNorth) {
    const rawHeight = clampValue(startRect.height - deltaY, limits.minHeight, limits.maxHeight)
    top = startRect.top + startRect.height - rawHeight
    height = rawHeight
  }

  const horizontalBounds = getHorizontalBounds(width, viewport.width)
  const verticalBounds = getVerticalBounds(viewport.height)

  if (includesWest && left < horizontalBounds.min) {
    left = horizontalBounds.min
    width = clampValue(startRect.left + startRect.width - left, limits.minWidth, limits.maxWidth)
  } else if (!includesEast) {
    left = clampValue(left, horizontalBounds.min, horizontalBounds.max)
  }

  if (includesNorth && top < verticalBounds.min) {
    top = verticalBounds.min
    height = clampValue(startRect.top + startRect.height - top, limits.minHeight, limits.maxHeight)
  } else if (!includesSouth) {
    top = clampValue(top, verticalBounds.min, verticalBounds.max)
  }

  return {
    left,
    top,
    width,
    height,
  }
}

function getResizeSizeLimits(startRect: WindowRect, direction: ResizeDirection): WindowSizeLimits {
  const viewport = getViewport()
  const limits = getSizeLimits(viewport)
  const includesWest = direction.includes('w')
  const includesNorth = direction.includes('n')
  let maxWidth = limits.maxWidth
  let maxHeight = limits.maxHeight

  if (includesWest && !direction.includes('e')) {
    const horizontalBounds = getHorizontalBounds(startRect.width, viewport.width)
    maxWidth = Math.min(props.maxWidth ?? Number.POSITIVE_INFINITY, startRect.left + startRect.width - horizontalBounds.min)
  }

  if (includesNorth && !direction.includes('s')) {
    const verticalBounds = getVerticalBounds(viewport.height)
    maxHeight = Math.min(props.maxHeight ?? Number.POSITIVE_INFINITY, startRect.top + startRect.height - verticalBounds.min)
  }

  return {
    ...limits,
    maxWidth,
    maxHeight,
    minWidth: clampValue(props.minWidth, 0, maxWidth),
    minHeight: clampValue(props.minHeight, 0, maxHeight),
  }
}

function getPreservedSizeLimits(rect: WindowRect): WindowSizeLimits {
  const limits = getSizeLimits(getViewport())
  const maxWidth = Math.max(limits.maxWidth, rect.width)
  const maxHeight = Math.max(limits.maxHeight, rect.height)

  return {
    ...limits,
    maxWidth,
    maxHeight,
    minWidth: clampValue(props.minWidth, 0, maxWidth),
    minHeight: clampValue(props.minHeight, 0, maxHeight),
  }
}

function applyRect(nextRect: WindowRect, options: { limits?: WindowSizeLimits } = {}) {
  const clampedRect = clampRect(nextRect, options.limits)
  windowRect.left = clampedRect.left
  windowRect.top = clampedRect.top
  windowRect.width = clampedRect.width
  windowRect.height = clampedRect.height

  scheduleGeometryChange()
}

function clampRect(nextRect: WindowRect, limits: WindowSizeLimits = getSizeLimits(getViewport())): WindowRect {
  const viewport = getViewport()
  const width = clampValue(nextRect.width, limits.minWidth, limits.maxWidth)
  const height = clampValue(nextRect.height, limits.minHeight, limits.maxHeight)
  const horizontalBounds = getHorizontalBounds(width, viewport.width)
  const verticalBounds = getVerticalBounds(viewport.height)

  return {
    width,
    height,
    left: clampValue(nextRect.left, horizontalBounds.min, horizontalBounds.max),
    top: clampValue(nextRect.top, verticalBounds.min, verticalBounds.max),
  }
}

function getSizeLimits(viewport: { width: number, height: number }): WindowSizeLimits {
  const maxWidth = Math.max(props.minWidth, Math.min(props.maxWidth ?? Number.POSITIVE_INFINITY, viewport.width - VIEWPORT_MARGIN * 2))
  const maxHeight = Math.max(props.minHeight, Math.min(props.maxHeight ?? Number.POSITIVE_INFINITY, viewport.height - TOP_DRAG_MARGIN - HEADER_VISIBLE_HEIGHT))

  return {
    minWidth: Math.min(props.minWidth, maxWidth),
    minHeight: Math.min(props.minHeight, maxHeight),
    maxWidth,
    maxHeight,
  }
}

function getHorizontalBounds(width: number, viewportWidth: number) {
  return {
    min: HEADER_VISIBLE_WIDTH - width,
    max: viewportWidth - HEADER_VISIBLE_WIDTH,
  }
}

function getVerticalBounds(viewportHeight: number) {
  return {
    min: TOP_DRAG_MARGIN,
    max: Math.max(TOP_DRAG_MARGIN, viewportHeight - HEADER_VISIBLE_HEIGHT),
  }
}

function getViewport() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  }
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function nextWindowZIndex(baseZIndex = WINDOW_DEFAULT_Z_INDEX) {
  const runtimeState = getWindowRuntimeState()
  runtimeState.zIndexSeed = Math.max(runtimeState.zIndexSeed, normalizeZIndexBase(baseZIndex) - 1)
  runtimeState.zIndexSeed += 1
  return runtimeState.zIndexSeed
}

function normalizeZIndexBase(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return WINDOW_DEFAULT_Z_INDEX
  }

  return Math.trunc(value)
}

function getWindowRuntimeState(): WindowRuntimeState {
  const runtimeHost = globalThis as typeof globalThis & {
    [RUNTIME_KEY]?: WindowRuntimeState
  }

  runtimeHost[RUNTIME_KEY] ??= {
    activeWindowId: null,
    zIndexSeed: Number.NEGATIVE_INFINITY,
    documentScrollLockWindowIds: new Set<symbol>(),
    documentElementOverflow: null,
    bodyOverflow: null,
  }

  return runtimeHost[RUNTIME_KEY]
}

defineExpose({
  moveTop: bringToFront,
})
</script>

<style scoped>
:global(.window-dialog--interacting) {
  user-select: none;
}

:global(.window-dialog-layer) {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

:global(.window-dialog-overlay) {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.18);
  backdrop-filter: blur(4px);
  pointer-events: auto;
}

:global(.window-dialog-overlay.is-clickable) {
  cursor: default;
}

:global(.window-dialog) {
  position: fixed;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  overflow: visible;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: var(--window-dialog-radius, 14px);
  background: var(--window-dialog-surface);
  color: var(--window-dialog-text-color);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.07), 0 2px 6px rgba(15, 23, 42, 0.04);
  pointer-events: auto;
  --window-dialog-surface: var(--window-dialog-bg-color, var(--bgColor, Canvas));
  --window-dialog-text-color: CanvasText;
  --window-dialog-muted-color: color-mix(in srgb, var(--window-dialog-text-color) 62%, transparent);
  --window-dialog-header-bg-start: color-mix(
    in srgb,
    var(--window-dialog-surface) 96%,
    var(--window-dialog-text-color) 4%
  );
  --window-dialog-header-bg-end: color-mix(
    in srgb,
    var(--window-dialog-surface) 90%,
    var(--window-dialog-text-color) 10%
  );
  --window-dialog-subtle-bg: color-mix(
    in srgb,
    var(--window-dialog-surface) 92%,
    var(--window-dialog-text-color) 8%
  );
  --window-dialog-hover-bg: color-mix(in srgb, var(--window-dialog-text-color) 10%, transparent);
  --window-dialog-hover-color: color-mix(in srgb, var(--window-dialog-text-color) 84%, transparent);
}

:global(.window-dialog__surface) {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: inherit;
  max-height: inherit;
  overflow: hidden;
  border-radius: inherit;
  background: var(--window-dialog-surface);
  color: var(--window-dialog-text-color);
}

:global(.window-dialog--auto-height:not(.window-dialog--maximized) .window-dialog__surface) {
  height: auto;
}

:global(.window-dialog--maximized) {
  border: none;
  border-radius: 0;
}

:global(.window-dialog--active) {
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.14), 0 8px 16px rgba(15, 23, 42, 0.08);
}

:global(.window-dialog__header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 40px;
  padding: 0 0 0 16px;
  background: linear-gradient(
    180deg,
    var(--window-dialog-header-bg-start) 0%,
    var(--window-dialog-header-bg-end) 100%
  );
  cursor: default;
}

:global(.window-dialog__header.is-drag-disabled) {
  cursor: default;
}

:global(.window-dialog__title-wrap) {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

:global(.window-dialog__accent) {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(
    135deg,
    var(--window-dialog-accent-start) 0%,
    var(--window-dialog-accent-end) 100%
  );
  box-shadow: 0 0 0 4px var(--window-dialog-accent-shadow);
  flex-shrink: 0;
}

:global(.window-dialog__title) {
  margin: 0;
  overflow: hidden;
  color: var(--window-dialog-text-color);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.window-dialog__controls) {
  display: flex;
  align-items: stretch;
  align-self: stretch;
  gap: 0;
  flex-shrink: 0;
}

:global(.window-dialog__control) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 100%;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--window-dialog-muted-color);
  cursor: default;
}

:global(.window-dialog__control svg) {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.5;
}

:global(.window-dialog__control:hover) {
  background: var(--window-dialog-hover-bg);
  color: var(--window-dialog-hover-color);
}

:global(.window-dialog__control--close:hover) {
  background: #ef4444;
  color: #ffffff;
}

:global(.window-dialog__body) {
  flex: 1 1 auto;
  min-height: 0;
  padding: 20px 24px;
  overflow: auto;
  background: var(--window-dialog-surface);
  color: var(--window-dialog-text-color);
}

:global(.window-dialog__footer) {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 14px 20px;
  background: var(--window-dialog-subtle-bg);
}

:global(.window-dialog__resize-handle) {
  position: absolute;
  z-index: 3;
  width: 10px;
  height: 10px;
  pointer-events: auto;
}

:global(.window-dialog__resize-handle--n),
:global(.window-dialog__resize-handle--s) {
  right: 10px;
  left: 10px;
  width: auto;
  height: 10px;
  cursor: ns-resize;
}

:global(.window-dialog__resize-handle--n) {
  top: -10px;
}

:global(.window-dialog__resize-handle--s) {
  bottom: -10px;
}

:global(.window-dialog__resize-handle--e),
:global(.window-dialog__resize-handle--w) {
  top: 10px;
  bottom: 10px;
  width: 10px;
  height: auto;
  cursor: ew-resize;
}

:global(.window-dialog__resize-handle--e) {
  right: -10px;
}

:global(.window-dialog__resize-handle--w) {
  left: -10px;
}

:global(.window-dialog__resize-handle--ne),
:global(.window-dialog__resize-handle--sw) {
  width: 18px;
  height: 18px;
  cursor: nesw-resize;
}

:global(.window-dialog__resize-handle--nw),
:global(.window-dialog__resize-handle--se) {
  width: 18px;
  height: 18px;
  cursor: nwse-resize;
}

:global(.window-dialog__resize-handle--ne) {
  top: -12px;
  right: -12px;
}

:global(.window-dialog__resize-handle--nw) {
  top: -12px;
  left: -12px;
}

:global(.window-dialog__resize-handle--se) {
  right: -12px;
  bottom: -12px;
}

:global(.window-dialog__resize-handle--sw) {
  bottom: -12px;
  left: -12px;
}
</style>
