import {
  defineComponent,
  h,
  render,
  type AppContext,
  type ComponentPublicInstance,
} from 'vue'

import Window from '../components/Window.vue'
import WindowContentHost from '../components/WindowContentHost'
import type { UseWindowsOptions, WindowGeometry, WindowOutsideClickBehavior } from '../types'
import type { useWindowsManager } from './useWindowsManager'
import { getWindowSetupConfig } from './setupWindows'
import { createAppContextWithOwnerContext, type WindowOwnerContext } from './windowOwnerContext'

type WindowsManager = ReturnType<typeof useWindowsManager>

export interface WindowsRendererOptions extends UseWindowsOptions {
  appContext?: AppContext | null
  ownerContext?: WindowOwnerContext | null
  api?: WindowsManager['api']
}

export interface WindowsRendererHandle {
  dispose(): void
  isConnected(): boolean
}

export function mountWindowsRenderer(
  manager: WindowsManager,
  options: WindowsRendererOptions = {},
): WindowsRendererHandle | null {
  if (typeof document === 'undefined') {
    return null
  }

  const renderRoot = document.createElement('div')

  const Renderer = defineComponent({
    name: 'WindowsControllerRenderer',
    setup() {
      return () => manager.model.value
        .filter((windowRecord) => windowRecord.state !== 'minimized')
        .map((windowRecord) => {
          const globalOptions = getWindowSetupConfig()
          const outsideClickBehavior = windowRecord.outsideClickBehavior ?? options.outsideClickBehavior ?? globalOptions.outsideClickBehavior
          const width = windowRecord.width ?? options.width ?? globalOptions.width
          const height = windowRecord.height ?? options.height ?? globalOptions.height
          const minWidth = windowRecord.minWidth ?? options.minWidth ?? globalOptions.minWidth
          const minHeight = windowRecord.minHeight ?? options.minHeight ?? globalOptions.minHeight
          const maxWidth = windowRecord.maxWidth ?? options.maxWidth ?? globalOptions.maxWidth
          const maxHeight = windowRecord.maxHeight ?? options.maxHeight ?? globalOptions.maxHeight
          const minimizable = windowRecord.minimizable ?? options.minimizable ?? globalOptions.minimizable
          const maximizable = windowRecord.maximizable ?? options.maximizable ?? globalOptions.maximizable
          const closable = windowRecord.closable ?? options.closable ?? globalOptions.closable
          const accentType = windowRecord.accentType ?? options.accentType ?? globalOptions.accentType
          const bgColor = windowRecord.bgColor ?? options.bgColor ?? globalOptions.bgColor

          return h(Window, {
            key: windowRecord.id,
            ref: (instance: Element | ComponentPublicInstance | null) => manager.setWindowRef(windowRecord.id, instance),
            state: windowRecord.state,
            title: windowRecord.title,
            windowId: windowRecord.id,
            initialRect: windowRecord.rect,
            outsideClickBehavior,
            width,
            height,
            minWidth,
            minHeight,
            maxWidth,
            maxHeight,
            minimizable,
            maximizable,
            closable,
            accentType,
            bgColor,
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
              minimizedCount: manager.model.value.filter((record) => record.state === 'minimized').length,
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

  return {
    dispose() {
      render(null, renderRoot)
      renderRoot.remove()
    },
    isConnected() {
      return renderRoot.isConnected
    },
  }
}
