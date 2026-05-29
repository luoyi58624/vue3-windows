import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'

import { useCurrentWindow, useWindows, WindowsDesktop } from '../src'

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

function getWindowsItems(windows: ReturnType<typeof useWindows> | null) {
  const items = windows?.items as unknown
  return Array.isArray(items) ? items : windows?.items.value ?? []
}

const ActionWindow = defineComponent({
  name: 'ActionWindow',
  setup() {
    const currentWindow = useCurrentWindow()

    return () =>
      h('div', { class: 'action-window' }, [
        h(
          'button',
          {
            class: 'action-movetop',
            type: 'button',
            onClick: currentWindow.moveTop,
          },
          'moveTop',
        ),
        h(
          'button',
          {
            class: 'action-maximize',
            type: 'button',
            onClick: currentWindow.maximize,
          },
          'maximize',
        ),
        h(
          'button',
          {
            class: 'action-restore',
            type: 'button',
            onClick: currentWindow.restore,
          },
          'restore',
        ),
        h(
          'button',
          {
            class: 'action-hide',
            type: 'button',
            onClick: currentWindow.hide,
          },
          'hide',
        ),
        h(
          'button',
          {
            class: 'action-show',
            type: 'button',
            onClick: currentWindow.show,
          },
          'show',
        ),
        h(
          'button',
          {
            class: 'action-minimize',
            type: 'button',
            onClick: currentWindow.minimize,
          },
          'minimize',
        ),
        h(
          'button',
          {
            class: 'action-close',
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
  name: 'UseCurrentWindowHost',
  setup() {
    const windows = ref<ReturnType<typeof useWindows> | null>(null)

    function bindWindows() {
      windows.value = useWindows()
    }

    function openFirst() {
      windows.value?.create({
        id: 'first',
        title: 'First',
        component: ActionWindow,
      })
    }

    function openSecond() {
      windows.value?.create({
        id: 'second',
        title: 'Second',
        component: ActionWindow,
      })
    }

    return {
      windows,
      bindWindows,
      openFirst,
      openSecond,
    }
  },
  components: {
    BindWindows,
    WindowsDesktop,
  },
  template: `
    <WindowsDesktop class="workspace">
      <BindWindows :bind="bindWindows" />
      <button class="open-first" type="button" @click="openFirst">open first</button>
      <button class="open-second" type="button" @click="openSecond">open second</button>
    </WindowsDesktop>
  `,
})

describe('useCurrentWindow', () => {
  beforeEach(() => {
    resetWindowRuntime()
  })

  it('controls the current window from inside the content component', async () => {
    const wrapper = mount(Host, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      await wrapper.get('.open-first').trigger('click')
      await wrapper.get('.open-second').trigger('click')
      await nextTick()
      await nextTick()

      const firstPanel = findPanelByText('First')
      const secondPanel = findPanelByText('Second')
      expect(firstPanel).toBeDefined()
      expect(secondPanel).toBeDefined()
      expect(firstPanel?.classList.contains('window-dialog--active')).toBe(false)
      expect(secondPanel?.classList.contains('window-dialog--active')).toBe(true)

      const moveTopButton = firstPanel!.querySelector('.action-movetop') as HTMLButtonElement
      moveTopButton.click()
      await nextTick()

      expect(firstPanel?.classList.contains('window-dialog--active')).toBe(true)
      expect(secondPanel?.classList.contains('window-dialog--active')).toBe(false)
      expect(Number.parseInt(firstPanel!.style.zIndex, 10)).toBeGreaterThan(
        Number.parseInt(secondPanel!.style.zIndex, 10),
      )

      const maximizeButton = firstPanel!.querySelector('.action-maximize') as HTMLButtonElement
      maximizeButton.click()
      await nextTick()
      await wait(260)
      await nextTick()

      const maximizedPanel = findPanelByText('First')
      expect(maximizedPanel?.classList.contains('window-dialog--maximized')).toBe(true)

      const restoreButton = maximizedPanel!.querySelector('.action-restore') as HTMLButtonElement
      restoreButton.click()
      await nextTick()
      await wait(260)
      await nextTick()

      const restoredPanel = findPanelByText('First')
      expect(restoredPanel?.classList.contains('window-dialog--maximized')).toBe(false)

      const closeButton = restoredPanel!.querySelector('.action-close') as HTMLButtonElement
      closeButton.click()
      await nextTick()

      expect(getWindowsItems(wrapper.vm.windows)).toHaveLength(1)
      expect(findPanelByText('First')).toBeUndefined()
    } finally {
      wrapper.unmount()
    }
  })

  it('can hide and show the current window and minimize it into the local dock', async () => {
    const wrapper = mount(Host, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      await wrapper.get('.open-first').trigger('click')
      await nextTick()
      await nextTick()

      const panel = findPanelByText('First')
      expect(panel).toBeDefined()

      const hideButton = panel!.querySelector('.action-hide') as HTMLButtonElement
      hideButton.click()
      await nextTick()
      await wait(260)
      await nextTick()

      expect(findPanelByText('First')).toBeUndefined()
      expect(getWindowsItems(wrapper.vm.windows)).toHaveLength(1)

      wrapper.vm.windows?.show('first')
      await nextTick()
      await wait(260)
      await nextTick()

      const restoredPanel = findPanelByText('First')
      expect(restoredPanel).toBeDefined()

      const minimizeButton = restoredPanel!.querySelector('.action-minimize') as HTMLButtonElement
      minimizeButton.click()
      await nextTick()
      await wait(260)
      await nextTick()

      const dock = wrapper.find('[data-vue3-windows-dock-track]').element.querySelector('.windows-dock-task') as HTMLElement | null

      expect(dock).toBeDefined()
      expect(dock?.textContent).toContain('First')
      expect(findPanelByText('First')).toBeUndefined()
    } finally {
      wrapper.unmount()
    }
  })

  it('restores a minimized window when moving it to the top', async () => {
    const wrapper = mount(Host, {
      attachTo: document.body,
    })

    try {
      await nextTick()
      await nextTick()

      await wrapper.get('.open-first').trigger('click')
      await nextTick()
      await nextTick()

      const panel = findPanelByText('First')
      expect(panel).toBeDefined()

      const minimizeButton = panel!.querySelector('.action-minimize') as HTMLButtonElement
      minimizeButton.click()
      await nextTick()
      await wait(260)
      await nextTick()

      expect(findPanelByText('First')).toBeUndefined()
      expect(wrapper.vm.windows?.get('first')?.state).toBe('minimized')

      wrapper.vm.windows?.moveTop('first')
      await nextTick()
      await wait(260)
      await nextTick()

      const restoredPanel = findPanelByText('First')
      expect(restoredPanel).toBeDefined()
      expect(restoredPanel?.classList.contains('window-dialog--active')).toBe(true)
      expect(wrapper.vm.windows?.get('first')?.state).toBe('normal')
    } finally {
      wrapper.unmount()
    }
  })
})
