<template>
  <span ref="originAnchorRef" class="window-dialog__origin-anchor" aria-hidden="true" />

  <Teleport :to="panelTarget">
    <div v-if="shouldRenderPanel" class="window-dialog-layer" :style="layerStyle">
      <div
        v-if="modal"
        class="window-dialog-overlay"
        :class="{
          'is-clickable': outsideClickBehavior !== 'none' || closeOnClickModal,
          'is-parked': windowState === 'minimized' && !isWindowAnimating,
        }"
        @click="handleOverlayClick"
      />

      <section
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
        <header
          class="window-dialog__header"
          :class="{ 'is-drag-disabled': !draggable || renderedWindowState === 'minimized' || isWindowAnimating }"
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
              :title="windowState === 'maximized' ? '还原' : '最大化'"
              :aria-label="windowState === 'maximized' ? '还原' : '最大化'"
              @mousedown.stop
              @click.stop="toggleMaximize"
            >
              <svg v-if="windowState === 'maximized'" viewBox="0 0 12 12" aria-hidden="true">
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
              @click.stop="visible = false"
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
      </section>

      <template v-if="resizable && renderedWindowState === 'normal' && !isWindowAnimating">
        <div
          v-for="direction in resizeDirections"
          :key="direction"
          class="window-dialog__resize-handle"
          :class="`window-dialog__resize-handle--${direction}`"
          :style="getResizeHandleStyle(direction)"
          aria-hidden="true"
          @mousedown.stop.prevent="startResize(direction, $event)"
        />
      </template>
    </div>
  </Teleport>

</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue'

import type { AccentType, WindowId, WindowOutsideClickBehavior, WindowState } from '../types'

type RestoreState = 'normal' | 'maximized'
type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
type WindowAnimationMode = 'transform' | 'geometry'

type WindowRect = {
  left: number
  top: number
  width: number
  height: number
}

type WindowRuntimeState = {
  openCount: number
  lastActiveRect: WindowRect | null
  activeRect: WindowRect | null
  activeWindowId: symbol | null
  activeWindowState: WindowState | null
  zIndexSeed: number
}

type WindowActiveEventDetail = {
  activeWindowId: symbol | null
}

