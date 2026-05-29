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
import type { UseWindowsOptions, WindowAnchorTarget, WindowOutsideClickBehavior, WindowsSetupOptions } from '../types'
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
      return () => manager.model.value.map((item) => {
        const globalOptions = options.setupOptions?.value ?? {}

        return h(Window, {
          key: item.id,
          ref: (instance: Element | ComponentPublicInstance | null) => manager.setWindowRef(item.id, instance),
          modelValue: item.visible,
          title: item.title,
          windowId: item.id,
          animated: options.animated ?? globalOptions.animated ?? true,
          outsideClickBehavior: item.outsideClickBehavior ?? globalOptions.outsideClickBehavior,
          width: item.width ?? globalOptions.width,
          height: item.height ?? globalOptions.height,
          minWidth: item.minWidth ?? globalOptions.minWidth,
          minHeight: item.minHeight ?? globalOptions.minHeight,
          maxWidth: item.maxWidth ?? globalOptions.maxWidth,
          maxHeight: item.maxHeight ?? globalOptions.maxHeight,
          minimizable: options.minimizable === false ? false : item.minimizable ?? globalOptions.minimizable,
          maximizable: item.maximizable ?? globalOptions.maximizable,
          closable: item.closable ?? globalOptions.closable,
          accentType: item.accentType ?? globalOptions.accentType ?? 'primary',
          bgColor: item.bgColor ?? globalOptions.bgColor,
          dockIndex: manager.getDockIndex(item.id),
          minimizeTo: dockTarget.value,
          maximizeTo: maximizeTarget.value,
          'onUpdate:modelValue': (visible: boolean) => manager.handleVisibilityChange(item.id, visible),
          onMinimizeStart: () => manager.handleMinimizeStart(item.id),
          onMinimize: () => manager.updateWindowState(item.id, 'minimized'),
          onMaximize: () => manager.updateWindowState(item.id, 'maximized'),
          onRestore: () => manager.updateWindowState(item.id, 'normal'),
          onOutsideClick: (behavior: WindowOutsideClickBehavior) => manager.handleOutsideClick(item.id, behavior),
          onClosed: () => manager.handleClosed(item.id),
        }, {
          title: () => item.title,
          default: () => h(WindowContentHost, {
            item,
            api: options.api ?? manager.api,
            minimizedCount: manager.minimizedItems.value.length,
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
