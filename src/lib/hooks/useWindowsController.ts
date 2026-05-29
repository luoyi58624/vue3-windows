import {
  defineComponent,
  getCurrentInstance,
  h,
  onMounted,
  onScopeDispose,
  render,
  shallowRef,
  unref,
  watch,
  type ComponentPublicInstance,
  type ShallowRef,
} from 'vue'

import Window from '../components/Window.vue'
import WindowContentHost from '../components/WindowContentHost'
import { useWindowsSetupOptions } from './setupWindows'
import { useWindowsManager } from './useWindowsManager'
import type { UseWindowsOptions, WindowAnchorTarget, WindowOutsideClickBehavior, WindowsRef } from '../types'

export function useWindowsController(
  anchorTarget: WindowAnchorTarget | null,
  options: UseWindowsOptions = {},
): WindowsRef {
  const manager = useWindowsManager()
  const setupOptions = useWindowsSetupOptions()
  const dockTarget = shallowRef<HTMLElement | null>(null)
  const maximizeTarget = shallowRef<HTMLElement | null>(null)
  const currentInstance = getCurrentInstance()

  let renderRoot: HTMLDivElement | null = null
  let stopDockWatch: (() => void) | null = null
  let stopMaximizeWatch: (() => void) | null = null

  const Renderer = defineComponent({
    name: 'WindowsControllerRenderer',
    setup() {
      return () => manager.model.value.map((item) => {
        const globalOptions = setupOptions.value

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
            api: manager.api,
            minimizedCount: manager.minimizedItems.value.length,
            totalCount: manager.model.value.length,
          }),
        })
      })
    },
  })

  onMounted(() => {
    if (typeof document === 'undefined') {
      return
    }

    renderRoot = document.createElement('div')
    renderRoot.setAttribute('data-vue3-windows-renderer', '')
    document.body.appendChild(renderRoot)

    const vnode = h(Renderer)
    if (currentInstance?.appContext) {
      vnode.appContext = currentInstance.appContext
    }
    render(vnode, renderRoot)

    stopDockWatch = watchAnchorTarget(anchorTarget, dockTarget)
    stopMaximizeWatch = watchAnchorTarget(options.maximizeTarget ?? null, maximizeTarget)
  })

  onScopeDispose(() => {
    stopDockWatch?.()
    stopDockWatch = null
    stopMaximizeWatch?.()
    stopMaximizeWatch = null
    manager.api.closeAll()

    if (renderRoot) {
      render(null, renderRoot)
      renderRoot.remove()
      renderRoot = null
    }
  })

  return manager.api
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
