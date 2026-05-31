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
  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index)
    if (!key) {
      continue
    }
    if (key === 'vue3-windows:geometry' || key.startsWith('vue3-windows:geometry:')) {
      window.localStorage.removeItem(key)
    }
  }
  windowSetup(configReset)
}

function findPanelByText(text: string) {
  return Array.from(document.body.querySelectorAll('.window-dialog')).find((panel) =>
    panel.textContent?.includes(text) && (panel as HTMLElement).style.display !== 'none',
  ) as HTMLElement | undefined
}

function readGeometryStore() {
  const value = window.localStorage.getItem('vue3-windows:geometry')
  expect(value).not.toBeNull()
  return JSON.parse(value!)
}

async function flushWindows() {
  await nextTick()
  await nextTick()
}

async function waitForGeometryPersist() {
  await new Promise((resolve) => window.setTimeout(resolve, 150))
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

const AddWindow = defineComponent({
  name: 'add',
  setup() {
    return () => h('div', 'Add Window')
  },
})

let scrollWindowMounts = 0
const ScrollWindow = defineComponent({
  name: 'ScrollWindow',
  setup() {
    scrollWindowMounts += 1

    return () =>
      h('div', { class: 'scroll-window' }, [
        h('p', 'Scroll State'),
        h('div', { style: 'height: 1200px;' }, 'Scrollable content'),
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

const BindGroupedWindows = defineComponent({
  name: 'BindGroupedWindows',
  props: {
    bind: {
      type: Function,
      required: true,
    },
    groupId: {
      type: [String, Number],
      required: true,
    },
  },
  setup(props) {
    const windows = useWindows(props.groupId)
    props.bind(windows)

    return () => h('div')
  },
})

describe('window manager state', () => {
  beforeEach(() => {
    resetWindowRuntime()
    scrollWindowMounts = 0
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
    expect(document.body.textContent).toContain('Alpha')

    windows?.moveTop('alpha')
    await flushWindows()

    expect(windows?.get('alpha')?.state).toBe('normal')
    expect(findPanelByText('Alpha')).toBeDefined()
  })

  it('keeps minimized window content mounted and preserves scroll position when reopened', async () => {
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
      id: 'scroll-state',
      title: 'Scroll State',
      component: ScrollWindow,
      height: 320,
    })
    await flushWindows()

    const body = document.body.querySelector<HTMLElement>('.window-dialog__body')
    expect(body).not.toBeNull()
    body!.scrollTop = 180
    expect(scrollWindowMounts).toBe(1)

    windows?.minimize('scroll-state')
    await flushWindows()

    expect(findPanelByText('Scroll State')).toBeUndefined()
    expect(body?.isConnected).toBe(true)

    windows?.create({
      id: 'scroll-state',
      title: 'Scroll State',
      component: ScrollWindow,
    })
    await flushWindows()

    const reopenedBody = document.body.querySelector<HTMLElement>('.window-dialog__body')
    expect(reopenedBody).toBe(body)
    expect(reopenedBody?.scrollTop).toBe(180)
    expect(scrollWindowMounts).toBe(1)
    expect(findPanelByText('Scroll State')).toBeDefined()
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

  it('restores minimized windows through setState normal to their previous normal or maximized state', async () => {
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
      id: 'restore-normal',
      title: 'Restore Normal',
      component: ActionWindow,
    })
    windows?.create({
      id: 'restore-max',
      title: 'Restore Max',
      component: ActionWindow,
    })
    await flushWindows()

    windows?.minimize('restore-normal')
    windows?.setState('restore-max', 'maximized')
    await flushWindows()
    windows?.minimize('restore-max')
    await flushWindows()

    expect(windows?.get('restore-normal')?.state).toBe('minimized')
    expect(windows?.get('restore-max')?.state).toBe('minimized')

    windows?.setState('restore-normal', 'normal')
    windows?.setState('restore-max', 'normal')
    await flushWindows()

    expect(windows?.get('restore-normal')?.state).toBe('normal')
    expect(windows?.get('restore-max')?.state).toBe('maximized')
    expect(findPanelByText('Restore Max')?.classList.contains('window-dialog--maximized')).toBe(true)
  })

  it('keeps the normal rect through maximize minimize maximize restore', async () => {
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
      id: 'restore-size',
      title: 'Restore Size',
      component: ActionWindow,
      width: 520,
      height: 330,
    })
    await flushWindows()

    const normalRect = { ...windows!.get('restore-size')!.rect! }

    windows?.setState('restore-size', 'maximized')
    await flushWindows()
    windows?.minimize('restore-size')
    await flushWindows()
    windows?.moveTop('restore-size')
    await flushWindows()
    expect(windows?.get('restore-size')?.state).toBe('maximized')

    windows?.setState('restore-size', 'normal')
    await flushWindows()

    expect(windows?.get('restore-size')?.state).toBe('normal')
    expect(windows?.get('restore-size')?.rect).toEqual(normalRect)
  })

  it('opens a new window from the last normal window position', async () => {
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
      id: 'first-position',
      title: 'First Position',
      component: ActionWindow,
    })
    await flushWindows()

    const firstRect = { ...windows!.get('first-position')!.rect! }

    windows?.create({
      id: 'second-position',
      title: 'Second Position',
      component: ActionWindow,
    })
    await flushWindows()

    const secondRect = windows?.get('second-position')?.rect
    expect(secondRect?.left).toBe(firstRect.left + 28)
    expect(secondRect?.top).toBe(firstRect.top + 28)
  })

  it('reopens the same id with its cached normal rect unless create passes an explicit size', async () => {
    let windows: WindowsRef | null = null
    mount(BindWindows, {
      props: {
        bind: (api: WindowsRef) => {
          windows = api
        },
        options: {
          width: 640,
          height: 420,
        },
      },
    })

    await flushWindows()
    windows?.create({
      id: 'cached-size',
      title: 'Cached Size',
      component: ActionWindow,
      width: 520,
      height: 330,
    })
    await flushWindows()

    const firstRect = { ...windows!.get('cached-size')!.rect! }

    windows?.close('cached-size')
    await flushWindows()
    windows?.create({
      id: 'cached-size',
      title: 'Cached Size Reopen',
      component: ActionWindow,
    })
    await flushWindows()

    expect(windows?.get('cached-size')?.rect).toEqual(firstRect)

    windows?.close('cached-size')
    await flushWindows()
    windows?.create({
      id: 'cached-size',
      title: 'Cached Size Explicit',
      component: ActionWindow,
      width: 600,
      height: 360,
    })
    await flushWindows()

    expect(windows?.get('cached-size')?.rect?.left).toBe(firstRect.left)
    expect(windows?.get('cached-size')?.rect?.top).toBe(firstRect.top)
    expect(windows?.get('cached-size')?.rect?.width).toBe(600)
    expect(windows?.get('cached-size')?.rect?.height).toBe(360)
  })

  it('persists cached geometry in localStorage across managers', async () => {
    let firstWindows: WindowsRef | null = null
    const firstWrapper = mount(BindWindows, {
      props: {
        bind: (api: WindowsRef) => {
          firstWindows = api
        },
      },
    })

    await flushWindows()
    firstWindows?.create({
      id: 'persisted-window',
      title: 'Persisted Window',
      component: ActionWindow,
      width: 520,
      height: 330,
    })
    await flushWindows()

    const firstRect = { ...firstWindows!.get('persisted-window')!.rect! }
    firstWrapper.unmount()
    await flushWindows()

    expect(window.localStorage.getItem('vue3-windows:geometry')).toContain('string:persisted-window')

    let secondWindows: WindowsRef | null = null
    mount(BindWindows, {
      props: {
        bind: (api: WindowsRef) => {
          secondWindows = api
        },
      },
    })

    await flushWindows()
    secondWindows?.create({
      id: 'persisted-window',
      title: 'Persisted Window Reopen',
      component: ActionWindow,
    })
    await flushWindows()

    expect(secondWindows?.get('persisted-window')?.rect).toEqual(firstRect)
  })

  it('debounces geometry writes to localStorage', async () => {
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
      id: 'debounced-window',
      title: 'Debounced Window',
      component: ActionWindow,
      width: 520,
      height: 330,
    })
    await flushWindows()

    expect(window.localStorage.getItem('vue3-windows:geometry')).toBeNull()

    await waitForGeometryPersist()

    const rect = { ...windows!.get('debounced-window')!.rect! }
    const store = readGeometryStore()
    expect(store.windows_record.global['string:debounced-window']).toEqual(rect)
  })

  it('isolates cached geometry by useWindows group id', async () => {
    let firstWindows: WindowsRef | null = null
    const firstWrapper = mount(BindGroupedWindows, {
      props: {
        groupId: 'user',
        bind: (api: WindowsRef) => {
          firstWindows = api
        },
      },
    })

    await flushWindows()
    firstWindows?.create({
      id: 'shared-window',
      title: 'First Group',
      component: ActionWindow,
      width: 520,
      height: 330,
    })
    await flushWindows()

    const firstRect = { ...firstWindows!.get('shared-window')!.rect! }
    firstWrapper.unmount()
    await flushWindows()

    const firstStore = readGeometryStore()
    expect(firstStore.version).toBe(3)
    expect(firstStore.windows_record.first).toBeUndefined()
    expect(firstStore.windows_record.user['string:shared-window']).toEqual(firstRect)
    expect(firstStore.windows_record['string:user']).toBeUndefined()
    expect(firstStore.windows_record['string:shared-window']).toBeUndefined()
    expect(window.localStorage.getItem('vue3-windows:geometry:string:user')).toBeNull()

    let secondWindows: WindowsRef | null = null
    const secondWrapper = mount(BindGroupedWindows, {
      props: {
        groupId: 'menu',
        bind: (api: WindowsRef) => {
          secondWindows = api
        },
      },
    })

    await flushWindows()
    secondWindows?.create({
      id: 'shared-window',
      title: 'Second Group',
      component: ActionWindow,
    })
    await flushWindows()

    expect(secondWindows?.get('shared-window')?.rect?.width).not.toBe(firstRect.width)
    const secondRect = { ...secondWindows!.get('shared-window')!.rect! }
    await waitForGeometryPersist()
    const secondStore = readGeometryStore()
    expect(secondStore.windows_record.user['string:shared-window']).toEqual(firstRect)
    expect(secondStore.windows_record.menu['string:shared-window']).toEqual(secondRect)
    secondWrapper.unmount()
    await flushWindows()

    let reopenedFirstWindows: WindowsRef | null = null
    mount(BindGroupedWindows, {
      props: {
        groupId: 'user',
        bind: (api: WindowsRef) => {
          reopenedFirstWindows = api
        },
      },
    })

    await flushWindows()
    reopenedFirstWindows?.create({
      id: 'shared-window',
      title: 'First Group Reopen',
      component: ActionWindow,
    })
    await flushWindows()

    expect(reopenedFirstWindows?.get('shared-window')?.rect).toEqual(firstRect)
  })

  it('stores ungrouped window geometry under the global group', async () => {
    let windows: WindowsRef | null = null
    const wrapper = mount(BindWindows, {
      props: {
        bind: (api: WindowsRef) => {
          windows = api
        },
      },
    })

    await flushWindows()
    windows?.create({
      id: 'global-window',
      title: 'Global Window',
      component: ActionWindow,
      width: 520,
      height: 330,
    })
    await flushWindows()

    const rect = { ...windows!.get('global-window')!.rect! }
    wrapper.unmount()
    await flushWindows()

    const store = readGeometryStore()
    expect(store.windows_record.global['string:global-window']).toEqual(rect)
    expect(store.windows_record['string:global-window']).toBeUndefined()
  })

  it('moves flat cached geometry into the active useWindows group', async () => {
    window.localStorage.setItem(
      'vue3-windows:geometry',
      JSON.stringify({
        last_position: { left: 198, top: 194 },
        windows_record: {
          'component:add': {
            left: 198,
            top: 194,
            width: 560,
            height: 360,
          },
        },
      }),
    )

    let windows: WindowsRef | null = null
    mount(BindGroupedWindows, {
      props: {
        groupId: 'user',
        bind: (api: WindowsRef) => {
          windows = api
        },
      },
    })

    await flushWindows()
    windows?.create({
      id: AddWindow,
      title: 'Grouped Component',
    })
    await flushWindows()

    const record = windows?.get(AddWindow)
    expect(record?.rect).toEqual({
      left: 198,
      top: 194,
      width: 560,
      height: 360,
    })

    await waitForGeometryPersist()

    const store = readGeometryStore()
    expect(store.version).toBe(3)
    expect(store.windows_record.user['component:add']).toEqual(record?.rect)
    expect(store.windows_record['component:add']).toBeUndefined()
    expect(store.windows_record.global?.['component:add']).toBeUndefined()
  })

  it('reopens an existing minimized window through create with the same id', async () => {
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
      id: 'normal-reopen',
      title: 'Normal Reopen',
      component: ActionWindow,
    })
    await flushWindows()

    windows?.minimize('normal-reopen')
    await flushWindows()
    expect(windows?.get('normal-reopen')?.state).toBe('minimized')
    expect(findPanelByText('Normal Reopen')).toBeUndefined()

    windows?.create({
      id: 'normal-reopen',
      title: 'Normal Reopen Updated',
      component: ActionWindow,
    })
    await flushWindows()

    expect(windows?.windows.value).toHaveLength(1)
    expect(windows?.get('normal-reopen')?.state).toBe('normal')
    expect(findPanelByText('Normal Reopen Updated')).toBeDefined()
  })

  it('reopens an existing minimized maximized window back to maximized through create', async () => {
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
      id: 'max-reopen',
      title: 'Max Reopen',
      component: ActionWindow,
    })
    await flushWindows()

    windows?.setState('max-reopen', 'maximized')
    await flushWindows()
    windows?.minimize('max-reopen')
    await flushWindows()
    expect(windows?.get('max-reopen')?.state).toBe('minimized')
    expect(findPanelByText('Max Reopen')).toBeUndefined()

    windows?.create({
      id: 'max-reopen',
      title: 'Max Reopen Updated',
      component: ActionWindow,
    })
    await flushWindows()

    const panel = findPanelByText('Max Reopen Updated')
    expect(windows?.windows.value).toHaveLength(1)
    expect(windows?.get('max-reopen')?.state).toBe('maximized')
    expect(panel?.classList.contains('window-dialog--maximized')).toBe(true)
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
