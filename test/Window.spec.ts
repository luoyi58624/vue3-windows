import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'

import { globalWindow, useCurrentWindow, useWindows, WindowProvider, WindowsDesktop } from '../src'
import WindowDialog from '../src/lib/components/Window.vue'

const RUNTIME_KEY = '__window_dialog_runtime__'
const RECT_KEY = '__window_dialog_last_rect__'

function resetWindowRuntime() {
  globalWindow.closeAll()
  delete (globalThis as Record<string, unknown>)[RUNTIME_KEY]
  window.localStorage.removeItem(RECT_KEY)
  document.body.innerHTML = ''
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function findPanelByText(text: string) {
  return Array.from(document.body.querySelectorAll('.window-dialog')).find((panel) =>
    panel.textContent?.includes(text),
  ) as HTMLElement | undefined
}

function getWindowsItems(windows: ReturnType<typeof useWindows> | null) {
  const items = windows?.items as unknown
  return Array.isArray(items) ? items : windows?.items.value ?? []
}

const WindowContent = defineComponent({
  name: 'WindowContent',
  setup() {
    const currentWindow = useCurrentWindow()

    return () =>
      h('div', { class: 'window-content' }, [
        h(
          'button',
          {
            class: 'content-minimize',
            type: 'button',
            onClick: currentWindow.minimize,
          },
          'minimize',
        ),
        h(
          'button',
          {
            class: 'content-close',
            type: 'button',
            onClick: currentWindow.close,
          },
          'close',
        ),
      ])
  },
})

const BindWindows = defineComponent({
  name: 'BindWindows',
  props: {
    bind: {
      type: Function,
      required: true,
    },
  },
  setup(props) {
    props.bind()
    return () => null
  },
})

const Host = defineComponent({
  name: 'UseWindowsHost',
  setup() {
    const windows = ref<ReturnType<typeof useWindows> | null>(null)

    function bindWindows() {
      windows.value = useWindows()
    }

    function openWindow() {
      windows.value?.create({
        id: 'alpha',
        title: 'Alpha',
        component: WindowContent,
      })
    }

    return {
      windows,
      bindWindows,
      openWindow,
    }
  },
  components: {
    BindWindows,
    WindowsDesktop,
  },
  template: `
    <WindowsDesktop class="workspace">
      <BindWindows :bind="bindWindows" />
      <button class="open-window" type="button" @click="openWindow">open</button>
    </WindowsDesktop>
  `,
})

const NoAnimationHost = defineComponent({
  name: 'NoAnimationHost',
  setup() {
    const windows = ref<ReturnType<typeof useWindows> | null>(null)

    function bindWindows() {
      windows.value = useWindows()
    }

    function openWindow() {
      windows.value?.create({
        id: 'no-animation',
        title: 'No Animation',
        component: WindowContent,
      })
    }

    return {
      windows,
      bindWindows,
      openWindow,
    }
  },
  components: {
    BindWindows,
    WindowsDesktop,
  },
  template: `
    <WindowsDesktop :animated="false" class="workspace">
      <BindWindows :bind="bindWindows" />
      <button class="open-window" type="button" @click="openWindow">open</button>
    </WindowsDesktop>
  `,
})

const MaximizeAnchorHost = defineComponent({
  name: 'MaximizeAnchorHost',
  setup() {
    const windows = ref<ReturnType<typeof useWindows> | null>(null)

    function bindWindows() {
      windows.value = useWindows()
    }

    function openWindow() {
      windows.value?.create({
        id: 'anchored-maximize',
        title: 'Anchored Maximize',
        component: WindowContent,
      })
    }

    return {
      windows,
      bindWindows,
      openWindow,
    }
  },
  components: {
    BindWindows,
    WindowsDesktop,
  },
  template: `
    <WindowsDesktop :animated="false" class="workspace workspace__maximize-anchor" maximize-target=".workspace__maximize-anchor">
      <BindWindows :bind="bindWindows" />
      <button class="open-window" type="button" @click="openWindow">open</button>
    </WindowsDesktop>
  `,
})

const StandaloneHost = defineComponent({
  name: 'StandaloneHost',
  setup() {
    const windows = useWindows()

    function openWindow() {
      windows.create({
        id: 'standalone',
        title: 'Standalone',
        component: WindowContent,
      })
    }

    function openWithoutControls() {
      windows.create({
        id: 'without-controls',
        title: 'Without Controls',
        component: WindowContent,
        minimizable: false,
        maximizable: false,
        closable: false,
      })
    }

    return {
      windows,
      openWindow,
      openWithoutControls,
    }
  },
  template: `
    <section class="standalone-host">
      <button class="open-window" type="button" @click="openWindow">open</button>
      <button class="open-without-controls" type="button" @click="openWithoutControls">open without controls</button>
    </section>
  `,
})

const AutoHeightContent = defineComponent({
  name: 'AutoHeightContent',
  setup: () => () => h('div', { class: 'auto-height-content' }, 'auto height content'),
})

const TallAutoHeightContent = defineComponent({
  name: 'TallAutoHeightContent',
  setup: () => () => h('div', { class: 'tall-auto-height-content' }, 'tall auto height content'),
})

const VisibilityToggleHost = defineComponent({
  name: 'VisibilityToggleHost',
  components: {
    WindowDialog,
  },
  setup() {
    const visible = ref(false)

    function openWindow() {
      visible.value = true
    }

    return {
      visible,
      openWindow,
    }
  },
  template: `
    <button class="open-window" type="button" @click="openWindow">open</button>
    <WindowDialog v-model="visible" title="Visibility Toggle" />
  `,
})

const InitiallyVisibleWindowHost = defineComponent({
  name: 'InitiallyVisibleWindowHost',
  components: {
    WindowDialog,
  },
  setup() {
    const visible = ref(true)

    return {
      visible,
    }
  },
  template: '<WindowDialog v-model="visible" title="Initially Visible" />',
})

const ForcedStandaloneHost = defineComponent({
  name: 'ForcedStandaloneHost',
  setup() {
    const desktopWindows = ref<ReturnType<typeof useWindows> | null>(null)
    const standaloneWindows = ref<typeof globalWindow | null>(null)

    function bindWindows() {
      desktopWindows.value = useWindows()
      standaloneWindows.value = globalWindow
    }

    function openWindows() {
      desktopWindows.value?.create({
        id: 'desktop-owned',
        title: 'Desktop Owned',
        component: WindowContent,
      })
      standaloneWindows.value?.create({
        id: 'forced-standalone',
        title: 'Forced Standalone',
        component: WindowContent,
      })
    }

    return {
      desktopWindows,
      standaloneWindows,
      bindWindows,
      openWindows,
    }
  },
  components: {
    BindWindows,
    WindowsDesktop,
  },
  template: `
    <WindowsDesktop class="workspace">
      <BindWindows :bind="bindWindows" />
      <button class="open-window" type="button" @click="openWindows">open</button>
    </WindowsDesktop>
  `,
})

const ProviderHost = defineComponent({
  name: 'ProviderHost',
  setup() {
    const windows = useWindows()

    function openWindow() {
      windows.create({
        id: 'provider-window',
        title: 'Provider Window',
      })
    }

    function openOverrideWindow() {
      windows.create({
        id: 'override-window',
        title: 'Override Window',
        width: 480,
        height: 280,
        minWidth: 420,
        minHeight: 260,
        bgColor: '#f8fafc',
      })
    }

    return {
      windows,
      openWindow,
      openOverrideWindow,
    }
  },
  template: `
    <section>
      <button class="open-window" type="button" @click="openWindow">open</button>
      <button class="open-override-window" type="button" @click="openOverrideWindow">open override</button>
    </section>
  `,
})

const ProviderWrapper = defineComponent({
  name: 'ProviderWrapper',
  components: {
    ProviderHost,
    WindowProvider,
  },
  template: `
    <WindowProvider
      :animated="false"
      :width="640"
      :height="360"
      :min-width="520"
      :min-height="320"
      bg-color="#111827"
    >
      <ProviderHost />
    </WindowProvider>
  `,
})

describe('useWindows', () => {
  beforeEach(() => {
    resetWindowRuntime()
  })

  it('creates a window and docks minimized windows in the provided anchor', async () => {
    const wrapper = mount(Host, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      await wrapper.get('.open-window').trigger('click')
      await nextTick()
      await nextTick()

      const panel = findPanelByText('Alpha')
      expect(panel).toBeDefined()
      expect(wrapper.find('[data-vue3-windows-dock-track]').element.querySelector('.windows-dock-task')).toBeNull()

      const minimizeButton = document.body.querySelector('.content-minimize') as HTMLButtonElement | null
      expect(minimizeButton).toBeDefined()
      minimizeButton!.click()

      await nextTick()
      await wait(260)
      await nextTick()

      const dock = wrapper.find('[data-vue3-windows-dock-track]').element.querySelector('.windows-dock-task') as HTMLElement | null

      expect(dock).toBeDefined()
      expect(dock?.textContent).toContain('Alpha')
      expect(document.body.querySelector('.window-dialog')).toBeNull()
    } finally {
      wrapper.unmount()
    }
  })

  it('uses create width and height as the initial window size', async () => {
    const wrapper = mount(Host, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      wrapper.vm.windows?.create({
        id: 'sized',
        title: 'Sized',
        width: 720,
        height: 360,
        component: WindowContent,
      })

      await nextTick()
      await nextTick()

      const panel = findPanelByText('Sized')
      expect(panel).toBeDefined()
      expect(panel?.style.width).toBe('720px')
      expect(panel?.style.height).toBe('360px')
    } finally {
      wrapper.unmount()
    }
  })

  it('positions initially visible windows before the first rendered frame', async () => {
    const wrapper = mount(InitiallyVisibleWindowHost, {
      attachTo: document.body,
    })

    try {
      const panel = findPanelByText('Initially Visible')
      expect(panel).toBeDefined()
      expect(panel?.style.left).toBe(`${Math.round((window.innerWidth - 560) / 2)}px`)
      expect(panel?.style.top).toBe(`${Math.round(Math.max(0, (window.innerHeight - 420) / 2 - 24))}px`)
    } finally {
      wrapper.unmount()
    }
  })

  it('lets the browser size window height when height is not specified', async () => {
    const wrapper = mount(Host, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      wrapper.vm.windows?.create({
        id: 'auto-height',
        title: 'Auto Height',
        component: AutoHeightContent,
      })

      await nextTick()
      await nextTick()
      await nextTick()

      const panel = findPanelByText('Auto Height')
      expect(panel).toBeDefined()
      expect(panel?.style.height).toBe('')
      expect(panel?.style.minHeight).toBe('300px')
      expect(panel?.style.maxHeight).toBe(`${window.innerHeight - 32}px`)
    } finally {
      wrapper.unmount()
    }
  })

  it('caps auto height with maxHeight without setting a fixed height', async () => {
    const wrapper = mount(Host, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      wrapper.vm.windows?.create({
        id: 'capped-auto-height',
        title: 'Capped Auto Height',
        maxHeight: 300,
        component: TallAutoHeightContent,
      })

      await nextTick()
      await nextTick()
      await nextTick()

      const panel = findPanelByText('Capped Auto Height')
      expect(panel).toBeDefined()
      expect(panel?.style.height).toBe('')
      expect(panel?.style.maxHeight).toBe('300px')
    } finally {
      wrapper.unmount()
    }
  })

  it('keeps resize handles outside auto-height window edges', async () => {
    const wrapper = mount(Host, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      wrapper.vm.windows?.create({
        id: 'auto-height-resize-handles',
        title: 'Auto Height Resize Handles',
        component: AutoHeightContent,
      })

      await nextTick()
      await nextTick()
      await nextTick()

      const panel = findPanelByText('Auto Height Resize Handles')
      const surface = panel?.querySelector('.window-dialog__surface') as HTMLElement | null
      const southHandle = panel?.querySelector('.window-dialog__resize-handle--s') as HTMLElement | null
      const eastHandle = panel?.querySelector('.window-dialog__resize-handle--e') as HTMLElement | null

      expect(panel).toBeDefined()
      expect(surface).toBeDefined()
      expect(southHandle).toBeDefined()
      expect(eastHandle).toBeDefined()
      expect(southHandle?.closest('.window-dialog')).toBe(panel)
      expect(eastHandle?.closest('.window-dialog')).toBe(panel)
      expect(surface?.contains(southHandle)).toBe(false)
      expect(surface?.contains(eastHandle)).toBe(false)
    } finally {
      wrapper.unmount()
    }
  })

  it('uses the rendered auto-height size when resize starts', async () => {
    const wrapper = mount(Host, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      wrapper.vm.windows?.create({
        id: 'auto-height-resize-start',
        title: 'Auto Height Resize Start',
        component: AutoHeightContent,
      })

      await nextTick()
      await nextTick()
      await nextTick()

      const panel = findPanelByText('Auto Height Resize Start')
      const southHandle = panel?.querySelector('.window-dialog__resize-handle--s') as HTMLElement | null

      expect(panel).toBeDefined()
      expect(southHandle).toBeDefined()
      expect(panel?.style.height).toBe('')

      panel!.getBoundingClientRect = () => ({
        left: 120,
        top: 90,
        width: 560,
        height: 520,
        right: 680,
        bottom: 610,
        x: 120,
        y: 90,
        toJSON: () => ({}),
      } as DOMRect)

      southHandle!.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: 240,
        clientY: 610,
      }))
      await nextTick()

      expect(panel?.style.height).toBe('520px')
    } finally {
      wrapper.unmount()
    }
  })

  it('does not run the visibility animation on first open', async () => {
    const wrapper = mount(VisibilityToggleHost, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await wrapper.get('.open-window').trigger('click')
      await nextTick()
      await nextTick()

      const panel = findPanelByText('Visibility Toggle')
      expect(panel).toBeDefined()
      expect(panel?.classList.contains('window-dialog--animating')).toBe(false)
      expect(panel?.style.transform).toBe('')
    } finally {
      wrapper.unmount()
    }
  })

  it('keeps the window open when outsideClickBehavior is none', async () => {
    const wrapper = mount(Host, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      wrapper.vm.windows.create({
        id: 'outside-none',
        title: 'Outside None',
        outsideClickBehavior: 'none',
        component: WindowContent,
      })
      await nextTick()
      await nextTick()

      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
      await nextTick()

      expect(findPanelByText('Outside None')).toBeDefined()
      expect(getWindowsItems(wrapper.vm.windows)).toHaveLength(1)
    } finally {
      wrapper.unmount()
    }
  })

  it('hides the window when outsideClickBehavior is hide', async () => {
    const wrapper = mount(Host, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      wrapper.vm.windows?.create({
        id: 'outside-hide',
        title: 'Outside Hide',
        outsideClickBehavior: 'hide',
        component: WindowContent,
      })
      await nextTick()
      await nextTick()

      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
      await nextTick()
      await wait(260)
      await nextTick()

      expect(findPanelByText('Outside Hide')).toBeUndefined()
      expect(getWindowsItems(wrapper.vm.windows)).toHaveLength(1)
      expect(wrapper.vm.windows?.get('outside-hide')?.visible).toBe(false)
    } finally {
      wrapper.unmount()
    }
  })

  it('does not repeat minimize while the window is already minimized', async () => {
    const wrapper = mount(Host, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      wrapper.vm.windows?.create({
        id: 'repeat-minimize',
        title: 'Repeat Minimize',
        component: WindowContent,
      })
      await nextTick()
      await nextTick()

      wrapper.vm.windows?.minimize('repeat-minimize')
      await nextTick()
      await wait(260)
      await nextTick()

      const dockTrack = wrapper.find('[data-vue3-windows-dock-track]').element as HTMLElement
      expect(wrapper.vm.windows?.get('repeat-minimize')?.state).toBe('minimized')
      expect(dockTrack.querySelectorAll('.windows-dock-task')).toHaveLength(1)

      wrapper.vm.windows?.minimize('repeat-minimize')
      await nextTick()
      await wait(260)
      await nextTick()

      expect(wrapper.vm.windows?.get('repeat-minimize')?.state).toBe('minimized')
      expect(dockTrack.querySelectorAll('.windows-dock-task')).toHaveLength(1)
      expect(findPanelByText('Repeat Minimize')).toBeUndefined()
    } finally {
      wrapper.unmount()
    }
  })

  it('minimizes the window when outsideClickBehavior is minimize', async () => {
    const wrapper = mount(Host, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      wrapper.vm.windows?.create({
        id: 'outside-minimize',
        title: 'Outside Minimize',
        outsideClickBehavior: 'minimize',
        component: WindowContent,
      })
      await nextTick()
      await nextTick()

      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
      await nextTick()
      await wait(260)
      await nextTick()

      const dock = wrapper.find('[data-vue3-windows-dock-track]').element.querySelector('.windows-dock-task') as HTMLElement | null

      expect(findPanelByText('Outside Minimize')).toBeUndefined()
      expect(dock).toBeDefined()
      expect(dock?.textContent).toContain('Outside Minimize')
      expect(wrapper.vm.windows?.get('outside-minimize')?.state).toBe('minimized')
    } finally {
      wrapper.unmount()
    }
  })

  it('does not treat resize handles as outside clicks', async () => {
    const wrapper = mount(Host, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      wrapper.vm.windows?.create({
        id: 'resize-handle',
        title: 'Resize Handle',
        outsideClickBehavior: 'minimize',
        component: WindowContent,
      })
      await nextTick()
      await nextTick()

      const resizeHandle = document.body.querySelector('.window-dialog__resize-handle') as HTMLElement | null
      expect(resizeHandle).toBeDefined()

      resizeHandle!.dispatchEvent(new Event('pointerdown', { bubbles: true }))
      await nextTick()

      expect(findPanelByText('Resize Handle')).toBeDefined()
      expect(wrapper.vm.windows?.get('resize-handle')?.state).toBe('normal')
    } finally {
      wrapper.unmount()
    }
  })

  it('removes the window when outsideClickBehavior is remove', async () => {
    const wrapper = mount(Host, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      wrapper.vm.windows?.create({
        id: 'outside-remove',
        title: 'Outside Remove',
        outsideClickBehavior: 'remove',
        component: WindowContent,
      })
      await nextTick()
      await nextTick()

      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
      await nextTick()

      expect(findPanelByText('Outside Remove')).toBeUndefined()
      expect(wrapper.vm.windows?.get('outside-remove')).toBeUndefined()
    } finally {
      wrapper.unmount()
    }
  })

  it('hides and shows all windows through the windows api', async () => {
    const wrapper = mount(Host, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      wrapper.vm.windows?.create({
        id: 'dock-first',
        title: 'Dock First',
        component: WindowContent,
      })
      wrapper.vm.windows?.create({
        id: 'dock-second',
        title: 'Dock Second',
        component: WindowContent,
      })
      await nextTick()
      await nextTick()

      wrapper.vm.windows?.hideAll()
      await nextTick()
      await wait(260)
      await nextTick()

      expect(findPanelByText('Dock First')).toBeUndefined()
      expect(findPanelByText('Dock Second')).toBeUndefined()
      expect(getWindowsItems(wrapper.vm.windows)).toHaveLength(2)
      expect(getWindowsItems(wrapper.vm.windows).every((item) => !item.visible)).toBe(true)

      wrapper.vm.windows?.showAll()
      await nextTick()
      await wait(260)
      await nextTick()

      expect(findPanelByText('Dock First')).toBeDefined()
      expect(findPanelByText('Dock Second')).toBeDefined()
      expect(getWindowsItems(wrapper.vm.windows).every((item) => item.visible)).toBe(true)
    } finally {
      wrapper.unmount()
    }
  })

  it('disables minimize and hide animations when animated is false', async () => {
    const wrapper = mount(NoAnimationHost, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      await wrapper.get('.open-window').trigger('click')
      await nextTick()
      await nextTick()

      const panel = findPanelByText('No Animation')
      expect(panel).toBeDefined()
      expect(panel?.style.getPropertyValue('--window-dialog-motion-ms')).toBe('0ms')
      expect(panel?.style.getPropertyValue('--window-dialog-fade-ms')).toBe('0ms')

      wrapper.vm.windows?.minimize('no-animation')
      await nextTick()
      await nextTick()

      const dock = wrapper.find('[data-vue3-windows-dock-track]').element.querySelector('.windows-dock-task') as HTMLElement | null
      expect(dock).toBeDefined()
      expect(findPanelByText('No Animation')).toBeUndefined()

      wrapper.vm.windows?.moveTop('no-animation')
      await nextTick()
      await nextTick()
      expect(findPanelByText('No Animation')).toBeDefined()

      wrapper.vm.windows?.hide('no-animation')
      await nextTick()
      await nextTick()
      expect(findPanelByText('No Animation')).toBeUndefined()
    } finally {
      wrapper.unmount()
    }
  })

  it('maximizes to the configured maximize target', async () => {
    document.documentElement.style.overflow = 'auto'
    document.body.style.overflow = 'scroll'

    const wrapper = mount(MaximizeAnchorHost, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      const maximizeAnchor = wrapper.find('.workspace__maximize-anchor').element as HTMLElement
      maximizeAnchor.getBoundingClientRect = () => ({
        left: 40,
        top: 50,
        width: 640,
        height: 360,
        right: 680,
        bottom: 410,
        x: 40,
        y: 50,
        toJSON: () => ({}),
      } as DOMRect)

      await wrapper.get('.open-window').trigger('click')
      await nextTick()
      await nextTick()

      wrapper.vm.windows?.setState('anchored-maximize', 'maximized')
      await nextTick()
      await nextTick()

      const panel = findPanelByText('Anchored Maximize')
      expect(panel).toBeDefined()
      expect(panel?.style.left).toBe('40px')
      expect(panel?.style.top).toBe('50px')
      expect(panel?.style.width).toBe('640px')
      expect(panel?.style.height).toBe('360px')
      expect(document.documentElement.style.overflow).toBe('auto')
      expect(document.body.style.overflow).toBe('scroll')
    } finally {
      wrapper.unmount()
    }
  })

  it('locks document scrolling while a window is maximized to the viewport', async () => {
    document.documentElement.style.overflow = 'auto'
    document.body.style.overflow = 'scroll'

    const wrapper = mount(NoAnimationHost, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      await wrapper.get('.open-window').trigger('click')
      await nextTick()
      await nextTick()

      wrapper.vm.windows?.setState('no-animation', 'maximized')
      await nextTick()
      await nextTick()

      expect(document.documentElement.style.overflow).toBe('hidden')
      expect(document.body.style.overflow).toBe('hidden')

      wrapper.vm.windows?.setState('no-animation', 'normal')
      await nextTick()
      await nextTick()

      expect(document.documentElement.style.overflow).toBe('auto')
      expect(document.body.style.overflow).toBe('scroll')
    } finally {
      wrapper.unmount()
    }
  })

  it('creates standalone windows without WindowsDesktop and disables minimize controls', async () => {
    const wrapper = mount(StandaloneHost, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      await wrapper.get('.open-window').trigger('click')
      await nextTick()
      await nextTick()

      const panel = findPanelByText('Standalone')
      expect(panel).toBeDefined()
      expect(panel?.querySelector('[aria-label="最小化"]')).toBeNull()
      expect(panel?.querySelector('[aria-label="最大化"]')).toBeDefined()
      expect(panel?.querySelector('[aria-label="关闭"]')).toBeDefined()
    } finally {
      wrapper.unmount()
    }
  })

  it('renders blank content when a window has no component', async () => {
    const wrapper = mount(StandaloneHost, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      wrapper.vm.windows.create({
        id: 'blank-content',
        title: 'Blank Content',
      })
      await nextTick()
      await nextTick()

      const panel = findPanelByText('Blank Content')
      const body = panel?.querySelector('.window-dialog__body')

      expect(panel).toBeDefined()
      expect(body?.textContent?.trim()).toBe('')
    } finally {
      wrapper.unmount()
    }
  })

  it('uses WindowProvider defaults for created windows', async () => {
    const wrapper = mount(ProviderWrapper, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      await wrapper.get('.open-window').trigger('click')
      await nextTick()
      await nextTick()

      const panel = findPanelByText('Provider Window')

      expect(panel).toBeDefined()
      expect(panel?.style.width).toBe('640px')
      expect(panel?.style.height).toBe('360px')
      expect(panel?.style.getPropertyValue('--window-dialog-motion-ms')).toBe('0ms')
      expect(panel?.style.getPropertyValue('--window-dialog-bg-color')).toBe('#111827')
    } finally {
      wrapper.unmount()
    }
  })

  it('lets create options override WindowProvider defaults', async () => {
    const wrapper = mount(ProviderWrapper, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      await wrapper.get('.open-override-window').trigger('click')
      await nextTick()
      await nextTick()

      const panel = findPanelByText('Override Window')

      expect(panel).toBeDefined()
      expect(panel?.style.width).toBe('480px')
      expect(panel?.style.height).toBe('280px')
      expect(panel?.style.getPropertyValue('--window-dialog-bg-color')).toBe('#f8fafc')
    } finally {
      wrapper.unmount()
    }
  })

  it('allows create options to hide window control buttons', async () => {
    const wrapper = mount(StandaloneHost, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      await wrapper.get('.open-without-controls').trigger('click')
      await nextTick()
      await nextTick()

      const panel = findPanelByText('Without Controls')
      expect(panel).toBeDefined()
      expect(panel?.querySelector('[aria-label="最小化"]')).toBeNull()
      expect(panel?.querySelector('[aria-label="最大化"]')).toBeNull()
      expect(panel?.querySelector('[aria-label="关闭"]')).toBeNull()
    } finally {
      wrapper.unmount()
    }
  })

  it('can force standalone windows inside WindowsDesktop', async () => {
    const wrapper = mount(ForcedStandaloneHost, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      await wrapper.get('.open-window').trigger('click')
      await nextTick()
      await nextTick()

      expect(getWindowsItems(wrapper.vm.desktopWindows)).toHaveLength(1)
      expect(getWindowsItems(wrapper.vm.standaloneWindows)).toHaveLength(1)

      const desktopPanel = findPanelByText('Desktop Owned')
      const standalonePanel = findPanelByText('Forced Standalone')
      expect(desktopPanel?.querySelector('[aria-label="最小化"]')).toBeDefined()
      expect(standalonePanel?.querySelector('[aria-label="最小化"]')).toBeNull()
    } finally {
      wrapper.unmount()
    }
  })
})
