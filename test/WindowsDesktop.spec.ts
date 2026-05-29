import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'

import { useCurrentWindow, WindowProvider, WindowsDesktop } from '../src'
import type { WindowsDesktopRef } from '../src'

const RUNTIME_KEY = '__window_dialog_runtime__'
const RECT_KEY = '__window_dialog_last_rect__'

function resetWindowRuntime() {
  delete (globalThis as Record<string, unknown>)[RUNTIME_KEY]
  window.localStorage.removeItem(RECT_KEY)
  document.body.innerHTML = ''
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

const DesktopWindowContent = defineComponent({
  name: 'DesktopWindowContent',
  setup() {
    const currentWindow = useCurrentWindow()

    return () =>
      h('div', { class: 'desktop-window-content' }, [
        h('button', { class: 'content-minimize', type: 'button', onClick: currentWindow.minimize }, 'minimize'),
      ])
  },
})

const DesktopHost = defineComponent({
  name: 'DesktopHost',
  setup() {
    const desktopRef = ref<WindowsDesktopRef | null>(null)

    function openWindow() {
      desktopRef.value?.create({
        id: 'desktop-window',
        title: 'Desktop Window',
        component: DesktopWindowContent,
      })
    }

    return {
      desktopRef,
      openWindow,
    }
  },
  components: {
    WindowsDesktop,
  },
  template: `
    <WindowsDesktop ref="desktopRef" class="desktop-host">
      <button class="open-window" type="button" @click="openWindow">open</button>
      <template #dock-left>
        <button class="dock-start" type="button">Start</button>
      </template>
      <template #dock-right>
        <span class="dock-clock">12:00</span>
      </template>
    </WindowsDesktop>
  `,
})

const NoAnimationDesktopHost = defineComponent({
  name: 'NoAnimationDesktopHost',
  setup() {
    const desktopRef = ref<WindowsDesktopRef | null>(null)

    function openWindow() {
      desktopRef.value?.create({
        id: 'desktop-no-animation',
        title: 'Desktop No Animation',
        component: DesktopWindowContent,
      })
    }

    return {
      desktopRef,
      openWindow,
    }
  },
  components: {
    WindowsDesktop,
  },
  template: `
    <WindowsDesktop ref="desktopRef" :animated="false" class="desktop-host">
      <button class="open-window" type="button" @click="openWindow">open</button>
    </WindowsDesktop>
  `,
})

const ProviderDesktopHost = defineComponent({
  name: 'ProviderDesktopHost',
  setup() {
    const desktopRef = ref<WindowsDesktopRef | null>(null)

    function openWindow() {
      desktopRef.value?.create({
        id: 'provider-desktop',
        title: 'Provider Desktop',
      })
    }

    return {
      desktopRef,
      openWindow,
    }
  },
  components: {
    WindowProvider,
    WindowsDesktop,
  },
  template: `
    <WindowProvider :animated="false" :width="680" :height="380">
      <WindowsDesktop ref="desktopRef" class="desktop-host">
        <button class="open-window" type="button" @click="openWindow">open</button>
      </WindowsDesktop>
    </WindowProvider>
  `,
})

describe('WindowsDesktop', () => {
  beforeEach(() => {
    resetWindowRuntime()
  })

  it('exposes the window API through a component ref and renders dock slots', async () => {
    const wrapper = mount(DesktopHost, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      await wrapper.get('.open-window').trigger('click')
      await nextTick()
      await nextTick()

      expect(findPanelByText('Desktop Window')).toBeDefined()
      expect(wrapper.vm.desktopRef?.items).toHaveLength(1)
      expect(wrapper.find('.dock-start').exists()).toBe(true)
      expect(wrapper.find('.dock-clock').exists()).toBe(true)
      expect(wrapper.find('.windows-dock-task').exists()).toBe(false)
    } finally {
      wrapper.unmount()
    }
  })

  it('minimizes into the desktop dock and restores when the task is clicked', async () => {
    const wrapper = mount(DesktopHost, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      await wrapper.get('.open-window').trigger('click')
      await nextTick()
      await nextTick()

      wrapper.vm.desktopRef?.minimize('desktop-window')
      await nextTick()
      await wait(260)
      await nextTick()

      expect(findPanelByText('Desktop Window')).toBeUndefined()
      expect(wrapper.vm.desktopRef?.get('desktop-window')?.state).toBe('minimized')

      const task = wrapper.get('.windows-dock-task')
      expect(task.attributes('data-vue3-windows-dock-task')).toBe('')
      expect(task.attributes('data-vue3-windows-window-id')).toBe('desktop-window')

      await wrapper.get('.windows-dock-task').trigger('click')
      await nextTick()
      await wait(260)
      await nextTick()

      expect(findPanelByText('Desktop Window')).toBeDefined()
      expect(wrapper.vm.desktopRef?.get('desktop-window')?.state).toBe('normal')
    } finally {
      wrapper.unmount()
    }
  })

  it('supports hideAll and showAll from the ref API', async () => {
    const wrapper = mount(DesktopHost, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      await wrapper.get('.open-window').trigger('click')
      await nextTick()
      await nextTick()

      wrapper.vm.desktopRef?.hideAll()
      await nextTick()
      await wait(260)
      await nextTick()

      expect(findPanelByText('Desktop Window')).toBeUndefined()
      expect(wrapper.vm.desktopRef?.items.every((item) => !item.visible)).toBe(true)

      wrapper.vm.desktopRef?.showAll()
      await nextTick()
      await wait(260)
      await nextTick()

      expect(findPanelByText('Desktop Window')).toBeDefined()
      expect(wrapper.vm.desktopRef?.items.every((item) => item.visible)).toBe(true)
    } finally {
      wrapper.unmount()
    }
  })

  it('passes animated false to managed windows', async () => {
    const wrapper = mount(NoAnimationDesktopHost, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      await wrapper.get('.open-window').trigger('click')
      await nextTick()
      await nextTick()

      const panel = findPanelByText('Desktop No Animation')
      expect(panel).toBeDefined()
      expect(panel?.style.getPropertyValue('--window-dialog-motion-ms')).toBe('0ms')
      expect(panel?.style.getPropertyValue('--window-dialog-fade-ms')).toBe('0ms')
    } finally {
      wrapper.unmount()
    }
  })

  it('maximizes to the viewport by default', async () => {
    const wrapper = mount(NoAnimationDesktopHost, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      await wrapper.get('.open-window').trigger('click')
      await nextTick()
      await nextTick()

      wrapper.vm.desktopRef?.setState('desktop-no-animation', 'maximized')
      await nextTick()
      await nextTick()

      const panel = findPanelByText('Desktop No Animation')
      expect(panel).toBeDefined()
      expect(panel?.style.left).toBe('0px')
      expect(panel?.style.top).toBe('0px')
      expect(panel?.style.width).toBe(`${window.innerWidth}px`)
      expect(panel?.style.height).toBe(`${window.innerHeight}px`)
    } finally {
      wrapper.unmount()
    }
  })

  it('uses WindowProvider defaults from WindowsDesktop', async () => {
    const wrapper = mount(ProviderDesktopHost, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      await wrapper.get('.open-window').trigger('click')
      await nextTick()
      await nextTick()

      const panel = findPanelByText('Provider Desktop')
      expect(panel).toBeDefined()
      expect(panel?.style.width).toBe('680px')
      expect(panel?.style.height).toBe('380px')
      expect(panel?.style.getPropertyValue('--window-dialog-motion-ms')).toBe('0ms')
    } finally {
      wrapper.unmount()
    }
  })

  it('scrolls minimized windows horizontally with the desktop dock mouse wheel', async () => {
    const wrapper = mount(DesktopHost, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      await wrapper.get('.open-window').trigger('click')
      await nextTick()
      await nextTick()

      wrapper.vm.desktopRef?.minimize('desktop-window')
      await nextTick()
      await wait(260)
      await nextTick()

      const scroller = wrapper.find('[data-vue3-windows-dock-scroller]').element as HTMLElement
      expect(scroller.scrollLeft).toBe(0)

      scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: 48, bubbles: true, cancelable: true }))
      expect(scroller.scrollLeft).toBe(48)
    } finally {
      wrapper.unmount()
    }
  })
})
