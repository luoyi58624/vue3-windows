import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'

import { useCurrentWindow, useWindows, windowSetup } from '../src'
import type { WindowsRef } from '../src'

const RUNTIME_KEY = '__window_dialog_runtime__'

const configReset = {
  outsideClickBehavior: undefined,
  width: undefined,
  height: undefined,
  minWidth: undefined,
  minHeight: undefined,
  maxWidth: undefined,
  maxHeight: undefined,
  minimizable: undefined,
  maximizable: undefined,
  closable: undefined,
  accentType: undefined,
  bgColor: undefined,
}

function resetWindowRuntime() {
  delete (globalThis as Record<string, unknown>)[RUNTIME_KEY]
  document.body.innerHTML = ''
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
  windowSetup(configReset)
}

function findPanelByText(text: string) {
  return Array.from(document.body.querySelectorAll('.window-dialog')).find((panel) =>
    panel.textContent?.includes(text),
  ) as HTMLElement | undefined
}

async function flushWindows() {
  await nextTick()
  await nextTick()
}

const ActionWindow = defineComponent({
  name: 'ActionWindow',
  setup() {
    const currentWindow = useCurrentWindow()

    return () =>
      h('div', { class: 'action-window' }, [
        h('button', { class: 'action-maximize', type: 'button', onClick: currentWindow.maximize }, 'maximize'),
        h('button', { class: 'action-restore', type: 'button', onClick: currentWindow.restore }, 'restore'),
        h('button', { class: 'action-minimize', type: 'button', onClick: currentWindow.minimize }, 'minimize'),
        h('button', {
          class: 'action-update',
          type: 'button',
          onClick: () => currentWindow.update({ title: 'Updated' }),
        }, 'update'),
        h('button', { class: 'action-close', type: 'button', onClick: currentWindow.close }, 'close'),
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
    const windows = useWindows()
    props.bind(windows)

    return () => h('div')
  },
})

describe('window manager state', () => {
  beforeEach(() => {
    resetWindowRuntime()
  })

  it('minimizes without closing and restores through moveTop', async () => {
    let windows: WindowsRef | null = null
    mount(BindWindows, {
      props: {
        bind: (api: WindowsRef) => {
          windows = api
        },
      },
    })

    await flushWindows()
    windows?.create({
      id: 'alpha',
      title: 'Alpha',
      component: ActionWindow,
    })
    await flushWindows()

    expect(findPanelByText('Alpha')).toBeDefined()

    windows?.minimize('alpha')
    await flushWindows()

    expect(windows?.get('alpha')?.state).toBe('minimized')
    expect(windows?.windows.value).toHaveLength(1)
    expect(findPanelByText('Alpha')).toBeUndefined()

    windows?.moveTop('alpha')
    await flushWindows()

    expect(windows?.get('alpha')?.state).toBe('normal')
    expect(findPanelByText('Alpha')).toBeDefined()
  })

  it('restores a maximized window back to maximized after minimize', async () => {
    let windows: WindowsRef | null = null
    mount(BindWindows, {
      props: {
        bind: (api: WindowsRef) => {
          windows = api
        },
      },
    })

    await flushWindows()
    windows?.create({
      id: 'max',
      title: 'Max',
      component: ActionWindow,
    })
    await flushWindows()

    windows?.setState('max', 'maximized')
    await flushWindows()
    windows?.setState('max', 'minimized')
    await flushWindows()

    expect(windows?.get('max')?.state).toBe('minimized')

    windows?.moveTop('max')
    await flushWindows()

    expect(windows?.get('max')?.state).toBe('maximized')
    expect(findPanelByText('Max')?.classList.contains('window-dialog--maximized')).toBe(true)
  })

  it('restores a maximized window and keeps dragging from the title bar', async () => {
    let windows: WindowsRef | null = null
    mount(BindWindows, {
      props: {
        bind: (api: WindowsRef) => {
          windows = api
        },
      },
    })

    await flushWindows()
    windows?.create({
      id: 'drag-max',
      title: 'Drag Max',
      component: ActionWindow,
      width: 560,
      height: 360,
    })
    await flushWindows()

    windows?.setState('drag-max', 'maximized')
    await flushWindows()

    const panel = findPanelByText('Drag Max')
    const header = panel?.querySelector<HTMLElement>('.window-dialog__header')
    expect(header).toBeDefined()

    header?.dispatchEvent(new MouseEvent('mousedown', {
      bubbles: true,
      button: 0,
      clientX: 480,
      clientY: 20,
    }))
    document.dispatchEvent(new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 620,
      clientY: 96,
    }))

    await flushWindows()
    expect(document.body.querySelector('.window-dialog__resize-handle')).toBeNull()

    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    await flushWindows()

    const windowRecord = windows?.get('drag-max')
    expect(windowRecord?.state).toBe('normal')
    expect(windowRecord?.rect?.left).toBeGreaterThan(250)
    expect(windowRecord?.rect?.top).toBeGreaterThan(40)
    expect(document.body.querySelector('.window-dialog__resize-handle')).not.toBeNull()
  })

  it('does not restore a maximized window on title bar click', async () => {
    let windows: WindowsRef | null = null
    mount(BindWindows, {
      props: {
        bind: (api: WindowsRef) => {
          windows = api
        },
      },
    })

    await flushWindows()
    windows?.create({
      id: 'click-max',
      title: 'Click Max',
      component: ActionWindow,
    })
    await flushWindows()

    windows?.setState('click-max', 'maximized')
    await flushWindows()

    const header = findPanelByText('Click Max')?.querySelector<HTMLElement>('.window-dialog__header')
    expect(header).toBeDefined()

    header?.dispatchEvent(new MouseEvent('mousedown', {
      bubbles: true,
      button: 0,
      clientX: 480,
      clientY: 20,
    }))
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    await flushWindows()

    expect(windows?.get('click-max')?.state).toBe('maximized')
  })

  it('toggles maximize and restore on title bar double click', async () => {
    let windows: WindowsRef | null = null
    mount(BindWindows, {
      props: {
        bind: (api: WindowsRef) => {
          windows = api
        },
      },
    })

    await flushWindows()
    windows?.create({
      id: 'double-click',
      title: 'Double Click',
      component: ActionWindow,
    })
    await flushWindows()

    const header = findPanelByText('Double Click')?.querySelector<HTMLElement>('.window-dialog__header')
    expect(header).toBeDefined()

    header?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    await flushWindows()
    expect(windows?.get('double-click')?.state).toBe('maximized')

    header?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    await flushWindows()
    expect(windows?.get('double-click')?.state).toBe('normal')
  })

  it('maps outsideClickBehavior minimize to the minimized state', async () => {
    let windows: WindowsRef | null = null
    mount(BindWindows, {
      props: {
        bind: (api: WindowsRef) => {
          windows = api
        },
      },
    })

    await flushWindows()
    windows?.create({
      id: 'outside',
      title: 'Outside',
      component: ActionWindow,
      outsideClickBehavior: 'minimize',
    })
    await flushWindows()

    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    await flushWindows()

    expect(windows?.get('outside')?.state).toBe('minimized')
    expect(findPanelByText('Outside')).toBeUndefined()
  })

  it('lets useCurrentWindow update state and close the current window', async () => {
    let windows: WindowsRef | null = null
    mount(BindWindows, {
      props: {
        bind: (api: WindowsRef) => {
          windows = api
        },
      },
    })

    await flushWindows()
    windows?.create({
      id: 'current',
      title: 'Current',
      component: ActionWindow,
    })
    await flushWindows()

    document.body.querySelector<HTMLButtonElement>('.action-maximize')?.click()
    await flushWindows()
    expect(windows?.get('current')?.state).toBe('maximized')

    document.body.querySelector<HTMLButtonElement>('.action-restore')?.click()
    await flushWindows()
    expect(windows?.get('current')?.state).toBe('normal')

    document.body.querySelector<HTMLButtonElement>('.action-update')?.click()
    await flushWindows()
    expect(windows?.get('current')?.title).toBe('Updated')

    document.body.querySelector<HTMLButtonElement>('.action-minimize')?.click()
    await flushWindows()
    expect(windows?.get('current')?.state).toBe('minimized')
    expect(findPanelByText('Updated')).toBeUndefined()

    windows?.moveTop('current')
    await flushWindows()
    document.body.querySelector<HTMLButtonElement>('.action-close')?.click()
    await flushWindows()

    expect(windows?.get('current')).toBeUndefined()
  })
})