const VIEWPORT_MARGIN = 16
const HEADER_VISIBLE_WIDTH = 96
const HEADER_VISIBLE_HEIGHT = 56
const RESTORE_POINTER_GUTTER = 8
const MAXIMIZED_RESTORE_RIGHT_ANCHOR_WIDTH = 180
const TOP_DRAG_MARGIN = 0
const EDGE_HANDLE_SIZE = 10
const CORNER_HANDLE_SIZE = 18
const WINDOW_STANDARD_TRANSITION_MS = 140
const WINDOW_MAXIMIZE_TRANSITION_MS = 120
const WINDOW_MINIMIZE_TRANSITION_MS = 180
const WINDOW_RESTORE_TRANSITION_MS = 180
const WINDOW_VISIBILITY_TRANSITION_MS = 120
const WINDOW_STANDARD_FADE_MS = 72
const WINDOW_MINIMIZE_FADE_MS = 130
const WINDOW_TRANSITION_SETTLE_MS = 32
const WINDOW_STANDARD_EASING = 'cubic-bezier(0.2, 0, 0, 1)'
const WINDOW_MINIMIZE_EASING = 'cubic-bezier(0.4, 0, 1, 1)'
const WINDOW_RESTORE_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)'
const WINDOW_FADE_OUT_EASING = 'cubic-bezier(0.4, 0, 1, 1)'
const WINDOW_FADE_IN_EASING = 'cubic-bezier(0, 0, 0.2, 1)'
const WINDOW_DOCK_WIDTH = 160
const WINDOW_DOCK_STEP = 84
const WINDOW_MINIMIZE_TARGET_SCALE = 0.5
const WINDOW_OPEN_OFFSET = 20
const WINDOW_RUNTIME_KEY = '__window_dialog_runtime__'
const WINDOW_RECT_STORAGE_KEY = '__window_dialog_last_rect__'
const WINDOW_ACTIVE_EVENT = 'window-dialog:active-change'
const WINDOW_DEFAULT_WIDTH = 560
const WINDOW_DEFAULT_HEIGHT = 420
const resizeDirections: ResizeDirection[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']
const ACCENT_PALETTE: Record<AccentType, { start: string; end: string; shadow: string }> = {
  primary: {
    start: '#2563eb',
    end: '#0f766e',
    shadow: 'rgba(37, 99, 235, 0.14)',
  },
  success: {
    start: '#16a34a',
    end: '#15803d',
    shadow: 'rgba(22, 163, 74, 0.16)',
  },
  warning: {
    start: '#f59e0b',
    end: '#d97706',
    shadow: 'rgba(245, 158, 11, 0.16)',
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
    animated?: boolean
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
    destroyOnClose?: boolean
    closeOnClickModal?: boolean
    closeOnPressEscape?: boolean
    minimizeTo?: string | HTMLElement | null
    maximizeTo?: string | HTMLElement | null
    accentType?: AccentType
    bgColor?: string
    windowId?: WindowId
    dockIndex?: number
    dockStep?: number
  }>(),
  {
    title: '',
    animated: true,
    outsideClickBehavior: 'none',
    minWidth: 360,
    minHeight: 240,
    maxWidth: Number.POSITIVE_INFINITY,
    maxHeight: Number.POSITIVE_INFINITY,
    modal: false,
    draggable: true,
    minimizable: true,
    maximizable: true,
    closable: true,
    resizable: true,
    appendToBody: true,
    destroyOnClose: true,
    closeOnClickModal: false,
    closeOnPressEscape: true,
    minimizeTo: null,
    maximizeTo: null,
    accentType: 'primary',
    bgColor: undefined,
    dockIndex: 0,
    dockStep: WINDOW_DOCK_STEP,
  },
)

const emit = defineEmits<{
  open: []
  opened: []
  close: []
  closed: []
  'minimize-start': []
  minimize: []
  maximize: []
  restore: []
  'outside-click': [behavior: WindowOutsideClickBehavior]
}>()

const visible = defineModel<boolean>({ default: false })

const instanceId = Symbol('window-dialog')
const originAnchorRef = ref<HTMLElement>()
const panelRef = ref<HTMLElement>()
const windowState = ref<WindowState>('normal')
const restoreState = ref<RestoreState>('normal')
const isDragging = ref(false)
const isWindowAnimating = ref(false)
const renderedWindowState = ref<WindowState>('normal')
const hasInitialized = ref(false)
const hasRegisteredOpen = ref(false)
const isActiveWindow = ref(false)
const panelTarget = shallowRef<string | HTMLElement>('body')
const dockTarget = shallowRef<string | HTMLElement>('body')
const maximizeTarget = shallowRef<HTMLElement | null>(null)
const zIndex = ref(nextWindowZIndex())
const viewportVersion = ref(0)

const windowRect = reactive<WindowRect>({
  left: 0,
  top: 0,
  width: WINDOW_DEFAULT_WIDTH,
  height: WINDOW_DEFAULT_HEIGHT,
})
const animatedRect = reactive<WindowRect>({
  left: 0,
  top: 0,
  width: 0,
  height: 0,
})
const animatedOpacity = ref(1)
const animatedBorderRadius = ref(14)
const animatedTranslateX = ref(0)
const animatedTranslateY = ref(0)
const animatedScaleX = ref(1)
const animatedScaleY = ref(1)
const transitionDurationMs = ref(WINDOW_STANDARD_TRANSITION_MS)
const fadeDurationMs = ref(WINDOW_STANDARD_FADE_MS)
const motionEasing = ref(WINDOW_STANDARD_EASING)
const fadeEasing = ref(WINDOW_FADE_IN_EASING)

let cleanupPointerTracking: (() => void) | null = null
let cleanupEscapeTracking: (() => void) | null = null
let windowTransitionTimer: ReturnType<typeof window.setTimeout> | null = null
let windowTransitionFrame = 0
let windowTransitionVersion = 0
let minimizeTransitionPending = false

const shouldRenderPanel = computed(
  () => (
    visible.value && (windowState.value !== 'minimized' || isWindowAnimating.value)
  ) || (!visible.value && isWindowAnimating.value && renderedWindowState.value !== 'minimized'),
)

const dialogClass = computed(() => [
  'window-dialog',
  `window-dialog--${renderedWindowState.value}`,
  {
    'window-dialog--animating': isWindowAnimating.value,
    'window-dialog--dragging': isDragging.value,
    'window-dialog--active': isActiveWindow.value,
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
  const motionVars = {
    '--window-dialog-motion-ms': props.animated ? `${transitionDurationMs.value}ms` : '0ms',
    '--window-dialog-fade-ms': props.animated ? `${fadeDurationMs.value}ms` : '0ms',
    '--window-dialog-motion-ease': motionEasing.value,
    '--window-dialog-fade-ease': fadeEasing.value,
  }

  if (isWindowAnimating.value) {
    return {
      ...accentVars.value,
      ...motionVars,
      left: `${animatedRect.left}px`,
      top: `${animatedRect.top}px`,
      width: `${animatedRect.width}px`,
      height: `${animatedRect.height}px`,
      opacity: String(animatedOpacity.value),
      borderRadius: `${animatedBorderRadius.value}px`,
      transformOrigin: 'top left',
      transform: `translate3d(${animatedTranslateX.value}px, ${animatedTranslateY.value}px, 0) scale(${animatedScaleX.value}, ${animatedScaleY.value})`,
      zIndex: String(zIndex.value + 1),
    }
  }

  if (windowState.value === 'maximized') {
    viewportVersion.value
    const maximizedRect = getMaximizedRect()

    return {
      ...accentVars.value,
      ...motionVars,
      left: `${maximizedRect.left}px`,
      top: `${maximizedRect.top}px`,
      width: `${maximizedRect.width}px`,
      height: `${maximizedRect.height}px`,
      zIndex: String(zIndex.value + 1),
    }
  }

  return {
    ...accentVars.value,
    ...motionVars,
    left: `${windowRect.left}px`,
    top: `${windowRect.top}px`,
    width: `${windowRect.width}px`,
    height: `${windowRect.height}px`,
    zIndex: String(zIndex.value + 1),
  }
})

const dialogLabel = computed(() => props.title || 'Dialog')

watch(
  () => props.appendToBody,
  () => {
    resolvePanelTarget()
  },
)

watch(
  () => props.minimizeTo,
  () => {
    resolveDockTarget()
  },
)

watch(
  () => props.maximizeTo,
  () => {
    resolveMaximizeTarget()
  },
)

watch(
  () => [visible.value, windowState.value, props.closeOnPressEscape] as const,
  ([show, state, closable]) => {
    if (show && state !== 'minimized' && closable) {
      enableEscapeClose()
      return
    }
    disableEscapeClose()
  },
  { immediate: true },
)

watch(
  visible,
  (show, wasShown) => {
    if (show) {
      resolvePanelTarget()
      resolveDockTarget()
      initializeWindow()
      registerOpenWindow()
      clearWindowTransition()
      renderedWindowState.value = windowState.value
      bringToFront()
      emit('open')
      if (wasShown === false && hasInitialized.value) {
        animateVisibilityChange(true, () => {
          focusPanelOnNextTick()
          emit('opened')
        })
        return
      }

      focusPanelOnNextTick()
      nextTick(() => {
        if (visible.value) {
          emit('opened')
        }
      })
      return
    }

    stopPointerTracking()
    emit('close')
    if (windowState.value === 'minimized') {
      clearWindowTransition()
      windowState.value = 'normal'
      renderedWindowState.value = 'normal'
      restoreState.value = 'normal'
      unregisterOpenWindow()
      emit('closed')
      return
    }

    if (wasShown) {
      animateVisibilityChange(false, () => {
        unregisterOpenWindow()
        emit('closed')
      })
      return
    }

    unregisterOpenWindow()
    emit('closed')
  },
)

watch(
  () => [props.width, props.height, props.minWidth, props.minHeight, props.maxWidth, props.maxHeight] as const,
  () => {
    if (!hasInitialized.value) {
      applyRect(createInitialRect())
      return
    }

    if (windowState.value === 'normal') {
      applyRect(windowRect)
    }
  },
)

onMounted(() => {
  resolvePanelTarget()
  resolveDockTarget()
  resolveMaximizeTarget()
  window.addEventListener(WINDOW_ACTIVE_EVENT, handleActiveWindowChange)
  document.addEventListener('pointerdown', handleDocumentPointerDown, true)
  if (visible.value) {
    initializeWindow()
    registerOpenWindow()
    clearWindowTransition()
    renderedWindowState.value = windowState.value
    bringToFront()
    focusPanelOnNextTick()
    emit('open')
    nextTick(() => {
      if (visible.value) {
        emit('opened')
      }
    })
  }
  window.addEventListener('resize', handleViewportResize)
})

onBeforeUnmount(() => {
  stopPointerTracking()
  disableEscapeClose()
  unregisterOpenWindow()
  clearWindowTransition()
  window.removeEventListener(WINDOW_ACTIVE_EVENT, handleActiveWindowChange)
  window.removeEventListener('resize', handleViewportResize)
  document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
})

function bringToFront() {
  zIndex.value = nextWindowZIndex()
  syncActiveWindowRuntime()
}

function handlePanelPointerDown() {
  bringToFront()
  focusPanel()
}

function focusPanel() {
  panelRef.value?.focus({ preventScroll: true })
}

function focusPanelOnNextTick() {
  nextTick(() => {
    if (visible.value && windowState.value !== 'minimized') {
      focusPanel()
    }
  })
}

function focusTopVisibleWindowOnNextTick() {
  nextTick(() => {
    const topPanel = Array.from(document.querySelectorAll<HTMLElement>('.window-dialog'))
      .sort((left, right) => getPanelZIndex(right) - getPanelZIndex(left))[0]

    topPanel?.focus({ preventScroll: true })
    topPanel?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  })
}

function getPanelZIndex(panel: HTMLElement) {
  const parsed = Number.parseInt(panel.style.zIndex || window.getComputedStyle(panel).zIndex, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

function handleActiveWindowChange(event: Event) {
  const activeWindowId = (event as CustomEvent<WindowActiveEventDetail>).detail?.activeWindowId ?? null
  isActiveWindow.value = activeWindowId === instanceId
}

function initializeWindow() {
  if (hasInitialized.value) {
    return
  }

  applyRect(createInitialRect())
  hasInitialized.value = true
}

function createInitialRect(): WindowRect {
  const viewport = getViewport()
  const limits = getSizeLimits(viewport)
  const width = clampValue(props.width ?? WINDOW_DEFAULT_WIDTH, limits.minWidth, limits.maxWidth)
  const height = clampValue(props.height ?? WINDOW_DEFAULT_HEIGHT, limits.minHeight, limits.maxHeight)
  const centeredRect = clampRect({
    width,
    height,
    left: Math.round((viewport.width - width) / 2),
    top: Math.round(Math.max(TOP_DRAG_MARGIN, (viewport.height - height) / 2 - 24)),
  })
  const runtimeState = getWindowRuntimeState()
  const rememberedRect = getRememberedRect()
  const rememberedBaseRect = rememberedRect ?? runtimeState.lastActiveRect ?? centeredRect

  if (runtimeState.openCount === 0) {
    return clampRect({
      width,
      height,
      left: rememberedBaseRect.left,
      top: rememberedBaseRect.top,
    })
  }

  if (runtimeState.activeWindowState !== 'normal' || !runtimeState.activeRect) {
    return clampRect({
      width,
      height,
      left: rememberedBaseRect.left,
      top: rememberedBaseRect.top,
    })
  }

  if (shouldResetCascadeToCenter(runtimeState.activeRect, width, height, viewport)) {
    return centeredRect
  }

  return clampRect({
    width,
    height,
    left: runtimeState.activeRect.left + WINDOW_OPEN_OFFSET,
    top: runtimeState.activeRect.top + WINDOW_OPEN_OFFSET,
  })
}

function startDrag(event: MouseEvent) {
  if (!props.draggable || windowState.value === 'minimized' || isWindowAnimating.value) {
    return
  }

  bringToFront()

  if (windowState.value === 'maximized') {
    startDragFromMaximized(event)
    return
  }

  const startRect = { ...windowRect }
  const startX = event.clientX
  const startY = event.clientY

  beginPointerTracking('move', (moveEvent) => {
    applyRect({
      ...startRect,
      left: startRect.left + moveEvent.clientX - startX,
      top: startRect.top + moveEvent.clientY - startY,
    })
  })
}

function startDragFromMaximized(event: MouseEvent) {
  const startX = event.clientX
  const startY = event.clientY
  const maximizedRect = getMaximizedRect()
  const restoreWidth = clampValue(windowRect.width, props.minWidth, maximizedRect.width)
  const restoreHeight = clampValue(windowRect.height, props.minHeight, maximizedRect.height)
  const pointerOffsetX = getMaximizedRestorePointerOffsetX(startX - maximizedRect.left, maximizedRect.width, restoreWidth)
  const pointerOffsetY = clampValue(startY - maximizedRect.top, 12, HEADER_VISIBLE_HEIGHT - 8)
  let hasRestored = false
  let dragOffsetX = 0
  let dragOffsetY = 0

  beginPointerTracking('move', (moveEvent) => {
    if (!hasRestored) {
      if (
        Math.abs(moveEvent.clientX - startX) < 2
        && Math.abs(moveEvent.clientY - startY) < 2
      ) {
        return
      }

      const restoredRect = clampRect({
        width: restoreWidth,
        height: restoreHeight,
        left: moveEvent.clientX - pointerOffsetX,
        top: moveEvent.clientY - pointerOffsetY,
      })

      windowState.value = 'normal'
      renderedWindowState.value = 'normal'
      applyRect(restoredRect)
      syncActiveWindowRuntime()
      emit('restore')

      dragOffsetX = moveEvent.clientX - restoredRect.left
      dragOffsetY = moveEvent.clientY - restoredRect.top
      hasRestored = true
      return
    }

    applyRect({
      ...windowRect,
      left: moveEvent.clientX - dragOffsetX,
      top: moveEvent.clientY - dragOffsetY,
    })
  })
}

function handleHeaderDblClick() {
  if (!props.maximizable) {
    return
  }

  toggleMaximize()
}

function handleMinimize() {
  if (!props.minimizable || windowState.value === 'minimized' || isWindowAnimating.value || minimizeTransitionPending) {
    return
  }

  restoreState.value = windowState.value === 'maximized' ? 'maximized' : 'normal'
  stopPointerTracking()
  const fromRect = getStateRect(windowState.value)
  const fromState = windowState.value
  const fromBorderRadius = fromState === 'maximized' ? 0 : 14

  if (!props.animated) {
    emit('minimize-start')
    windowState.value = 'minimized'
    renderedWindowState.value = 'minimized'
    syncActiveWindowRuntime()
    emit('minimize')
    focusTopVisibleWindowOnNextTick()
    return
  }

  minimizeTransitionPending = true
  emit('minimize-start')

  nextTick(() => {
    minimizeTransitionPending = false

    if (!visible.value || windowState.value !== fromState || isWindowAnimating.value) {
      return
    }

    animateWindowTransition({
      fromState,
      toState: 'minimized',
      fromRect,
      toRect: getMinimizeAnimationRect(fromRect, getDockRect()),
      fromOpacity: 1,
      toOpacity: 0,
      fromBorderRadius,
      toBorderRadius: 16,
      durationMs: WINDOW_MINIMIZE_TRANSITION_MS,
      fadeDurationMs: WINDOW_MINIMIZE_FADE_MS,
      motionEasing: WINDOW_MINIMIZE_EASING,
      fadeEasing: WINDOW_FADE_OUT_EASING,
      onComplete: () => {
        windowState.value = 'minimized'
        renderedWindowState.value = 'minimized'
        syncActiveWindowRuntime()
        emit('minimize')
        focusTopVisibleWindowOnNextTick()
      },
    })
  })
}

function toggleMaximize() {
  if (!props.maximizable || isWindowAnimating.value) {
    return
  }

  stopPointerTracking()

  if (windowState.value === 'maximized') {
    animateWindowTransition({
      fromState: 'maximized',
      toState: 'normal',
      fromRect: getMaximizedRect(),
      toRect: { ...windowRect },
      animationMode: 'geometry',
      fromBorderRadius: 0,
      toBorderRadius: 14,
      durationMs: WINDOW_MAXIMIZE_TRANSITION_MS,
      fadeDurationMs: WINDOW_STANDARD_FADE_MS,
      onComplete: () => {
        windowState.value = 'normal'
        renderedWindowState.value = 'normal'
        syncActiveWindowRuntime()
        emit('restore')
      },
    })
    return
  }

  restoreState.value = 'normal'
  animateWindowTransition({
    fromState: 'normal',
    toState: 'maximized',
    fromRect: { ...windowRect },
    toRect: getMaximizedRect(),
    animationMode: 'geometry',
    fromBorderRadius: 14,
    toBorderRadius: 0,
    durationMs: WINDOW_MAXIMIZE_TRANSITION_MS,
    fadeDurationMs: WINDOW_STANDARD_FADE_MS,
    onComplete: () => {
      windowState.value = 'maximized'
      renderedWindowState.value = 'maximized'
      syncActiveWindowRuntime()
      emit('maximize')
    },
  })
}

function restoreWindow() {
  if (isWindowAnimating.value) {
    return
  }

  bringToFront()
  const targetState = windowState.value === 'minimized' ? restoreState.value : 'normal'
  if (windowState.value === 'minimized') {
    const targetRect = targetState === 'maximized' ? getMaximizedRect() : { ...windowRect }
    animateWindowTransition({
      fromState: 'minimized',
      toState: targetState,
      fromRect: getDockRect(),
      toRect: targetRect,
      layoutRect: targetRect,
      fromOpacity: 0.16,
      fromBorderRadius: 16,
      toBorderRadius: targetState === 'maximized' ? 0 : 14,
      renderState: targetState,
      durationMs: targetState === 'maximized' ? WINDOW_MAXIMIZE_TRANSITION_MS : WINDOW_RESTORE_TRANSITION_MS,
      fadeDurationMs: WINDOW_STANDARD_FADE_MS,
      motionEasing: WINDOW_RESTORE_EASING,
      fadeEasing: WINDOW_FADE_IN_EASING,
      onComplete: () => {
        windowState.value = targetState
        renderedWindowState.value = targetState
        syncActiveWindowRuntime()
        emitWindowRestore(targetState)
        focusPanelOnNextTick()
      },
    })
    return
  }

  if (windowState.value === 'maximized') {
    toggleMaximize()
    return
  }

  windowState.value = 'normal'
  renderedWindowState.value = 'normal'
  applyRect(windowRect)
  syncActiveWindowRuntime()
  emit('restore')
}

function startResize(direction: ResizeDirection, event: MouseEvent) {
  if (windowState.value !== 'normal') {
    return
  }

  bringToFront()

  const startRect = { ...windowRect }
  const startX = event.clientX
  const startY = event.clientY

  beginPointerTracking(getResizeCursor(direction), (moveEvent) => {
    applyRect(
      getResizedRect(
        startRect,
        direction,
        moveEvent.clientX - startX,
        moveEvent.clientY - startY,
      ),
    )
  })
}

function handleOverlayClick() {
  handleOutsideClick()
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!visible.value || props.modal || windowState.value === 'minimized' || !isActiveWindow.value) {
    return
  }

  const targetElement = getEventTargetElement(event)
  if (targetElement?.closest('.window-dialog, [data-vue3-windows-dock], [data-vue3-windows-win10-dock], .window-dialog__resize-handle')) {
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

function beginPointerTracking(cursor: string, onMove: (event: MouseEvent) => void) {
  stopPointerTracking()

  isDragging.value = true
  document.body.classList.add('window-dialog--interacting')
  document.body.style.cursor = cursor

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
    document.body.style.cursor = ''
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
    if (event.key === 'Escape' && closeOnPressEscapeActive()) {
      visible.value = false
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

function closeOnPressEscapeActive() {
  return props.closeOnPressEscape && visible.value && windowState.value !== 'minimized'
}

function resolvePanelTarget() {
  if (!props.appendToBody && originAnchorRef.value?.parentElement) {
    panelTarget.value = originAnchorRef.value.parentElement
    return
  }

  panelTarget.value = 'body'
}

function resolveDockTarget() {
  if (typeof window === 'undefined') {
    dockTarget.value = 'body'
    return
  }

  if (props.minimizeTo instanceof HTMLElement) {
    dockTarget.value = props.minimizeTo
    return
  }

  if (typeof props.minimizeTo === 'string' && props.minimizeTo.trim()) {
    dockTarget.value = document.querySelector(props.minimizeTo) ? props.minimizeTo : 'body'
    return
  }

  dockTarget.value = 'body'
}

function resolveMaximizeTarget() {
  if (typeof window === 'undefined') {
    maximizeTarget.value = null
    return
  }

  if (props.maximizeTo instanceof HTMLElement) {
    maximizeTarget.value = props.maximizeTo
    return
  }

  if (typeof props.maximizeTo === 'string' && props.maximizeTo.trim()) {
    const target = document.querySelector(props.maximizeTo)
    maximizeTarget.value = target instanceof HTMLElement ? target : null
    return
  }

  maximizeTarget.value = null
}

function handleViewportResize() {
  viewportVersion.value += 1
  resolvePanelTarget()
  resolveDockTarget()
  resolveMaximizeTarget()

  if (isWindowAnimating.value) {
    return
  }

  if (visible.value && windowState.value === 'normal') {
    applyRect(windowRect)
  }
}

function animateVisibilityChange(show: boolean, onComplete: () => void) {
  const rect = windowState.value === 'maximized' ? getMaximizedRect() : { ...windowRect }
  animateWindowTransition({
    fromState: windowState.value,
    toState: windowState.value,
    fromRect: rect,
    toRect: rect,
    animationMode: 'geometry',
    fromOpacity: show ? 0 : 1,
    toOpacity: show ? 1 : 0,
    fromBorderRadius: getWindowBorderRadius(windowState.value),
    toBorderRadius: getWindowBorderRadius(windowState.value),
    renderState: windowState.value,
    durationMs: WINDOW_VISIBILITY_TRANSITION_MS,
    fadeDurationMs: WINDOW_VISIBILITY_TRANSITION_MS,
    motionEasing: WINDOW_STANDARD_EASING,
    fadeEasing: show ? WINDOW_FADE_IN_EASING : WINDOW_FADE_OUT_EASING,
    onComplete,
  })
}

function animateWindowTransition(options: {
  fromState: WindowState
  toState: WindowState
  fromRect: WindowRect
  toRect: WindowRect
  layoutRect?: WindowRect
  animationMode?: WindowAnimationMode
  fromOpacity?: number
  toOpacity?: number
  fromBorderRadius?: number
  toBorderRadius?: number
  renderState?: WindowState
  durationMs?: number
  fadeDurationMs?: number
  motionEasing?: string
  fadeEasing?: string
  onComplete: () => void
}) {
  clearWindowTransition()
  if (!props.animated) {
    const layoutRect = options.layoutRect ?? options.toRect
    applyRect(layoutRect, { persist: options.toState !== 'minimized' })
    renderedWindowState.value = options.renderState ?? options.toState
    animatedOpacity.value = options.toOpacity ?? 1
    animatedBorderRadius.value = options.toBorderRadius ?? getWindowBorderRadius(options.toState)
    options.onComplete()
    return
  }

  const transitionVersion = ++windowTransitionVersion
  const layoutRect = options.layoutRect ?? options.fromRect
  const motionDuration = options.durationMs ?? WINDOW_STANDARD_TRANSITION_MS
  const fadeDuration = options.fadeDurationMs ?? WINDOW_STANDARD_FADE_MS
  const animationMode = options.animationMode ?? 'transform'

  stopPointerTracking()
  isWindowAnimating.value = true
  transitionDurationMs.value = motionDuration
  fadeDurationMs.value = fadeDuration
  motionEasing.value = options.motionEasing ?? WINDOW_STANDARD_EASING
  fadeEasing.value = options.fadeEasing ?? WINDOW_FADE_IN_EASING
  renderedWindowState.value = options.renderState ?? (options.fromState === 'minimized' ? options.toState : options.fromState)
  setAnimatedRect(animationMode === 'geometry' ? options.fromRect : layoutRect)
  setAnimatedTransform(layoutRect, animationMode === 'geometry' ? layoutRect : options.fromRect)
  animatedOpacity.value = options.fromOpacity ?? 1
  animatedBorderRadius.value = options.fromBorderRadius ?? getWindowBorderRadius(options.fromState)

  nextTick(() => {
    if (transitionVersion !== windowTransitionVersion || !isWindowAnimating.value) {
      return
    }

    windowTransitionFrame = window.requestAnimationFrame(() => {
      windowTransitionFrame = 0
      if (transitionVersion !== windowTransitionVersion || !isWindowAnimating.value) {
        return
      }

      if (animationMode === 'geometry') {
        setAnimatedRect(options.toRect)
        setAnimatedTransform(options.toRect, options.toRect)
      } else {
        setAnimatedTransform(layoutRect, options.toRect)
      }
      animatedOpacity.value = options.toOpacity ?? 1
      animatedBorderRadius.value = options.toBorderRadius ?? getWindowBorderRadius(options.toState)

      windowTransitionTimer = window.setTimeout(() => {
        if (transitionVersion !== windowTransitionVersion) {
          return
        }

        clearWindowTransition()
        options.onComplete()
      }, Math.max(motionDuration, fadeDuration) + WINDOW_TRANSITION_SETTLE_MS)
    })
  })
}

function clearWindowTransition() {
  windowTransitionVersion += 1
  minimizeTransitionPending = false

  if (windowTransitionTimer) {
    clearTimeout(windowTransitionTimer)
    windowTransitionTimer = null
  }

  if (windowTransitionFrame) {
    window.cancelAnimationFrame(windowTransitionFrame)
    windowTransitionFrame = 0
  }

  isWindowAnimating.value = false
  animatedOpacity.value = 1
  animatedBorderRadius.value = 14
  animatedTranslateX.value = 0
  animatedTranslateY.value = 0
  animatedScaleX.value = 1
  animatedScaleY.value = 1
  transitionDurationMs.value = WINDOW_STANDARD_TRANSITION_MS
  fadeDurationMs.value = WINDOW_STANDARD_FADE_MS
  motionEasing.value = WINDOW_STANDARD_EASING
  fadeEasing.value = WINDOW_FADE_IN_EASING
}

function setAnimatedRect(nextRect: WindowRect) {
  animatedRect.left = nextRect.left
  animatedRect.top = nextRect.top
  animatedRect.width = nextRect.width
  animatedRect.height = nextRect.height
}

function setAnimatedTransform(fromRect: WindowRect, toRect: WindowRect) {
  animatedTranslateX.value = toRect.left - fromRect.left
  animatedTranslateY.value = toRect.top - fromRect.top
  animatedScaleX.value = toRect.width / fromRect.width
  animatedScaleY.value = toRect.height / fromRect.height
}

function getStateRect(state: WindowState): WindowRect {
  switch (state) {
    case 'maximized':
      return getMaximizedRect()
    case 'minimized':
      return getDockRect()
    default:
      return { ...windowRect }
  }
}

function getMaximizedRect(): WindowRect {
  const targetRect = maximizeTarget.value?.getBoundingClientRect()
  if (targetRect && targetRect.width > 0 && targetRect.height > 0) {
    return {
      left: Math.round(targetRect.left),
      top: Math.round(targetRect.top),
      width: Math.round(targetRect.width),
      height: Math.round(targetRect.height),
    }
  }

  const viewport = getViewport()
  return {
    left: 0,
    top: 0,
    width: viewport.width,
    height: viewport.height,
  }
}

function getDockRect(): WindowRect {
  const viewport = getViewport()
  const dockHost = resolveDockHostElement()
  const dockTaskRect = getDockTaskRect(dockHost)
  if (dockTaskRect) {
    return dockTaskRect
  }

  const hostRect = dockHost?.getBoundingClientRect()
  const width = Math.round(Math.min(WINDOW_DOCK_WIDTH, Math.max(140, viewport.width - 32)))
  const height = 52
  const scrollLeft = dockHost instanceof HTMLElement ? dockHost.scrollLeft : 0
  const fallbackLeft = hostRect
    ? hostRect.left + props.dockIndex * props.dockStep - scrollLeft
    : 16 + props.dockIndex * props.dockStep
  const fallbackTop = hostRect ? hostRect.top + Math.max(0, (hostRect.height - height) / 2) : viewport.height - height

  return {
    left: Math.round(fallbackLeft),
    top: Math.round(fallbackTop),
    width,
    height,
  }
}

function getDockTaskRect(dockHost: HTMLElement | null): WindowRect | null {
  if (!dockHost || props.windowId === undefined) {
    return null
  }

  const targetId = String(props.windowId)
  const dockTask = Array.from(dockHost.querySelectorAll<HTMLElement>('[data-vue3-windows-dock-task]'))
    .find((element) => element.dataset.vue3WindowsWindowId === targetId)
  const taskRect = dockTask?.getBoundingClientRect()
  if (!taskRect || taskRect.width <= 0 || taskRect.height <= 0) {
    return null
  }

  return {
    left: Math.round(taskRect.left),
    top: Math.round(taskRect.top),
    width: Math.round(taskRect.width),
    height: Math.round(taskRect.height),
  }
}

function resolveDockHostElement() {
  if (dockTarget.value instanceof HTMLElement) {
    return dockTarget.value
  }

  if (typeof dockTarget.value === 'string') {
    const target = document.querySelector(dockTarget.value)
    return target instanceof HTMLElement ? target : null
  }

  return null
}

function getWindowBorderRadius(state: WindowState) {
  return state === 'maximized' ? 0 : 14
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

function getMinimizeAnimationRect(fromRect: WindowRect, dockRect: WindowRect): WindowRect {
  return {
    left: Math.round(fromRect.left + (dockRect.left - fromRect.left) * WINDOW_MINIMIZE_TARGET_SCALE),
    top: Math.round(fromRect.top + (dockRect.top - fromRect.top) * WINDOW_MINIMIZE_TARGET_SCALE),
    width: Math.round(fromRect.width + (dockRect.width - fromRect.width) * WINDOW_MINIMIZE_TARGET_SCALE),
    height: Math.round(fromRect.height + (dockRect.height - fromRect.height) * WINDOW_MINIMIZE_TARGET_SCALE),
  }
}

function shouldResetCascadeToCenter(
  activeRect: WindowRect,
  width: number,
  height: number,
  viewport: { width: number; height: number },
) {
  const nextLeft = activeRect.left + WINDOW_OPEN_OFFSET
  const nextTop = activeRect.top + WINDOW_OPEN_OFFSET
  const rightEdge = viewport.width - VIEWPORT_MARGIN
  const bottomEdge = viewport.height - VIEWPORT_MARGIN

  return (
    nextLeft + width > rightEdge
    || nextTop + height > bottomEdge
    || activeRect.left < VIEWPORT_MARGIN
    || activeRect.top < TOP_DRAG_MARGIN + VIEWPORT_MARGIN
  )
}

function emitWindowRestore(targetState: RestoreState) {
  if (targetState === 'maximized') {
    emit('maximize')
    return
  }

  emit('restore')
}

function getResizeHandleStyle(direction: ResizeDirection) {
  const left = windowRect.left
  const top = windowRect.top
  const right = left + windowRect.width
  const bottom = top + windowRect.height
  const edgeInset = CORNER_HANDLE_SIZE

  switch (direction) {
    case 'n':
      return {
        left: `${left + edgeInset}px`,
        top: `${top - EDGE_HANDLE_SIZE / 2}px`,
        width: `${Math.max(0, windowRect.width - edgeInset * 2)}px`,
        height: `${EDGE_HANDLE_SIZE}px`,
      }
    case 's':
      return {
        left: `${left + edgeInset}px`,
        top: `${bottom - EDGE_HANDLE_SIZE / 2}px`,
        width: `${Math.max(0, windowRect.width - edgeInset * 2)}px`,
        height: `${EDGE_HANDLE_SIZE}px`,
      }
    case 'e':
      return {
        left: `${right - EDGE_HANDLE_SIZE / 2}px`,
        top: `${top + edgeInset}px`,
        width: `${EDGE_HANDLE_SIZE}px`,
        height: `${Math.max(0, windowRect.height - edgeInset * 2)}px`,
      }
    case 'w':
      return {
        left: `${left - EDGE_HANDLE_SIZE / 2}px`,
        top: `${top + edgeInset}px`,
        width: `${EDGE_HANDLE_SIZE}px`,
        height: `${Math.max(0, windowRect.height - edgeInset * 2)}px`,
      }
    case 'ne':
      return {
        left: `${right - CORNER_HANDLE_SIZE / 2}px`,
        top: `${top - CORNER_HANDLE_SIZE / 2}px`,
        width: `${CORNER_HANDLE_SIZE}px`,
        height: `${CORNER_HANDLE_SIZE}px`,
      }
    case 'nw':
      return {
        left: `${left - CORNER_HANDLE_SIZE / 2}px`,
        top: `${top - CORNER_HANDLE_SIZE / 2}px`,
        width: `${CORNER_HANDLE_SIZE}px`,
        height: `${CORNER_HANDLE_SIZE}px`,
      }
    case 'se':
      return {
        left: `${right - CORNER_HANDLE_SIZE / 2}px`,
        top: `${bottom - CORNER_HANDLE_SIZE / 2}px`,
        width: `${CORNER_HANDLE_SIZE}px`,
        height: `${CORNER_HANDLE_SIZE}px`,
      }
    case 'sw':
      return {
        left: `${left - CORNER_HANDLE_SIZE / 2}px`,
        top: `${bottom - CORNER_HANDLE_SIZE / 2}px`,
        width: `${CORNER_HANDLE_SIZE}px`,
        height: `${CORNER_HANDLE_SIZE}px`,
      }
  }
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

function getResizedRect(
  startRect: WindowRect,
  direction: ResizeDirection,
  deltaX: number,
  deltaY: number,
): WindowRect {
  const viewport = getViewport()
  const limits = getSizeLimits(viewport)
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
    width = clampValue(startRect.width - deltaX, limits.minWidth, limits.maxWidth)
    left = startRect.left + (startRect.width - width)
  }

  if (includesNorth) {
    height = clampValue(startRect.height - deltaY, limits.minHeight, limits.maxHeight)
    top = startRect.top + (startRect.height - height)
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

function applyRect(nextRect: WindowRect, options: { persist?: boolean } = {}) {
  const clampedRect = clampRect(nextRect)
  windowRect.left = clampedRect.left
  windowRect.top = clampedRect.top
  windowRect.width = clampedRect.width
  windowRect.height = clampedRect.height

  if (options.persist !== false) {
    rememberWindowRect(clampedRect)
  }

  const runtimeState = getWindowRuntimeState()
  if (runtimeState.activeWindowId === instanceId && windowState.value === 'normal') {
    runtimeState.activeRect = { ...clampedRect }
    runtimeState.lastActiveRect = { ...clampedRect }
  }
}

function clampRect(nextRect: WindowRect): WindowRect {
  const viewport = getViewport()
  const limits = getSizeLimits(viewport)
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

function getSizeLimits(viewport: { width: number; height: number }) {
  const viewportMaxWidth = Math.max(280, viewport.width - VIEWPORT_MARGIN * 2)
  const viewportMaxHeight = Math.max(200, viewport.height - VIEWPORT_MARGIN * 2)
  const maxWidth = Math.min(props.maxWidth, viewportMaxWidth)
  const maxHeight = Math.min(props.maxHeight, viewportMaxHeight)
  const minWidth = clampValue(props.minWidth, 0, maxWidth)
  const minHeight = clampValue(props.minHeight, 0, maxHeight)

  return {
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
  }
}

function clampValue(value: number, min: number, max: number) {
  if (max < min) {
    return min
  }

  return Math.min(Math.max(value, min), max)
}

function nextWindowZIndex() {
  const runtimeState = getWindowRuntimeState()
  runtimeState.zIndexSeed += 1
  return runtimeState.zIndexSeed
}

function getWindowRuntimeState(): WindowRuntimeState {
  const globalState = globalThis as typeof globalThis & Record<string, unknown>
  const existingState = globalState[WINDOW_RUNTIME_KEY]
  if (existingState && typeof existingState === 'object') {
    return existingState as WindowRuntimeState
  }

  const initialState: WindowRuntimeState = {
    openCount: 0,
    lastActiveRect: null,
    activeRect: null,
    activeWindowId: null,
    activeWindowState: null,
    zIndexSeed: 2100,
  }
  globalState[WINDOW_RUNTIME_KEY] = initialState
  return initialState
}

function registerOpenWindow() {
  if (hasRegisteredOpen.value) {
    return
  }

  const runtimeState = getWindowRuntimeState()
  runtimeState.openCount += 1
  hasRegisteredOpen.value = true
}

function unregisterOpenWindow() {
  if (!hasRegisteredOpen.value) {
    return
  }

  const runtimeState = getWindowRuntimeState()
  runtimeState.openCount = Math.max(0, runtimeState.openCount - 1)
  if (runtimeState.activeWindowId === instanceId) {
    runtimeState.activeWindowId = null
    runtimeState.activeWindowState = null
    runtimeState.activeRect = null
    emitActiveWindowChange(null)
  }
  hasRegisteredOpen.value = false
}

function rememberWindowRect(rect: WindowRect) {
  const runtimeState = getWindowRuntimeState()
  runtimeState.lastActiveRect = { ...rect }

  try {
    window.localStorage.setItem(WINDOW_RECT_STORAGE_KEY, JSON.stringify(rect))
  } catch {
    // Ignore persistence failures and keep runtime memory only.
  }
}

function syncActiveWindowRuntime() {
  const runtimeState = getWindowRuntimeState()
  runtimeState.activeWindowId = instanceId
  runtimeState.activeWindowState = windowState.value
  emitActiveWindowChange(instanceId)

  if (windowState.value === 'normal') {
    runtimeState.activeRect = { ...windowRect }
    runtimeState.lastActiveRect = { ...windowRect }
    rememberWindowRect(windowRect)
    return
  }

  runtimeState.activeRect = null
}

function emitActiveWindowChange(activeWindowId: symbol | null) {
  isActiveWindow.value = activeWindowId === instanceId
  window.dispatchEvent(new CustomEvent<WindowActiveEventDetail>(WINDOW_ACTIVE_EVENT, {
    detail: { activeWindowId },
  }))
}

function getRememberedRect(): WindowRect | null {
  try {
    const raw = window.localStorage.getItem(WINDOW_RECT_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<WindowRect>
    if (
      typeof parsed.left !== 'number'
      || typeof parsed.top !== 'number'
      || typeof parsed.width !== 'number'
      || typeof parsed.height !== 'number'
    ) {
      return null
    }

    return parsed as WindowRect
  } catch {
    return null
  }
}

defineExpose({
  windowState,
  minimize: handleMinimize,
  maximize: toggleMaximize,
  moveTop: bringToFront,
  restore: restoreWindow,
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

:global(.window-dialog-overlay.is-parked) {
  pointer-events: none;
}

:global(.window-dialog) {
  position: fixed;
  margin: 0;
  padding: 0;
  border-radius: var(--window-dialog-radius, 14px);
  overflow: hidden;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.07), 0 2px 6px rgba(15, 23, 42, 0.04);
  border: 1px solid rgba(148, 163, 184, 0.28);
  display: flex;
  flex-direction: column;
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
  background: var(--window-dialog-surface);
  color: var(--window-dialog-text-color);
  pointer-events: auto;
  transition:
    left var(--window-dialog-motion-ms, 140ms) var(--window-dialog-motion-ease, cubic-bezier(0.2, 0, 0, 1)),
    top var(--window-dialog-motion-ms, 140ms) var(--window-dialog-motion-ease, cubic-bezier(0.2, 0, 0, 1)),
    width var(--window-dialog-motion-ms, 140ms) var(--window-dialog-motion-ease, cubic-bezier(0.2, 0, 0, 1)),
    height var(--window-dialog-motion-ms, 140ms) var(--window-dialog-motion-ease, cubic-bezier(0.2, 0, 0, 1)),
    transform var(--window-dialog-motion-ms, 140ms) var(--window-dialog-motion-ease, cubic-bezier(0.2, 0, 0, 1)),
    opacity var(--window-dialog-fade-ms, 72ms) var(--window-dialog-fade-ease, cubic-bezier(0, 0, 0.2, 1)),
    border-radius var(--window-dialog-motion-ms, 140ms) var(--window-dialog-motion-ease, cubic-bezier(0.2, 0, 0, 1)),
    box-shadow var(--window-dialog-fade-ms, 72ms) linear;
  will-change: left, top, width, height, transform, opacity, border-radius;
  backface-visibility: hidden;
}

:global(.window-dialog--maximized:not(.window-dialog--animating)) {
  border-radius: 0;
  border: none;
}

:global(.window-dialog--animating) {
  pointer-events: none;
}

:global(.window-dialog--active) {
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.14), 0 8px 16px rgba(15, 23, 42, 0.08);
}

:global(.window-dialog--dragging) {
  transition: none !important;
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

:global(.window-dialog__accent--dock) {
  margin-top: 1px;
}

:global(.window-dialog__title) {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--window-dialog-text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:global(.window-dialog__controls) {
  display: flex;
  align-items: stretch;
  align-self: stretch;
  flex-shrink: 0;
}

:global(.window-dialog__controls) {
  gap: 0;
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
  transition:
    background-color 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;
}

:global(.window-dialog__control svg) {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

:global(.window-dialog__control:hover) {
  background: var(--window-dialog-hover-bg);
  color: var(--window-dialog-hover-color);
}

:global(.window-dialog__control:active) {
  transform: none;
}

:global(.window-dialog__control--close:hover) {
  background: #ef4444;
  color: #ffffff;
}

:global(.window-dialog__body) {
  height: 100%;
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
  position: fixed;
  z-index: 2100;
  pointer-events: auto;
}

:global(.window-dialog__resize-handle--n),
:global(.window-dialog__resize-handle--s) {
  cursor: ns-resize;
}

:global(.window-dialog__resize-handle--e),
:global(.window-dialog__resize-handle--w) {
  cursor: ew-resize;
}

:global(.window-dialog__resize-handle--ne),
:global(.window-dialog__resize-handle--sw) {
  cursor: nesw-resize;
}

:global(.window-dialog__resize-handle--nw),
:global(.window-dialog__resize-handle--se) {
  cursor: nwse-resize;
}

.window-dialog__origin-anchor {
  display: none;
}
</style>
