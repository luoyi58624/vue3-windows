import {
  defineComponent,
  h,
  render,
  shallowRef,
  unref,
  watch,
  type AppContext,
  type ComponentPublicInstance,
  type Ref,
  type ShallowRef,
} from 'vue'

import Window from '../components/Window.vue'
import WindowContentHost from '../components/WindowContentHost'
import type { UseWindowsOptions, WindowAnchorTarget, WindowGeometry, WindowOutsideClickBehavior, WindowsSetupOptions } from '../types'
import type { useWindowsManager } from './useWindowsManager'
import { createAppContextWithOwnerContext, type WindowOwnerContext } from './windowOwnerContext'

type WindowsManager = ReturnType<typeof useWindowsManager>

export interface WindowsRendererOptions extends UseWindowsOptions {
  appContext?: AppContext | null
  ownerContext?: WindowOwnerContext | null
  setupOptions?: Readonly<Ref<WindowsSetupOptions>>
  api?: WindowsManager['api']
}

export interface WindowsRendererHandle {
  dispose(): void
  isConnected(): boolean
}

export function mountWindowsRenderer(
  manager: WindowsManager,
  anchorTarget: WindowAnchorTarget | null,
  options: WindowsRendererOptions = {},
): WindowsRendererHandle | null {
  if (typeof document === 'undefined') {
    return null
  }

  const dockTarget = shallowRef<HTMLElement | null>(null)
  const maximizeTarget = shallowRef<HTMLElement | null>(null)
  const renderRoot = document.createElement('div')
  let stopDockWatch: (() => void) | null = null
  let stopMaximizeWatch: (() => void) | null = null

  const Renderer = defineComponent({
    name: 'WindowsControllerRenderer',
    setup() {
      return () => manager.model.value.map((windowRecord) => {
        const globalOptions = options.setupOptions?.value ?? {}

        return h(Window, {
          key: windowRecord.id,
          ref: (instance: Element | ComponentPublicInstance | null) => manager.setWindowRef(windowRecord.id, instance),
          modelValue: windowRecord.visible,
          title: windowRecord.title,
          windowId: windowRecord.id,
          animated: options.animated ?? globalOptions.animated ?? true,
          outsideClickBehavior: windowRecord.outsideClickBehavior ?? globalOptions.outsideClickBehavior,
          width: windowRecord.width ?? globalOptions.width,
          height: windowRecord.height ?? globalOptions.height,
          minWidth: windowRecord.minWidth ?? globalOptions.minWidth,
          minHeight: windowRecord.minHeight ?? globalOptions.minHeight,
          maxWidth: windowRecord.maxWidth ?? globalOptions.maxWidth,
          maxHeight: windowRecord.maxHeight ?? globalOptions.maxHeight,
          minimizable: options.minimizable === false ? false : windowRecord.minimizable ?? globalOptions.minimizable,
          maximizable: windowRecord.maximizable ?? globalOptions.maximizable,
          closable: windowRecord.closable ?? globalOptions.closable,
          accentType: windowRecord.accentType ?? globalOptions.accentType ?? 'primary',
          bgColor: windowRecord.bgColor ?? globalOptions.bgColor,
          dockIndex: manager.getDockIndex(windowRecord.id),
          minimizeTo: dockTarget.value,
          maximizeTo: maximizeTarget.value,
          'onUpdate:modelValue': (visible: boolean) => manager.handleVisibilityChange(windowRecord.id, visible),
          onMinimizeStart: () => manager.handleMinimizeStart(windowRecord.id),
          onMinimize: () => manager.updateWindowState(windowRecord.id, 'minimized'),
          onMaximize: () => manager.updateWindowState(windowRecord.id, 'maximized'),
          onRestore: () => manager.updateWindowState(windowRecord.id, 'normal'),
          onGeometryChange: (rect: WindowGeometry) => manager.updateWindowGeometry(windowRecord.id, rect),
          onOutsideClick: (behavior: WindowOutsideClickBehavior) => manager.handleOutsideClick(windowRecord.id, behavior),
          onClosed: () => manager.handleClosed(windowRecord.id),
        }, {
          title: () => windowRecord.title,
          default: () => h(WindowContentHost, {
            windowRecord,
            api: options.api ?? manager.api,
            minimizedCount: manager.minimizedWindows.value.length,
            totalCount: manager.model.value.length,
          }),
        })
      })
    },
  })

  renderRoot.setAttribute('data-vue3-windows-renderer', '')
  document.body.appendChild(renderRoot)

  const vnode = h(Renderer)
  const appContext = createAppContextWithOwnerContext(options.ownerContext) ?? options.appContext
  if (appContext) {
    vnode.appContext = appContext
  }
  render(vnode, renderRoot)

  stopDockWatch = watchAnchorTarget(anchorTarget, dockTarget)
  stopMaximizeWatch = watchAnchorTarget(options.maximizeTarget ?? null, maximizeTarget)

  return {
    dispose() {
      stopDockWatch?.()
      stopDockWatch = null
      stopMaximizeWatch?.()
      stopMaximizeWatch = null
      render(null, renderRoot)
      renderRoot.remove()
    },
    isConnected() {
      return renderRoot.isConnected
    },
  }
}

function watchAnchorTarget(
  anchorTarget: WindowAnchorTarget | null | undefined,
  targetRef: ShallowRef<HTMLElement | null>,
) {
  if (typeof document === 'undefined') {
    targetRef.value = null
    return null
  }

  if (!anchorTarget) {
    targetRef.value = null
    return null
  }

  if (typeof anchorTarget === 'string') {
    targetRef.value = resolveAnchorElement(anchorTarget)
    return null
  }

  return watch(
    () => unref(anchorTarget),
    (anchor) => {
      targetRef.value = anchor instanceof HTMLElement ? anchor : null
    },
    {
      immediate: true,
      flush: 'post',
    },
  )
}

function resolveAnchorElement(selector: string) {
  const target = document.querySelector(selector)
  return target instanceof HTMLElement ? target : null
}
